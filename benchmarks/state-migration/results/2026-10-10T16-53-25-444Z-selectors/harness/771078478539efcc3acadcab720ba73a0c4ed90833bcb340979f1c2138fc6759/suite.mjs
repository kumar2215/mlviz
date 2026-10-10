import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';
import { prepare, here, repository } from './prepare.mjs';
import { scenarios, fixtures, suiteRoutes } from './suite-fixtures.mjs';
import { quantile, summarize, pairedDifferenceCI } from './stats.mjs';
import { writeCheckpoint } from './checkpoint.mjs';

const { values } = parseArgs({ options: {
  comparison: { type: 'string', default: 'handover' },
  baseline: { type: 'string', default: 'handover' }, candidate: { type: 'string', default: 'test-benchmark' },
  runs: { type: 'string', default: '20' }, warmups: { type: 'string', default: '3' }, steps: { type: 'string', default: '40' }, points: { type: 'string', default: '250' }, cpu: { type: 'string', default: '1' },
  scenarios: { type: 'string' }, smoke: { type: 'boolean', default: false },
  resume: { type: 'string' }, restart: { type: 'string' },
  'resume-reason': { type: 'string' },
} });
const resumeFile = values.resume ? path.resolve(here, values.resume) : null;
if (resumeFile) assert([path.join(here, 'results') + path.sep, path.join(here, '.cache', 'smoke') + path.sep].some(root => resumeFile.startsWith(root)), 'Resume must be a local benchmark checkpoint');
const previous = resumeFile ? JSON.parse(readFileSync(resumeFile, 'utf8')) : null;
if (previous) assert.equal(previous.status, 'failed', 'Only a failed checkpoint can be resumed');
const options = previous ? { ...previous.options, resume: values.resume, restart: values.restart, 'resume-reason': values['resume-reason'] } : { ...values };
assert(['handover', 'selectors'].includes(options.comparison || 'handover'), 'Unknown comparison');
const selectorComparison = options.comparison === 'selectors';
const available = selectorComparison ? scenarios.filter(s => s.page) : scenarios;
for (const key of ['runs', 'warmups', 'steps', 'points', 'cpu']) {
  options[key] = Number(options[key]);
  assert(Number.isInteger(options[key]) && options[key] >= (key === 'warmups' ? 0 : key === 'points' ? 2 : 1), 'Invalid --' + key);
}
assert(options.steps <= 80, 'Use at most 80 steps to stay inside threshold and bias ranges');
const selected = options.scenarios ? available.filter(s => options.scenarios.split(',').includes(s.id)) : available;
assert(selected.length && (!options.scenarios || selected.length === new Set(options.scenarios.split(',')).size), 'Unknown scenario');
const output = resumeFile ? path.dirname(resumeFile) : path.join(here, options.smoke ? '.cache/smoke' : 'results', new Date().toISOString().replaceAll(/[:.]/g, '-') + (selectorComparison ? '-selectors' : '-handover'));
mkdirSync(output, { recursive: true });
const data = fixtures(options.points);
const freshReport = {
  schemaVersion: 2, status: 'running', options, startedAt: new Date().toISOString(),
  environment: { node: process.version, platform: process.platform, release: os.release(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, memoryGB: os.totalmem() / 2 ** 30, viewport: { width: 1440, height: 1000 }, cpuThrottle: options.cpu, fonts: 'system fallback' },
  fixtureSha256: createHash('sha256').update(JSON.stringify(data)).digest('hex'),
  harnessSha256: createHash('sha256').update(['suite.mjs', 'suite-fixtures.mjs', 'prepare.mjs', 'fixtures.mjs', 'stats.mjs', 'package-lock.json', 'checkpoint.mjs'].map(name => readFileSync(path.join(here, name))).join('\n')).digest('hex'),
  coverage: selected.map(s => ({ ...s, candidateStatus: s.page ? 'comparable' : 'removed; baseline only' })), variants: [], trials: [],
};
const report = previous ? { ...previous, status: 'running', error: undefined, options, harnessSha256: freshReport.harnessSha256 } : freshReport;
const restartBlocks = options.restart ? options.restart.split(',') : [];
for (const block of restartBlocks) assert(selected.some(s => ['production', 'profile'].some(mode => block === s.id + ':' + mode)), 'Unknown restart block');
if (previous) {
  assert.equal(previous.schemaVersion, 2);
  assert.deepEqual(previous.environment.node, freshReport.environment.node, 'Node changed');
  assert.deepEqual(previous.environment.cpu, freshReport.environment.cpu, 'CPU changed');
  assert.equal(previous.fixtureSha256, freshReport.fixtureSha256, 'Fixtures changed; start a fresh run');
  const audit = path.join(output, 'audit'); mkdirSync(audit, { recursive: true });
  copyFileSync(resumeFile, path.join(audit, 'attempt-' + ((previous.resumptions?.length || 0) + 1) + '-raw.json'));
  report.trials = previous.trials.filter(t => !restartBlocks.includes(t.scenario + ':' + t.mode)).map(t => ({ ...t, harnessSha256: t.harnessSha256 || previous.harnessSha256 }));
  report.resumptions = [...(previous.resumptions || []), {
    at: new Date().toISOString(), fromHarnessSha256: previous.harnessSha256, toHarnessSha256: report.harnessSha256,
    restartBlocks, discardedTrials: previous.trials.length - report.trials.length,
    reason: options['resume-reason'] || 'K-means placement readiness must be awaited before measuring; the measured action and metrics are unchanged. Incomplete pairs are repeated together.',
  }];
  report.failures = undefined;
}
const archivedHarness = path.join(output, 'harness', report.harnessSha256);
mkdirSync(archivedHarness, { recursive: true });
for (const name of ['suite.mjs', 'suite-fixtures.mjs', 'prepare.mjs', 'fixtures.mjs', 'stats.mjs', 'package-lock.json', 'checkpoint.mjs']) copyFileSync(path.join(here, name), path.join(archivedHarness, name));
// Save the exact historical configuration used to define coverage, rather than
// reconstructing its page list from today's routing.
const historicalConfig = execFileSync('git', ['show', 'handover:frontend/public/config/config.json'], { cwd: repository, encoding: 'utf8' });
writeFileSync(path.join(output, 'handover-config.json'), historicalConfig);
report.coverage.forEach(s => {
  s.handoverPageIds = Object.entries(JSON.parse(historicalConfig).pages).filter(([, p]) => p.model_name === s.model && p.component_type === s.mode).map(([id]) => id);
  assert(s.handoverPageIds.length || s.dispatchOnly, 'Scenario is not in handover config: ' + s.id);
});
const registrySources = {};
const registered = [];
for (const [mode, file] of Object.entries({ train: 'TrainComponent', predict: 'PredictComponent', step: 'StepComponent', manual: 'ManualComponent' })) {
  const source = execFileSync('git', ['show', `handover:frontend/src/components/${file}.tsx`], { cwd: repository, encoding: 'utf8' });
  registrySources[file] = source;
  const map = source.match(/const componentMap[^=]*=\s*\{([\s\S]*?)\}\s*as const/)[1];
  for (const match of map.matchAll(/\b(\w+):/g)) registered.push(match[1] + '/' + mode);
}
assert.deepEqual(scenarios.map(s => s.model + '/' + s.mode).sort(), registered.sort(), 'Historical registry coverage is incomplete');
writeFileSync(path.join(output, 'handover-registry.json'), JSON.stringify(registrySources, null, 2));
const persist = () => writeCheckpoint(path.join(output, 'raw.json'), report);
persist();

function serve(root) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  const server = createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400); res.end(); return; }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, url: 'http://127.0.0.1:' + server.address().port })));
}
async function frames(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
const cdpMetrics = result => Object.fromEntries(result.metrics.map(({ name, value }) => [name, value]));
const svgMarkup = page => page.locator('svg').evaluateAll(elements => elements.map(el => el.innerHTML).join(''));

async function trial(browser, variant, scenario, mode, url, index, warmup) {
  const context = await browser.newContext({ viewport: report.environment.viewport, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'UTC', reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await context.newPage();
  // Both revisions randomize initial lines; hold that source constant too.
  await context.addInitScript(({ savedSVM }) => {
    Math.random = () => 0.5;
    if (savedSVM) {
      localStorage.setItem('svm_model_data', JSON.stringify(savedSVM));
      localStorage.setItem('svm_params', JSON.stringify({ feature_1: 0, feature_2: 1, kernel: 'linear' }));
    }
  }, { savedSVM: scenario.id === 'svm-predict' ? data.svm : null });
  const errors = [], requests = [];
  const routes = suiteRoutes(variant.kind, scenario, data);
  let pending = 0;
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await context.route('**/*', async route => {
    const request = route.request(), requestUrl = new URL(request.url());
    if (requestUrl.origin !== url) { await route.fulfill({ status: 200, contentType: 'text/css', body: '' }); return; }
    const pathname = requestUrl.pathname;
    if (Object.hasOwn(routes, pathname)) {
      pending++;
      const payload = request.postDataJSON() || {};
      requests.push({ path: pathname, payload });
      const handler = routes[pathname];
      await route.fulfill({ json: typeof handler === 'function' ? handler(payload) : handler });
      pending--;
    } else if (pathname.startsWith('/api/') || pathname.startsWith('/config/')) {
      errors.push('Unexpected request: ' + pathname);
      await route.fulfill({ status: 500, json: { error: 'Unmocked benchmark request' } });
    } else await route.continue();
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: options.cpu });
  await cdp.send('Performance.enable');
  let control, initial;
  const prefix = [mode, scenario.id, variant.label].join('-');
  try {
    await page.goto(url + (variant.kind === 'context' ? '/#/story/benchmark' : '/#/viz/' + (scenario.model === 'linear' ? 'linear_regression' : scenario.model)));
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await frames(page);
    assert.deepEqual(errors, [], 'Startup errors');
    if (scenario.action === 'intercept') {
      if (scenario.mode === 'train') {
        await page.getByRole('button', { name: 'Train Model', exact: true }).click();
        const success = page.getByText('Model trained successfully.', { exact: true });
        await success.waitFor({ state: 'visible' }); await success.waitFor({ state: 'hidden' });
      }
      control = page.getByLabel('Intercept (b)', { exact: true });
      await control.waitFor({ state: 'visible' });
      await control.focus(); await page.keyboard.press('Home'); await frames(page);
      for (let i = 0; i < 5; i++) { await page.keyboard.press('PageUp'); await frames(page); }
      assert(Math.abs(Number(await control.inputValue())) < 1e-8, 'Cannot center intercept');
      for (let i = 0; i < 8; i++) { await page.keyboard.press('ArrowRight'); await frames(page); }
      initial = await control.evaluate(el => ({ value: +el.value, step: +el.step, min: +el.min, max: +el.max }));
      assert.equal(initial.min, -20); assert.equal(initial.max, 20); assert(Math.abs(initial.step - 0.04) < 1e-9);
      assert.equal(await page.locator('.data-points circle').count(), options.points, 'Incorrect plotted linear data');
      if (scenario.mode === 'train') assert.equal(await page.locator('line.error').count(), options.points, 'Incorrect residual count');
      const slope = await page.locator('span').filter({ hasText: /^Slope \(m\)$/ }).locator('..').innerText();
      assert.match(slope, scenario.mode === 'train' ? /0\.8000/ : /0\.0000/, 'Starting slope differs');
    } else if (scenario.action === 'bias') {
      control = page.getByLabel('Intercept (b)', { exact: true });
      await control.waitFor(); await control.focus();
      await page.keyboard.press('Home'); await frames(page);
      for (let i = 0; i < 5; i++) { await page.keyboard.press('PageUp'); await frames(page); }
      initial = await control.evaluate(el => ({ value: +el.value, step: +el.step, min: +el.min, max: +el.max }));
      assert(Math.abs(initial.value) < 1e-8, 'Cannot center SVM bias');
      initial.marginWidth = Number(await page.getByLabel('Margin Width', { exact: true }).inputValue());
      initial.slopeText = await page.locator('span').filter({ hasText: /^Slope$/ }).locator('..').innerText();
    } else if (scenario.action === 'threshold') {
      await page.locator('g.node').first().click();
      await page.getByRole('combobox').last().click();
      await page.getByRole('option', { name: 'x', exact: true }).click();
      control = page.getByRole('slider'); await control.waitFor(); await control.focus();
      await page.keyboard.press('Home'); await frames(page);
      for (let i = 0; i < 5; i++) { await page.keyboard.press('ArrowRight'); await frames(page); }
      initial = await control.evaluate(el => ({ value: +el.getAttribute('aria-valuenow'), min: +el.getAttribute('aria-valuemin'), max: +el.getAttribute('aria-valuemax'), step: 0.1 }));
      assert.equal(initial.value, -4.5);
    } else if (scenario.action === 'centroid') {
      control = page.locator('.data-points circle').nth(Math.floor(options.points * 0.4)); await control.waitFor();
      if (scenario.mode === 'step') {
        const start = page.getByRole('button', { name: 'Start Placing', exact: true });
        await start.waitFor({ state: 'visible' }); await start.click();
      }
      await page.getByText('Centroids Placed', { exact: true }).waitFor({ state: 'visible' });
      const clear = page.getByRole('button', { name: 'Clear All', exact: true });
      if (await clear.count() && await clear.isEnabled()) await clear.click();
      assert.equal(await page.locator('.selected-centroids text').count(), 0, 'Initial centroid selection differs');
      initial = { selected: 0 };
    } else if (scenario.action === 'predict') {
      control = page.getByRole('button', { name: 'Predict', exact: true }); await control.waitFor();
      await page.locator('#input-x').fill('-1'); if (!scenario.localPrediction) await page.locator('#input-y').fill('0');
      await control.click(); await page.waitForLoadState('networkidle'); await frames(page);
      initial = { queryX: -1 };
    } else {
      control = page.getByRole('button', { name: 'Train Model', exact: true }); await control.waitFor();
      await control.click(); await page.waitForLoadState('networkidle'); await frames(page);
      initial = { trained: true };
    }
    await page.waitForLoadState('networkidle'); await frames(page);
    if (scenario.id === 'decision-tree-predict') {
      await page.locator('input[type=range]').focus(); await page.keyboard.press('End'); await frames(page);
    }
    assert.equal(pending, 0);
    assert.deepEqual(errors, [], 'Initialization errors');
    if (scenario.model !== 'decision_tree' && scenario.model !== 'linear') assert.equal(await page.locator('.data-points circle').count(), options.points, 'Incorrect scatter point count');
    const beforeSvg = await svgMarkup(page);
    assert(beforeSvg.length > 1000, 'Visualization did not render');
    const asyncAction = ['train', 'predict'].includes(scenario.action);
    const endpoint = '/api/' + (scenario.model === 'decision_tree' ? 'dt' : scenario.model) + '/' + scenario.action;
    async function action(i) {
      if (asyncAction) {
        if (scenario.action === 'predict') await page.locator('#input-x').fill(String(0.5 + i * 0.02));
        const response = scenario.localPrediction ? null : page.waitForResponse(r => new URL(r.url()).pathname === endpoint);
        await control.click({ force: true }); if (response) await (await response).finished();
        await frames(page);
        await control.waitFor({ state: 'visible' });
        assert(await control.isEnabled(), 'Action did not finish');
      } else if (scenario.action === 'centroid') {
        const point = scenario.mode === 'train' ? page.locator('.data-points circle').nth(Math.floor(options.points * 0.4) + i) : control;
        await point.click({ force: true }); await frames(page);
        assert.equal(await page.locator('.selected-centroids text').count(), scenario.mode === 'train' ? i + 1 : (i + 1) % 2, 'Incorrect centroid selection sequence');
      } else { await page.keyboard.press('ArrowRight'); await frames(page); }
    }
    if (!warmup && index === 0) await page.screenshot({ path: path.join(output, prefix + '-before.png') });
    await page.evaluate(({ action }) => {
      const bench = globalThis.__REACT_BENCH__;
      if (bench) { bench.samples = []; bench.renderCounts = {}; bench.active = true; }
      globalThis.__INPUT_BENCH__ = { delays: [], values: [], events: 0, pending: 0 };
      const eventType = action === 'threshold' ? 'keydown' : action === 'centroid' || action === 'train' || action === 'predict' ? 'click' : 'input';
      document.addEventListener(eventType, event => {
        if (action === 'threshold' && event.key !== 'ArrowRight') return;
        if (eventType === 'input' && event.target.type !== 'range') return;
        const b = globalThis.__INPUT_BENCH__, start = performance.now();
        if (eventType === 'input') b.values.push(+event.target.value);
        if (action === 'threshold') b.values.push(+event.target.getAttribute('aria-valuenow'));
        if (action === 'predict') b.values.push(+document.querySelector('#input-x').value);
        b.events++; b.pending++;
        requestAnimationFrame(() => setTimeout(() => { b.delays.push(performance.now() - start); b.pending--; }, 0));
      }, true);
    }, { action: scenario.action });
    const requestStart = requests.length;
    const before = cdpMetrics(await cdp.send('Performance.getMetrics'));
    for (let i = 0; i < options.steps; i++) await action(i);
    await page.waitForFunction(() => globalThis.__INPUT_BENCH__.pending === 0);
    const after = cdpMetrics(await cdp.send('Performance.getMetrics'));
    const raw = await page.evaluate(() => {
      const b = globalThis.__REACT_BENCH__; if (b) b.active = false;
      return { inputs: globalThis.__INPUT_BENCH__, react: b ? { samples: b.samples, renderCounts: b.renderCounts, seen: b.seen } : null };
    });
    assert.equal(raw.inputs.events, options.steps, 'Incorrect actual input count');
    if (['intercept', 'bias', 'threshold'].includes(scenario.action)) raw.inputs.values.forEach((value, i) => assert(Math.abs(value - initial.value - (i + (scenario.action === 'threshold' ? 0 : 1)) * initial.step) < 1e-7, 'Control input sequence differs'));
    if (scenario.action === 'predict') raw.inputs.values.forEach((value, i) => assert.equal(value, 0.5 + i * 0.02, 'Prediction input sequence differs'));
    let final;
    if (['intercept', 'bias', 'threshold'].includes(scenario.action)) {
      final = scenario.action === 'threshold' ? Number(await control.getAttribute('aria-valuenow')) : Number(await control.inputValue());
      assert(Math.abs(final - initial.value - options.steps * initial.step) < 1e-7, 'Incorrect final control value');
      assert.notEqual(await svgMarkup(page), beforeSvg, 'Visualization did not update');
    } else if (scenario.action === 'centroid') {
      final = await page.locator('.selected-centroids text').count();
      assert.equal(final, scenario.mode === 'train' ? options.steps : options.steps % 2, 'Centroid selection did not update');
    } else {
      const measured = requests.slice(requestStart);
      assert.equal(measured.filter(r => r.path === endpoint).length, scenario.localPrediction ? 0 : options.steps, 'Incorrect measured API count');
      assert.equal(measured.length, scenario.localPrediction ? 0 : options.steps, 'Unexpected measured request');
      if (scenario.action === 'predict') {
        assert.equal(Number(await page.locator('#input-x').inputValue()), 0.5 + (options.steps - 1) * 0.02);
        if (scenario.model !== 'svm') measured.forEach((r, i) => assert.equal(['knn', 'kmeans'].includes(scenario.model) ? r.payload.query_points[0][0] : r.payload.points.x, 0.5 + i * 0.02, 'Query sequence mismatch'));
        if (scenario.id === 'decision-tree-predict') {
          // The historical page resets playback to the root after each query.
          // Advance outside measurement to verify the new branch highlight.
          await page.locator('input[type=range]').focus(); await page.keyboard.press('End'); await frames(page);
        }
        assert.notEqual(await svgMarkup(page), beforeSvg, 'Prediction visualization did not update');
      }
      final = { completedActions: options.steps };
    }
    if (!asyncAction) assert.equal(requests.length, requestStart, 'Unexpected measured network activity');
    assert.deepEqual(errors, [], 'Browser errors'); assert.equal(pending, 0);
    if (mode === 'profile') {
      assert(raw.react?.samples.length > 0, 'No React profile commits');
      assert(raw.react.seen.visualisation, 'Visualization instrumentation missing');
      assert(raw.react.renderCounts.visualisation > 0, 'Workload did not render its visualization');
      if (['intercept', 'bias', 'threshold', 'centroid'].includes(scenario.action)) assert(raw.react.seen.hud, 'HUD instrumentation missing');
      if ((scenario.mode === 'train' && scenario.model !== 'kmeans') || scenario.mode === 'manual') assert(raw.react.seen.results, 'Results instrumentation missing');
    } else assert.equal(raw.react, null, 'Production build contains profiling probes');
    if (!warmup && index === 0) await page.screenshot({ path: path.join(output, prefix + '-after.png') });
    const metrics = {
      taskMs: (after.TaskDuration - before.TaskDuration) * 1000, scriptMs: (after.ScriptDuration - before.ScriptDuration) * 1000,
      layoutMs: (after.LayoutDuration - before.LayoutDuration) * 1000, styleMs: (after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000,
      ...(!asyncAction ? { renderOpportunityP50Ms: quantile(raw.inputs.delays, 0.5), renderOpportunityP95Ms: quantile(raw.inputs.delays, 0.95) } : {}),
      ...(raw.react ? { reactTotalMs: raw.react.samples.reduce((s, x) => s + x.actualDuration, 0), reactCommits: raw.react.samples.length, resultsRenders: raw.react.renderCounts.results || 0, visualisationRenders: raw.react.renderCounts.visualisation || 0, hudRenders: raw.react.renderCounts.hud || 0 } : {}),
    };
    Object.values(metrics).forEach(n => assert(Number.isFinite(n) && n >= 0, 'Invalid metric'));
    return { scenario: scenario.id, variant: variant.label, mode, index, warmup, initial, final, metrics, raw, measuredRequests: requests.slice(requestStart), harnessSha256: report.harnessSha256 };
  } catch (error) {
    await page.screenshot({ path: path.join(output, 'failure-' + prefix + '.png') }).catch(() => {});
    writeFileSync(path.join(output, 'failure-' + prefix + '.txt'), String(error.stack) + '\n' + JSON.stringify({ errors, requests }) + '\n' + await page.locator('body').innerText().catch(() => ''));
    throw error;
  } finally { await context.close(); }
}

function finish() {
  const text = [selectorComparison ? '# Zustand selector comparison' : '# Handover visualization comparison', '', `Baseline: ${report.variants[0].ref} @ ${report.variants[0].sha}`, `Candidate: ${report.variants[1].ref} @ ${report.variants[1].sha}`, '', `${options.runs} measured pairs, ${options.warmups} warm-up pairs per scenario/build; ${options.steps} real UI actions per trial; ${options.points} fixture points; CPU ${options.cpu}x. Chrome ${report.environment.browser}.`, '', 'Positive reduction means less work. Values are median [Q25, Q75]. Confidence intervals bootstrap whole paired trials (candidate minus baseline). An interval spanning zero does not establish a direction. Fewer than 20 pairs is only a smoke test.', '', (selectorComparison ? `All ${selected.length} selected shared visualization scenarios are paired. The complete selector suite covers all nine pages registered identically in both revisions: decision-tree manual, KNN train/predict, K-means step, linear train/step, and SVM train/predict/step. The five historical modes removed before either revision cannot be compared here. Exact registries for both revisions and the source diff are saved beside this report.` : 'All 14 registered handover visualizations are covered: 12 model/mode combinations in the default config (15 pages), plus 2 registered prediction modes not linked there. Duplicate pages are measured once. Five modes have no current counterpart and receive baseline-only measurements; there is no invented percentage for them. Deprecated decision-tree components and the unregistered KNN learning component cannot be reached through the historical app registry and are excluded. Viz-only dispatch reuses training components. Exact historical config and registry sources are saved beside this report.'), '', 'Production task/script/layout/style durations come from CDP and include automation/measurement overhead. React times and component function invocation counts come from separate profiling builds; commits use one root Profiler. D3 work is outside React actualDuration. HUD counts aggregate the mounted model HUDs.', '', 'Rendering-opportunity delay is input capture → rAF → setTimeout, not paint latency, INP, FPS, or perceived response time. It is reported only for synchronous controls; asynchronous training/prediction actions have no latency estimate. Fixed API fixtures measure frontend update costs, not backend training or real network latency. The fixtures hold workload size constant and are not estimates of typical user behavior.', '', (selectorComparison ? 'This controlled comparison isolates the audited subscription optimization package: field selectors, shallow derived-array selectors, and reactive mode subscriptions. Store implementations, D3 renderers, dependencies, public configuration and backend are identical. Both versions already use Zustand, so this does not measure Context versus Zustand. Work totals and rendering-opportunity estimates do not establish perceived speed. Intervals are per metric, without multiple-comparison correction; isolated significant changes are exploratory.' : 'This compares whole revisions, including layout, renderer, routing, dependency and other refactor differences. It cannot isolate Zustand as the cause. Intervals are per metric, without multiple-comparison correction; isolated significant changes are exploratory.'), ''];
  const comparisons = [];
  for (const s of selected) {
    text.push(`## ${s.id}`, '', `Workload: ${s.action}. ${s.page ? 'Paired comparison.' : 'Removed from candidate registry; baseline only.'}`, '', '| Build | Metric | baseline | candidate | Reduction | 95% CI Δ |', '|---|---|---:|---:|---:|---:|');
    for (const mode of ['production', 'profile']) {
      const a = report.trials.filter(t => t.scenario === s.id && t.mode === mode && !t.warmup && t.variant === 'baseline').sort((a, b) => a.index - b.index);
      const b = report.trials.filter(t => t.scenario === s.id && t.mode === mode && !t.warmup && t.variant === 'candidate').sort((a, b) => a.index - b.index);
      assert.equal(a.length, options.runs); if (s.page) assert.equal(b.length, options.runs);
      if (s.page) a.forEach((t, i) => assert.deepEqual(t.initial, b[i].initial, 'Paired initial state differs: ' + s.id));
      if (s.page) a.forEach((t, i) => assert.equal(t.harnessSha256, b[i].harnessSha256, 'Paired harness versions differ'));
      const keys = mode === 'production' ? Object.keys(a[0].metrics).filter(k => !k.startsWith('react') && !k.endsWith('Renders')) : ['reactTotalMs', 'reactCommits', 'resultsRenders', 'visualisationRenders', 'hudRenders'];
      for (const metric of keys) {
        const aa = a.map(t => t.metrics[metric]), bb = b.map(t => t.metrics[metric]);
        const baseline = summarize(aa), candidate = b.length ? summarize(bb) : null;
        const ci = b.length ? pairedDifferenceCI(aa, bb) : null;
        const reduction = candidate && baseline.median !== 0 ? 100 * (baseline.median - candidate.median) / baseline.median : null;
        comparisons.push({ scenario: s.id, mode, metric, baseline, candidate, reductionPercent: reduction, candidateMinusBaseline95CI: ci });
        const fmt = n => n.toFixed(2), cell = v => v ? `${fmt(v.median)} [${fmt(v.q25)}, ${fmt(v.q75)}]` : 'not available';
        text.push(`| ${mode} | ${metric} | ${cell(baseline)} | ${cell(candidate)} | ${reduction === null ? 'n/a' : fmt(reduction) + '%'} | ${ci ? '[' + ci.map(fmt).join(', ') + ']' : 'n/a'} |`);
      }
    }
    text.push('');
  }
  report.comparisons = comparisons;
  if (report.resumptions?.length) {
    text.push('## Run audit', '', 'Completed trials retain their original harness hash. The timed action and metric collection code did not change across these resumptions. Every compared pair uses the same harness version. Exact harness sources and failed checkpoints are preserved beside the report.', '');
    for (const r of report.resumptions) text.push(`- ${r.at}: ${r.reason} Discarded ${r.discardedTrials} trials; restarted blocks: ${r.restartBlocks.join(', ') || 'none'}.`);
    text.push('');
  }
  writeFileSync(path.join(output, 'summary.md'), text.join('\n'));
}

let browser;
const servers = [];
try {
  report.variants = [prepare(previous?.variants[0].sha || options.baseline, 'baseline'), prepare(previous?.variants[1].sha || options.candidate, 'candidate')];
  if (previous) report.variants.forEach((v, i) => { assert.equal(v.sha, previous.variants[i].sha); assert.equal(v.lockSha256, previous.variants[i].lockSha256); v.ref = previous.variants[i].ref; });
  persist();
  assert.equal(report.variants[0].kind, selectorComparison ? 'zustand' : 'context', 'Unexpected baseline state management');
  assert.equal(report.variants[1].kind, 'zustand', 'The historical suite expects a Zustand candidate');
  if (selectorComparison) {
    // Restrict this causal claim to the commit pair whose full diff was audited.
    assert.equal(report.variants[0].sha, 'bddf2967c3bf74ded9a88a2abc2924e914b97583');
    assert.equal(report.variants[1].sha, 'ac889ef39017e225dcc7884520df8b75919c83c0');
    assert.equal(report.variants[0].lockSha256, report.variants[1].lockSha256);
    const gitDiff = args => execFileSync('git', ['diff', ...args, report.variants[0].sha, report.variants[1].sha], { cwd: repository, encoding: 'utf8' });
    const patch = gitDiff(['--no-ext-diff', '--binary']);
    const changedFiles = gitDiff(['--name-only']).trim().split('\n');
    assert.equal(changedFiles.length, 33);
    assert(changedFiles.every(file => file.startsWith('frontend/src/') && !file.startsWith('frontend/src/store/') && !file.includes('Renderer') && !file.includes('rendererUtils') && !file.startsWith('frontend/src/components/visualisation/')));
    writeFileSync(path.join(output, 'revision-diff.patch'), patch);
    report.scope = { kind: 'selector-subscription-optimization', changedFiles, diffSha256: createHash('sha256').update(patch).digest('hex'), unchanged: ['store implementations', 'D3 renderers', 'dependencies', 'public configuration', 'backend'], includes: ['field selectors', 'shallow derived-array selectors', 'reactive mode subscriptions'] };
  }
  const candidateSources = {};
  const candidatePages = [];
  for (const model of ['decision_tree', 'knn', 'kmeans', 'linear_regression', 'svm']) {
    const source = execFileSync('git', ['show', `${report.variants[1].sha}:frontend/src/pages/traditional_ml/${model}/index.tsx`], { cwd: repository, encoding: 'utf8' });
    candidateSources[model] = source;
    for (const match of source.matchAll(/case\s+"([^"]+)"/g)) candidatePages.push(match[1]);
  }
  assert.deepEqual(scenarios.filter(s => s.page).map(s => s.page).sort(), candidatePages.sort(), 'Candidate registry changed; update coverage mappings first');
  writeFileSync(path.join(output, 'candidate-registry.json'), JSON.stringify(candidateSources, null, 2));
  if (selectorComparison) {
    const baselineSources = Object.fromEntries(Object.keys(candidateSources).map(model => [model, execFileSync('git', ['show', `${report.variants[0].sha}:frontend/src/pages/traditional_ml/${model}/index.tsx`], { cwd: repository, encoding: 'utf8' })]));
    assert.deepEqual(baselineSources, candidateSources, 'Both revisions must expose identical visualization pages');
    writeFileSync(path.join(output, 'baseline-registry.json'), JSON.stringify(baselineSources, null, 2));
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  if (previous) assert.equal(previous.environment.browser, browser.version(), 'Chrome changed; start a fresh run');
  report.environment.browser = browser.version();
  report.environment.playwright = JSON.parse(readFileSync(path.join(here, 'node_modules/playwright/package.json'))).version;
  for (const mode of ['production', 'profile']) {
    const urls = {};
    for (const v of report.variants) { const served = await serve(v.outputs[mode]); servers.push(served.server); urls[v.label] = served.url; }
    for (const s of selected) {
      const variants = s.page ? report.variants : [report.variants[0]];
      for (let i = -options.warmups; i < options.runs; i++) {
        const ordered = Math.abs(i) % 2 === 0 ? variants : [...variants].reverse();
        const matches = t => t.scenario === s.id && t.mode === mode && t.index === i;
        if (ordered.every(v => report.trials.some(t => matches(t) && t.variant === v.label))) continue;
        // Never carry one half of a pair across a restart.
        const partial = report.trials.filter(matches);
        if (previous && partial.length) {
          report.resumptions.at(-1).discardedTrials += partial.length;
          report.resumptions.at(-1).incompletePairs ??= [];
          report.resumptions.at(-1).incompletePairs.push({ scenario: s.id, mode, index: i });
        }
        report.trials = report.trials.filter(t => !matches(t));
        for (const v of ordered) {
          console.log(`${mode} ${s.id} ${v.label} ${i < 0 ? 'warm-up ' + (-i) : 'run ' + (i + 1) + '/' + options.runs}`);
          try { report.trials.push(await trial(browser, v, s, mode, urls[v.label], i, i < 0)); }
          catch (error) {
            if (!options.smoke) throw error;
            report.failures ??= [];
            report.failures.push({ scenario: s.id, variant: v.label, mode, error: String(error.stack) });
            console.error(s.id + ' ' + v.label + ': ' + error.message);
          }
          persist();
        }
      }
    }
  }
  if (report.failures?.length) throw new Error(report.failures.length + ' smoke validation failures; see raw.json and failure artifacts');
  finish(); report.status = 'complete'; report.completedAt = new Date().toISOString(); persist();
} catch (error) { report.status = 'failed'; report.error = String(error.stack); persist(); console.error(error); process.exitCode = 1; }
finally { await browser?.close(); await Promise.all(servers.map(s => new Promise(resolve => s.close(resolve)))); console.log('Results: ' + output); }
