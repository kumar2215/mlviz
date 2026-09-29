# State migration benchmark

Automates one representative interaction in the real app: change the
linear-regression intercept using the range input's native keyboard handling.
The plot, loss map, controls, and results panel are mounted on both revisions.

## Run

Requires Node 22+, npm, Git, tar, and local Google Chrome. No backend is needed.
From the repository root:

    cd benchmarks/state-migration
    npm ci
    npm run bench

Defaults: local main versus local test, 20 measured pairs plus 3 warm-up pairs
in **each** of two build modes, 40 inputs per trial, and 250 fixture points.
The first run downloads each revision's dependencies with its own npm ci.
Later runs reuse those installations and matching builds. Build signatures include
the source commit, generated build configuration, instrumentation, and Node version.

Smoke test:

    npm run bench -- --runs 2 --warmups 1 --steps 12

More samples, or a more demanding workload:

    npm run bench -- --runs 30 --points 1000 --cpu 4

Compare any committed revisions (including a future selector improvement):

    npm run bench -- --baseline test --candidate selector-improvements

Use --headed to show the browser, --channel msedge to use Edge, or install the
pinned Playwright Chromium with npx playwright install chromium and pass
--channel chromium. Keep the browser mode/channel constant between comparisons.
For headed runs, keep the browser visible and foregrounded.

Keep the laptop plugged in with a consistent power mode and close CPU-heavy apps.
Avoid interacting with the computer during measurement. Automation controls inputs;
it does not eliminate OS scheduling, thermal throttling, or measurement noise.

## What it controls

- Exports exact Git commits with git archive. Does not switch branches or edit
  application code. Uncommitted changes are **not** included.
- Saves commit IDs, dependency/lockfile versions, fixture hash, browser version,
  hardware, viewport, and settings in every report.
- Uses each branch's production Vite configuration, with benchmark-only overrides
  for API/config paths, logging, output paths, and optional React instrumentation.
  It invokes Vite directly; it is not a TypeScript or lint validation.
- Serves the actual app locally with equivalent single-page configuration in each
  branch's schema. Both receive exactly the same generated dataset, model, and
  metrics. The fixture is synthetic, not a claim about model accuracy.
- Uses a new browser context for each trial, resetting storage, cache, and cookies.
  No existing Chrome profile is used.
- Uses local system fonts rather than downloading web fonts.
- Waits for initialization, explicitly clicks Train Model and waits for its alert
  to disappear (avoiding an initial auto-load race on main), then centers the
  slider with Home and five PageUp keys,
  then performs eight unmeasured increments in every trial before measurement.
  Checks the initial slope and the number of plotted residual lines.
- Sends one real ArrowRight key per two animation-frame boundaries. Updates are
  not synchronously batched into one artificial update. The sequence excludes
  pointer release and its API evaluation request.
- Alternates A/B then B/A within each build mode. Trials run sequentially.
- Rejects runs with browser errors, unexpected API/config calls, wrong slider
  values/input counts, absent plot updates, or missing profiling instrumentation.
  Zero renders of an instrumented component is a valid optimization outcome.

## Measurements and output

Each run writes an ignored results/timestamp directory:

- summary.md: medians, interquartile ranges, percentage reductions, and paired
  bootstrap 95% intervals for differences in medians.
- raw.json: all individual trials, inputs, React samples, warm-ups, and metadata.
- Before/after screenshots for the first measured trial of each version/mode.
- On failure, a partial report plus screenshot and diagnostic text.

The **normal production build** measures Chromium main-thread task, script,
layout, and style time from CDP. Small automation and sampling overhead is
included on both sides.

The separate **profiling production build** aliases react-dom/client to
react-dom/profiling. One root React Profiler records actual render duration and
commits. Benchmark-only counters record function invocations of the regression
results, visualisation, and line-control components. They are not DOM mutation
counts. Nested profiler durations are not summed. An ordinary production build
must have no React instrumentation.

The supplemental renderOpportunity values measure input-event capture to an
animation-frame callback followed by a timer. They are an **approximation of a
rendering opportunity**, not actual presentation latency, INP, FPS, or dropped
frames. The frame-paced workload is useful for cost per update; it is not a
continuous pointer-drag throughput test.

Statistical intervals resample complete matched runs, not the correlated input
events inside each run. Positive reduction means less time/work. A difference
interval crossing zero does not establish a direction. Two runs only validate
the machinery; use at least 20 for an initial comparison and repeat the experiment
if differences are small or inconsistent. Counts may be identical while costs
differ. Do not present tiny timing differences as perceptible improvements.

## Interpretation and scope

Main and test include substantial unrelated changes. This measures the two
application revisions for this workload; it **cannot isolate Zustand's causal
effect**. Browser/layout/dependency differences remain part of the comparison.
To isolate selectors, compare the current test commit with a committed copy
whose only changes are selector improvements. To isolate state management,
prepare versions with otherwise identical UI and behavior.

This first scenario covers frequent model-state updates, not story navigation,
K-means stepping, network latency, startup/bundle size, or all app performance.
Add further scenarios only with equally deterministic starting state and success
checks. The source adapters deliberately fail if expected component shapes change;
review them when the application structure changes.

Run the fixture/statistics checks with npm test.

References:
[React Profiler](https://react.dev/reference/react/Profiler),
[production profiling alias](https://react.dev/reference/dev-tools/react-performance-tracks),
[Playwright keyboard input](https://playwright.dev/docs/api/class-keyboard).
