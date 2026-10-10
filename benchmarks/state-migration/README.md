# State migration benchmark

## Controlled selector suite

Run every shared visualization speed test on the audited broad-subscription and
selective-subscription commits:

    npm run suite --prefix benchmarks/state-migration -- --comparison selectors --baseline bddf296 --candidate ac889ef

This covers all nine pages registered identically in both revisions: decision-tree
manual, KNN train/predict, K-means step, linear train/step, and SVM train/predict/step.
The five historical modes removed before these commits cannot be compared here.
Both versions already use Zustand. The controlled change includes field selectors,
shallow comparison of derived arrays, and reactive mode subscriptions; store
implementations, D3 renderers, dependencies, public configuration and backend match.
The runner verifies the exact audited commits, dependency locks, changed-file scope,
and matching registries, and archives the revision diff with the results.

Every existing metric is collected: production task/script/layout/style duration,
separate profiling-build React duration/commits/component render counts, and the
supplementary rendering-opportunity P50/P95 for synchronous controls. This estimate
does not measure actual paint latency or establish that a change is noticeable.
The same fixtures, real UI actions, alternating paired trials, warm-ups, validation,
and confidence intervals described below apply. Outputs use `results/<timestamp>-selectors/`.
Success-alert timers run normally; their phase is not frozen, so they can add
commits during repeated training/prediction and alter screenshot alert visibility.
Paired workload values and final outcomes match; commit counts describe observed
work, rather than a fixed number of store notifications.

Validate all nine scenarios first:

    npm run suite --prefix benchmarks/state-migration -- --comparison selectors --baseline bddf296 --candidate ac889ef --smoke --runs 1 --warmups 0 --steps 4

After a complete default run, generate an overview and audit its evidence:

    npm run overview --prefix benchmarks/state-migration -- results/<timestamp>-selectors/raw.json
    npm run verify --prefix benchmarks/state-migration -- results/<timestamp>-selectors/raw.json

Pass paths relative to the benchmark directory when invoking these npm scripts.
The verifier checks full default-run coverage, matched starting/final states, input
counts, finite metrics, summaries and confidence intervals, archived source hashes,
screenshots, and the audited diff.
Its optional `--staged` also checks that all result files are included in Git and
that every result file's bytes survive staging.

## Full handover suite

Run a fresh comparison of the Context version tagged `handover` with the
optimized Zustand branch `test-benchmark`:

    npm ci --prefix benchmarks/state-migration
    npm run suite --prefix benchmarks/state-migration

The suite covers all 14 visualizations registered in the historical app:

| Model | Historical modes | Comparable current modes |
|---|---|---|
| Decision tree | train, predict, manual | manual |
| KNN | train, predict | train, predict |
| K-means | train, predict, step | step |
| Linear regression | train, predict, step | train, step |
| SVM | train, predict, step | train, predict, step |

The default historical config links 12 unique modes through 15 pages. K-means
and linear prediction are registered but not linked there; the suite includes
them too. Duplicate story pages use one workload per component. The five
removed modes receive baseline-only measurements, with no comparative delta.
Deprecated decision-tree components and unregistered KNN learning code have no
reachable app route and are excluded. Viz-only routes reuse training components.
The report saves the exact historical config and registry sources as evidence.

Workloads use real UI events: intercept/bias keyboard changes, manual-tree
threshold changes, centroid placement/toggles, retraining, and prediction queries.
Each trial checks initialization, actual input counts, point counts where
applicable, expected final controls/query payloads, network requests, browser
errors, visual output, and profiling activity. Initial random line generation is
fixed to `Math.random() = 0.5` in both isolated browser contexts. SVM prediction
starts with the same saved model fixture in each context because the historical
prediction page requires an already trained model. Both begin with weights
`w1=0, w2=1, b=0`. Predictions use
the same query sequence; SVM calculates the individual query locally while its
API request evaluates the current weights. Decision-tree prediction playback is
advanced outside timing to validate the resulting highlighted branch.

Defaults are 20 measured pairs and 3 warm-up pairs per scenario/build, 40 actions
per trial, 250 points, and no CPU throttling. Trials are sequential, fresh contexts
alternate A/B then B/A, and production timing is separate from React profiling.
Training/prediction response bodies are fixed fixtures: this measures frontend
processing, not training speed or real network latency. No rendering-opportunity
latency is reported for asynchronous workloads. Per-metric intervals are
exploratory and have no multiple-comparison correction. Whole-revision differences
include renderer, layout, dependencies, routing and other refactors; they cannot
be attributed to Zustand alone.

Validate workloads before a long run (smoke artifacts stay in ignored `.cache`):

    npm run suite --prefix benchmarks/state-migration -- --smoke --runs 1 --warmups 0 --steps 4

Filter a diagnosis with `--scenarios knn-train,svm-step`, or change committed refs
with `--baseline` / `--candidate`. Results, raw trial data, screenshots, commit IDs,
hardware/browser settings and fixture/harness hashes go into **Git-trackable**
`results/<timestamp>-handover/`. Only disposable `.cache/` remains ignored. Include
new results in a Git commit to preserve them; removing an ignore rule alone does
not make files committed.
The local `.gitattributes` preserves archived evidence without line-ending
conversion, so its recorded hashes remain valid after a Windows checkout.

If a validation check stops a long run, retain the failed checkpoint and resume
with its original settings and frozen source commits:

    npm run suite --prefix benchmarks/state-migration -- --resume results/<timestamp>-handover/raw.json --restart kmeans-step:production

`--restart` discards the named scenario/build block and repeats its warm-ups and
measurements. Other complete pairs are retained; any incomplete pair is repeated
in full. Resume verifies the fixture hash, Node/Chrome versions, CPU and dependency
locks. Each trial carries a harness hash, compared pairs must share one, and the
exact harness sources plus the failed checkpoint are preserved for audit. Only
resume after a change outside the timed workload; a changed timed action, metric
definition or fixture requires a fresh comparison for the affected scenarios.
Use `--resume-reason "explanation"` to record another type of recovery. Checkpoints
are replaced atomically between trials, with bounded retries for transient Windows
file locks; checkpoint writing and retry delays are outside all timing windows.

## Original single-scenario harness

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

Each run writes a Git-trackable results/timestamp directory:

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
