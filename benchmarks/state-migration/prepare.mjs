import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const here = path.dirname(fileURLToPath(import.meta.url));
export const repository = path.resolve(here, "../..");
export const cache = path.join(here, ".cache");

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: "inherit", windowsHide: true });
}
function npmCi(cwd) {
  const cli = process.env.npm_execpath || path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
  if (!existsSync(cli)) throw new Error("Run through npm run bench so npm_execpath is available.");
  run(process.execPath, [cli, "ci", "--no-audit", "--no-fund", "--cache", path.join(cache, "npm")], cwd);
}

const runtime = [
  "globalThis.__REACT_BENCH__ = {",
  "active: false, samples: [], renderCounts: {}, seen: {},",
  "onRender(id, phase, actualDuration, baseDuration, startTime, commitTime) {",
  "const b = globalThis.__REACT_BENCH__;",
  "if (b.active) b.samples.push({ id, phase, actualDuration, baseDuration, startTime, commitTime });",
  "},",
  "count(name) { this.seen[name] = true; if (this.active) this.renderCounts[name] = (this.renderCounts[name] || 0) + 1; }",
  "};"
].join("\n");

function instrumentation(kind) {
  const visual = kind === "context"
    ? "/src/components/linear/regression/training/Visualisation.tsx"
    : "/src/pages/traditional_ml/linear_regression/train/LinearRegressionTrainVisualisation.tsx";
  const hud = kind === "context"
    ? "/src/components/linear/regression/LineControlHUD.tsx"
    : "/src/pages/traditional_ml/linear_regression/LineControlHUD.tsx";
  const targets = { [visual]: "LinearRegressionVisualisation", [hud]: "LineControlHUD", "/src/components/results/RegressionResults.tsx": "RegressionResults" };
  return [
    "{ name: 'benchmark-instrumentation', enforce: 'pre',",
    "transform(code, id) {",
    "id = id.replaceAll('\\\\', '/').split('?')[0];",
    "if (id.endsWith('/src/main.tsx')) {",
    "if (!code.includes('<App />')) throw new Error('Benchmark cannot locate App root');",
    "return \"import '../benchmark-runtime.js';\\n\" + code.replace('<App />', '<React.Profiler id=\"App\" onRender={globalThis.__REACT_BENCH__.onRender}><App /></React.Profiler>');",
    "}",
    "const targets = " + JSON.stringify(targets) + ";",
    "const isModel = ['/src/components/decision_tree/', '/src/components/kmeans/', '/src/components/knn/', '/src/components/linear/', '/src/components/svm/', '/src/pages/traditional_ml/'].some(folder => id.includes(folder));",
    "if (isModel && (id.endsWith('Visualisation.tsx') || id.endsWith('Visualization.tsx')) && !id.includes('deprecated') && !id.endsWith('/BaseVisualisation.tsx')) targets[id] = 'visualisation';",
    "if (isModel && id.endsWith('HUD.tsx')) targets[id] = 'hud';",
    "if (id.endsWith('/src/components/results/ClassifierResults.tsx')) targets[id] = 'results';",
    "for (const [suffix, name] of Object.entries(targets)) {",
    "if (!id.endsWith(suffix)) continue;",
    "const source = ts.createSourceFile(id, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);",
    "let declaration = source.statements.find(n => ts.isFunctionDeclaration(n) && n.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword));",
    "if (!declaration) {",
    "const exported = source.statements.find(n => ts.isExportAssignment(n));",
    "const component = exported && ts.isIdentifier(exported.expression) ? exported.expression.text : null;",
    "for (const stmt of source.statements) if (ts.isVariableStatement(stmt)) for (const d of stmt.declarationList.declarations) if (d.name.getText(source) === component) declaration = d.initializer;",
    "}",
    "if (!declaration?.body || !ts.isBlock(declaration.body)) continue;",
    "const position = declaration.body.getStart(source) + 1;",
    "const canonical = name === 'RegressionResults' ? 'results' : name === 'LinearRegressionVisualisation' ? 'visualisation' : name === 'LineControlHUD' ? 'hud' : name;",
    "return code.slice(0, position) + '\\n globalThis.__REACT_BENCH__.count(' + JSON.stringify(name) + ');' + (canonical !== name ? 'globalThis.__REACT_BENCH__.count(' + JSON.stringify(canonical) + ');' : '') + code.slice(position);",
    "}",
    "}",
    "}"
  ].join("\n");
}

export function prepare(ref, label) {
  const sha = execFileSync("git", ["rev-parse", "--verify", ref + "^{commit}"], { cwd: repository, encoding: "utf8" }).trim();
  const snapshot = path.join(cache, sha);
  const frontend = path.join(snapshot, "frontend");
  mkdirSync(snapshot, { recursive: true });
  if (!existsSync(path.join(frontend, "package.json"))) {
    const archive = path.join(snapshot, "source.tar");
    run("git", ["archive", "--format=tar", "-o", archive, sha, "frontend"], repository);
    run("tar", ["-xf", archive, "-C", snapshot], repository);
  }
  const installed = path.join(snapshot, "installed.txt");
  if (!existsSync(installed)) {
    npmCi(frontend);
    writeFileSync(installed, process.version);
  }
  const kind = existsSync(path.join(frontend, "src/store/traditional_ml/useLinearRegression.ts")) ? "zustand" : "context";
  // Earlier output names aren't gitignored and Tailwind would scan their bundles.
  // Only remove these exact generated directories inside this commit's cache.
  for (const name of ["dist-benchmark-production", "dist-benchmark-profile"]) {
    const target = path.resolve(frontend, name);
    if (!target.startsWith(path.resolve(cache) + path.sep)) throw new Error("Unsafe cache path");
    if (existsSync(target)) rmSync(target, { recursive: true });
  }
  const htmlPath = path.join(frontend, "index.html");
  writeFileSync(htmlPath, readFileSync(htmlPath, "utf8").replaceAll("%VITE_FAVICON%", "data:,").replaceAll("%VITE_TITLE%", "Benchmark"));
  writeFileSync(path.join(frontend, "benchmark-runtime.js"), runtime);
  const outputs = {};
  for (const mode of ["production", "profile"]) {
    const config = [
      "import { defineConfig, mergeConfig } from 'vite';",
      "import original from './vite.config.ts';",
      "import ts from 'typescript';",
      "export default defineConfig(async (env) => {",
      "const base = typeof original === 'function' ? await original(env) : original;",
      "return mergeConfig(base, { base: '/',",
      "define: { 'import.meta.env.VITE_SHOW_DEV_INFO': JSON.stringify('false'), 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(''), 'import.meta.env.VITE_CONFIG_FILE': JSON.stringify('config') },",
      mode === "profile" ? "resolve: { alias: [{ find: /^react-dom\\/client$/, replacement: 'react-dom/profiling' }] }, plugins: [" + instrumentation(kind) + "]," : "",
      "build: { outDir: 'dist/benchmark-" + mode + "', emptyOutDir: true, sourcemap: false }",
      "}); });"
    ].join("\n");
    const configPath = path.join(frontend, "benchmark-" + mode + ".config.mjs");
    writeFileSync(configPath, config);
    outputs[mode] = path.join(frontend, "dist/benchmark-" + mode);
    const signature = createHash("sha256").update(sha + config + runtime + readFileSync(htmlPath) + process.version).digest("hex");
    const stamp = path.join(snapshot, mode + "-build.txt");
    if (existsSync(stamp) && readFileSync(stamp, "utf8") === signature && existsSync(path.join(outputs[mode], "index.html"))) {
      console.log("Reusing " + label + " " + sha.slice(0, 8) + " (" + mode + ")");
    } else {
      console.log("Building " + label + " " + sha.slice(0, 8) + " (" + mode + ", " + kind + ")");
      run(process.execPath, [path.join(frontend, "node_modules/vite/bin/vite.js"), "build", "--config", configPath], frontend);
      writeFileSync(stamp, signature);
    }
  }
  const lock = readFileSync(path.join(frontend, "package-lock.json"));
  const versions = Object.fromEntries(["react", "react-dom", "zustand", "vite"].map(name => [name, JSON.parse(lock).packages["node_modules/" + name]?.version ?? null]));
  return { label, ref, sha, kind, outputs, versions, lockSha256: createHash("sha256").update(lock).digest("hex") };
}
