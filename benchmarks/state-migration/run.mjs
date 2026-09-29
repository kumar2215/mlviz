import { chromium } from "playwright";
import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { parseArgs } from "node:util";
import { prepare, here } from "./prepare.mjs";
import { regressionFixture, routesFor } from "./fixtures.mjs";
import { quantile, summarize, pairedDifferenceCI } from "./stats.mjs";

const { values } = parseArgs({ options: {
  baseline: { type: "string", default: "main" },
  candidate: { type: "string", default: "test" },
  runs: { type: "string", default: "20" },
  warmups: { type: "string", default: "3" },
  steps: { type: "string", default: "40" },
  points: { type: "string", default: "250" },
  cpu: { type: "string", default: "1" },
  channel: { type: "string", default: "chrome" },
  headed: { type: "boolean", default: false },
} });
const options = { ...values };
for (const key of ["runs", "warmups", "steps", "points", "cpu"]) {
  options[key] = Number(values[key]);
  assert(Number.isInteger(options[key]) && options[key] >= (key === "warmups" ? 0 : key === "points" ? 2 : 1), "Invalid --" + key);
}
assert(options.steps <= 200, "Use at most 200 steps to keep the slider inside its range");
const output = path.join(here, "results", new Date().toISOString().replaceAll(/[:.]/g, "-"));
mkdirSync(output, { recursive: true });
const fixture = regressionFixture(options.points);
const report = {
  schemaVersion: 1, status: "running", scenario: "linear-regression-intercept-keyboard",
  options, startedAt: new Date().toISOString(),
  environment: { node: process.version, platform: process.platform, release: os.release(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, memoryGB: os.totalmem() / 2 ** 30, viewport: { width: 1440, height: 1000 } },
  fixtureSha256: createHash("sha256").update(JSON.stringify(fixture)).digest("hex"),
  harnessSha256: createHash("sha256").update(["run.mjs", "prepare.mjs", "fixtures.mjs", "stats.mjs", "package-lock.json"].map(name => readFileSync(path.join(here, name), "utf8")).join("\n")).digest("hex"),
  variants: [], trials: [],
};
const persist = () => writeFileSync(path.join(output, "raw.json"), JSON.stringify(report, null, 2));
persist();

function serve(root) {
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
  const server = createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      res.writeHead(400); res.end("Malformed URL"); return;
    }
    const file = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!file.startsWith(root + path.sep) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404); res.end("Not found"); return;
    }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve({ server, url: "http://127.0.0.1:" + server.address().port })));
}

async function frameBoundary(page) {
  // Separate discrete inputs into separate browser frames; never batch all updates.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
function metricsMap(result) {
  return Object.fromEntries(result.metrics.map(({ name, value }) => [name, value]));
}

async function trial(browser, variant, mode, url, index, warmup) {
  const context = await browser.newContext({ viewport: report.environment.viewport, deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC", reducedMotion: "reduce", serviceWorkers: "block" });
  const page = await context.newPage();
  const errors = [], requests = [];
  const routes = routesFor(variant.kind, fixture);
  page.on("pageerror", err => errors.push(err.message));
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  await context.route("**/*", async route => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    if (requestUrl.origin !== url) {
      // Fixed system-font fallback, with no external network or font timing noise.
      await route.fulfill({ status: 200, contentType: "text/css", body: "" });
      return;
    }
    const pathname = requestUrl.pathname;
    if (Object.hasOwn(routes, pathname)) {
      requests.push(pathname);
      await route.fulfill({ json: routes[pathname] });
    } else if (pathname.startsWith("/api/") || pathname.startsWith("/config/")) {
      errors.push("Unexpected request: " + pathname);
      await route.fulfill({ status: 500, json: { error: "Unmocked benchmark request" } });
    } else {
      await route.continue();
    }
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: options.cpu });
  await cdp.send("Performance.enable");
  try {
    await page.goto(url + (variant.kind === "context" ? "/#/story/benchmark" : "/#/viz/linear_regression"));
    const slider = page.getByLabel("Intercept (b)", { exact: true });
    await slider.waitFor({ state: "visible", timeout: 30000 });
    await page.getByText("Train Set", { exact: true }).waitFor();
    await page.waitForLoadState("networkidle");
    // Main's provider can auto-load visualization data after its initial training
    // request. Explicitly train after startup so both versions use the trained line.
    await page.getByRole("button", { name: "Train Model", exact: true }).click();
    const success = page.getByText("Model trained successfully.", { exact: true });
    await success.waitFor({ state: "visible" });
    await success.waitFor({ state: "hidden" });
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);
    await frameBoundary(page);
    assert.deepEqual(errors, [], "Errors during initialization");
    assert(requests.includes("/api/linear/train"), "Training fixture was not used");
    // Home normalizes the slider independently of random initialization.
    await slider.focus();
    await page.keyboard.press("Home");
    await frameBoundary(page);
    // Native PageUp advances a range by 10% in the tested Chromium browser.
    // Five increments center the line in the plot; assert this precondition below.
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("PageUp");
      await frameBoundary(page);
    }
    assert(Math.abs(Number(await slider.inputValue())) < 1e-8, "Cannot center the range with PageUp");
    // Local warm-up in every fresh context; these renders are excluded.
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("ArrowRight");
      await frameBoundary(page);
    }
    const initial = await slider.evaluate(el => ({ value: +el.value, min: +el.min, max: +el.max, step: +el.step }));
    assert.equal(initial.min, -20);
    assert.equal(initial.max, 20);
    assert(Math.abs(initial.step - 0.04) < 1e-9);
    assert(Math.abs(initial.value - 8 * 0.04) < 1e-8);
    assert.equal(await page.locator("line.error").count(), options.points, "Unexpected plotted point count");
    assert.match(await page.locator("span").filter({ hasText: /^Slope \(m\)$/ }).locator("..").innerText(), /0\.8000/, "Starting slope differs");
    const beforeSvg = await page.locator("svg").evaluateAll(elements => elements.map(el => el.innerHTML).join(""));
    assert(beforeSvg.length > 1000, "Plot did not render");
    if (!warmup && index === 0) await page.screenshot({ path: path.join(output, mode + "-" + variant.label + "-before.png") });
    await page.evaluate(() => {
      const bench = globalThis.__REACT_BENCH__;
      if (bench) { bench.samples = []; bench.renderCounts = {}; bench.active = true; }
      globalThis.__INPUT_BENCH__ = { delays: [], values: [], pending: 0 };
      document.addEventListener("input", event => {
        if (!(event.target instanceof HTMLInputElement) || event.target.type !== "range") return;
        const b = globalThis.__INPUT_BENCH__;
        const start = performance.now();
        b.values.push(+event.target.value);
        b.pending++;
        // Approximation of a rendering opportunity, NOT measured paint latency or INP.
        requestAnimationFrame(() => setTimeout(() => {
          b.delays.push(performance.now() - start);
          b.pending--;
        }, 0));
      }, true);
    });
    const requestCount = requests.length;
    const before = metricsMap(await cdp.send("Performance.getMetrics"));
    for (let i = 0; i < options.steps; i++) {
      await page.keyboard.press("ArrowRight");
      await frameBoundary(page);
    }
    await page.waitForFunction(() => globalThis.__INPUT_BENCH__.pending === 0);
    const after = metricsMap(await cdp.send("Performance.getMetrics"));
    const raw = await page.evaluate(() => {
      const bench = globalThis.__REACT_BENCH__;
      if (bench) bench.active = false;
      return { inputs: globalThis.__INPUT_BENCH__, react: bench ? { samples: bench.samples, renderCounts: bench.renderCounts, seen: bench.seen } : null };
    });
    assert.equal(raw.inputs.values.length, options.steps, "Wrong number of actual input events");
    raw.inputs.values.forEach((value, i) => assert(Math.abs(value - (initial.value + (i + 1) * initial.step)) < 1e-8, "Slider input sequence differs"));
    const final = Number(await slider.inputValue());
    assert(Math.abs(final - (initial.value + options.steps * initial.step)) < 1e-8, "Slider did not reach expected value");
    assert.equal(await page.locator("line.error").count(), options.points, "Plotted points changed");
    assert.equal(requests.length, requestCount, "Network activity during measured workload");
    assert.notEqual(await page.locator("svg").evaluateAll(elements => elements.map(el => el.innerHTML).join("")), beforeSvg, "SVG did not update");
    assert.deepEqual(errors, [], "Browser errors during measured workload");
    if (mode === "profile") {
      assert(raw.react?.samples.length > 0, "React profiling build is not recording");
      for (const name of ["RegressionResults", "LinearRegressionVisualisation", "LineControlHUD"]) assert(raw.react.seen[name], "Missing instrumentation: " + name);
    } else assert.equal(raw.react, null, "Production timing build must not contain React instrumentation");
    if (!warmup && index === 0) await page.screenshot({ path: path.join(output, mode + "-" + variant.label + "-after.png") });
    const result = { variant: variant.label, mode, index, warmup, initial, final, raw, initializationRequests: requests };
    result.metrics = {
      taskMs: (after.TaskDuration - before.TaskDuration) * 1000,
      scriptMs: (after.ScriptDuration - before.ScriptDuration) * 1000,
      layoutMs: (after.LayoutDuration - before.LayoutDuration) * 1000,
      styleMs: (after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000,
      layoutCount: after.LayoutCount - before.LayoutCount,
      renderOpportunityP50Ms: quantile(raw.inputs.delays, 0.5),
      renderOpportunityP95Ms: quantile(raw.inputs.delays, 0.95),
      ...(raw.react ? {
        reactTotalMs: raw.react.samples.reduce((sum, sample) => sum + sample.actualDuration, 0),
        reactCommits: raw.react.samples.length,
        resultsRenders: raw.react.renderCounts.RegressionResults || 0,
        visualisationRenders: raw.react.renderCounts.LinearRegressionVisualisation || 0,
        hudRenders: raw.react.renderCounts.LineControlHUD || 0,
      } : {}),
    };
    for (const value of Object.values(result.metrics)) assert(Number.isFinite(value) && value >= 0, "Invalid metric");
    return result;
  } catch (error) {
    await page.screenshot({ path: path.join(output, "failure.png") }).catch(() => {});
    writeFileSync(path.join(output, "failure.txt"), String(error.stack) + "\n" + JSON.stringify({ errors, requests }) + "\n" + await page.locator("body").innerText().catch(() => ""));
    throw error;
  } finally {
    await context.close();
  }
}

function finishReport() {
  const rows = [], comparisons = [];
  for (const mode of ["production", "profile"]) {
    const a = report.trials.filter(t => !t.warmup && t.mode === mode && t.variant === "baseline");
    const b = report.trials.filter(t => !t.warmup && t.mode === mode && t.variant === "candidate");
    const keys = mode === "production"
      ? ["taskMs", "scriptMs", "layoutMs", "styleMs", "renderOpportunityP50Ms", "renderOpportunityP95Ms"]
      : ["reactTotalMs", "reactCommits", "resultsRenders", "visualisationRenders", "hudRenders"];
    for (const metric of keys) {
      const aa = a.map(t => t.metrics[metric]), bb = b.map(t => t.metrics[metric]);
      const baseline = summarize(aa), candidate = summarize(bb);
      const ci = pairedDifferenceCI(aa, bb);
      const reduction = baseline.median === 0 ? null : 100 * (baseline.median - candidate.median) / baseline.median;
      comparisons.push({ mode, metric, baseline, candidate, reductionPercent: reduction, candidateMinusBaseline95CI: ci });
      const fmt = n => n.toFixed(2);
      const cell = s => fmt(s.median) + " [" + fmt(s.q25) + ", " + fmt(s.q75) + "]";
      rows.push("| " + mode + " | " + metric + " | " + cell(baseline) + " | " + cell(candidate) + " | " + (reduction === null ? "n/a" : fmt(reduction) + "%") + " | [" + ci.map(fmt).join(", ") + "] |");
    }
  }
  report.comparisons = comparisons;
  const text = [
    "# State migration benchmark",
    "",
    "Baseline: " + report.variants[0].ref + " @ " + report.variants[0].sha,
    "Candidate: " + report.variants[1].ref + " @ " + report.variants[1].sha,
    "",
    options.runs + " measured paired runs per build mode, " + options.warmups + " warm-up pairs, " + options.steps + " keyboard increments per run, " + options.points + " points, CPU throttling " + options.cpu + "x.",
    "Browser: " + report.environment.browser + ". Headless: " + !options.headed + ".",
    "",
    "| Build | Metric | Baseline median [Q25, Q75] | Candidate median [Q25, Q75] | Reduction | 95% CI of candidate − baseline |",
    "|---|---|---:|---:|---:|---:|",
    ...rows,
    "",
    "Positive reduction means less work/time. An interval crossing zero does not establish a direction. Intervals resample paired runs, not individual events. Fewer than 20 runs is a smoke test, not a performance conclusion.",
    "",
    "React metrics use a separate profiling build. Render counts are component function invocations, not DOM mutations; commits come from one root Profiler. Browser metrics use an uninstrumented production build, with lightweight input timing. Task/script metrics include automation and measurement overhead.",
    "",
    "Rendering-opportunity delay is input-event capture → requestAnimationFrame → setTimeout, an approximation, not exact presentation latency, INP, FPS, or dropped frames. Paced keyboard updates exercise the range's onChange path; they do not simulate pointer dragging or evaluate-on-release.",
    "",
    "This compares the two application revisions under a shared fixture. Routing, renderer, dependency, and other refactor changes are confounders; differences cannot be attributed to Zustand alone. Only this scenario is covered. Fonts use the same system fallback. API responses are fixed and do not measure backend training.",
    ""
  ].join("\n");
  writeFileSync(path.join(output, "summary.md"), text);
  console.log(text);
}

let browser;
const servers = [];
try {
  report.variants = [prepare(options.baseline, "baseline"), prepare(options.candidate, "candidate")];
  persist();
  browser = await chromium.launch({ channel: options.channel === "chromium" ? undefined : options.channel, headless: !options.headed });
  report.environment.browser = browser.version();
  report.environment.playwright = JSON.parse(readFileSync(path.join(here, "node_modules/playwright/package.json"))).version;
  for (const mode of ["production", "profile"]) {
    const urls = {};
    for (const variant of report.variants) {
      const served = await serve(variant.outputs[mode]);
      servers.push(served.server);
      urls[variant.label] = served.url;
    }
    for (let i = -options.warmups; i < options.runs; i++) {
      // Counterbalance time/temperature/order effects. Each pair uses fresh contexts.
      const ordered = Math.abs(i) % 2 === 0 ? report.variants : [...report.variants].reverse();
      for (const variant of ordered) {
        console.log(mode + " " + variant.label + " " + (i < 0 ? "warm-up " + (-i) : "run " + (i + 1) + "/" + options.runs));
        report.trials.push(await trial(browser, variant, mode, urls[variant.label], i, i < 0));
        persist();
      }
    }
  }
  report.status = "complete";
  report.completedAt = new Date().toISOString();
  finishReport();
  persist();
} catch (error) {
  report.status = "failed"; report.error = String(error.stack);
  persist(); console.error(error); process.exitCode = 1;
} finally {
  await browser?.close();
  await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
  console.log("Results: " + output);
}
