# Controlled Context to optimized Zustand comparison

Baseline: `3bee6f351a810b6d6ff847a3c29e2378a5925ca6`; uncommitted candidate based on `5da4d3f1adcc42761a35531e819fdb3f1c090275`, source SHA-256 `b247e89fe07917a073a1dd515de1e028360ce4e9eb9fd2f7f06ffc00777ecf9a`.

All 9 shared visualization scenarios were compared in ordinary production and separate React profiling builds. Each scenario/build has 20 measured pairs and 3 warm-up pairs, with 40 real UI actions and 250 fixture points per trial: 720 measured trials in total.

The candidate replaces the five model Context implementations with Zustand and selective subscriptions. The old visualization wrappers, D3 renderers, dependencies, public configuration, shared app stores, passive persistence, synchronization and auto-load policies are retained. Diagnostic console log/debug/info expression statements are stripped equally in both builds. This measures the optimized migration implementation; it cannot establish a universal library effect or perceived speed.

Values below are baseline → candidate medians. Lower/higher means the paired bootstrap 95% difference interval excludes zero; uncertain means it crosses zero. Percentages compare median work. Intervals are exploratory and have no multiple-comparison correction.

Directional production task changes: knn-train: 11.1% less; knn-predict: 5.9% more; linear-train: 7.8% less; svm-train: 8.1% more; svm-predict: 15.7% more. Script changes: knn-train: 18.1% less; knn-predict: 6.0% more; linear-train: 6.7% less; svm-train: 19.2% more; svm-predict: 36.0% more.

Directional React-duration changes: knn-train: 23.4% more; knn-predict: 4.8% more; kmeans-step: 9.0% less; linear-train: 58.5% less; svm-train: 8.6% more. Directional layout-duration changes: knn-train: 14.5% less; knn-predict: 10.3% more; linear-train: 14.9% less; svm-train: 5.7% less; svm-predict: 7.9% more. All remaining React-duration and layout-duration intervals cross zero.

The optimized migration does not consistently reduce renders or browser work. Linear training removes 40 results-panel renders and reduces React render duration by 58.5%, but KNN/SVM training invoke their results and visualization components more often (medians 104 to 142). SVM prediction visualization invocations rise from 106 to 148. Component invocation counts and root commit counts describe different work; see the complete tables below.

## Browser work in ordinary production builds

Times are totals in milliseconds across the entire workload, including automation and sampling overhead. They are not latency per click.

| Scenario | Main-thread task | Script | Layout | Style |
|---|---|---|---|---|
| decision-tree-manual | 452.93 → 469.20; 3.6% more; uncertain | 226.80 → 231.89; 2.2% more; uncertain | 37.78 → 39.87; 5.5% more; uncertain | 41.01 → 42.94; 4.7% more; uncertain |
| knn-train | 2901.27 → 2580.14; 11.1% less; lower | 1383.55 → 1133.70; 18.1% less; lower | 98.80 → 84.49; 14.5% less; lower | 290.07 → 256.76; 11.5% less; lower |
| knn-predict | 2887.17 → 3058.48; 5.9% more; higher | 1115.13 → 1181.91; 6.0% more; higher | 85.18 → 93.95; 10.3% more; higher | 304.72 → 350.11; 14.9% more; higher |
| kmeans-step | 777.52 → 749.99; 3.5% less; uncertain | 253.07 → 244.99; 3.2% less; uncertain | 42.99 → 41.37; 3.8% less; uncertain | 133.91 → 129.19; 3.5% less; lower |
| linear-train | 756.74 → 697.82; 7.8% less; lower | 294.16 → 274.49; 6.7% less; lower | 42.09 → 35.80; 14.9% less; lower | 128.30 → 122.35; 4.6% less; lower |
| linear-step | 612.44 → 625.30; 2.1% more; uncertain | 217.37 → 224.66; 3.4% more; uncertain | 45.96 → 47.78; 4.0% more; uncertain | 99.36 → 102.67; 3.3% more; uncertain |
| svm-train | 2707.05 → 2926.36; 8.1% more; higher | 1010.70 → 1204.57; 19.2% more; higher | 124.43 → 117.36; 5.7% less; lower | 460.49 → 449.71; 2.3% less; uncertain |
| svm-predict | 1657.37 → 1916.78; 15.7% more; higher | 616.16 → 838.27; 36.0% more; higher | 90.72 → 97.88; 7.9% more; higher | 249.69 → 253.57; 1.6% more; uncertain |
| svm-step | 1819.71 → 1853.64; 1.9% more; uncertain | 804.57 → 803.58; 0.1% less; uncertain | 72.71 → 74.19; 2.0% more; uncertain | 515.07 → 537.38; 4.3% more; uncertain |

## React work in separate profiling builds

React duration excludes D3 effects. Counts are component function invocations, not DOM mutations. HUD counts aggregate mounted model HUDs. Fractional counts are medians; n/a means the component was absent.

| Scenario | React render ms | Commits | Results renders | Visualization renders | HUD renders |
|---|---|---|---|---|---|
| decision-tree-manual | 55.20 → 53.60; 2.9% less; uncertain | 80.00 → 80.00; 0.0% more; uncertain | 40.00 → 40.00; 0.0% more; uncertain | 40.00 → 40.00; 0.0% more; uncertain | 40.00 → 40.00; 0.0% more; uncertain |
| knn-train | 93.40 → 115.25; 23.4% more; higher | 181.50 → 183.00; 0.8% more; uncertain | 104.00 → 142.00; 36.5% more; higher | 104.00 → 142.00; 36.5% more; higher | n/a |
| knn-predict | 48.65 → 51.00; 4.8% more; higher | 180.00 → 148.00; 17.8% less; lower | n/a | 104.00 → 106.00; 1.9% more; higher | n/a |
| kmeans-step | 18.40 → 16.75; 9.0% less; lower | 40.00 → 40.00; 0.0% more; uncertain | n/a | 40.00 → 40.00; 0.0% more; uncertain | 40.00 → 40.00; 0.0% more; uncertain |
| linear-train | 33.10 → 13.75; 58.5% less; lower | 40.00 → 40.00; 0.0% more; uncertain | 40.00 → 0.00; 100.0% less; lower | 40.00 → 40.00; 0.0% more; uncertain | 80.00 → 80.00; 0.0% more; uncertain |
| linear-step | 53.85 → 51.80; 3.8% less; uncertain | 40.00 → 40.00; 0.0% more; uncertain | n/a | 40.00 → 40.00; 0.0% more; uncertain | 120.00 → 120.00; 0.0% more; uncertain |
| svm-train | 432.05 → 469.25; 8.6% more; higher | 184.50 → 180.50; 2.2% less; uncertain | 104.00 → 142.00; 36.5% more; higher | 104.00 → 142.00; 36.5% more; higher | 61.50 → 100.00; 62.6% more; higher |
| svm-predict | 121.40 → 134.50; 10.8% more; uncertain | 154.00 → 193.00; 25.3% more; higher | n/a | 106.00 → 148.00; 39.6% more; higher | n/a |
| svm-step | 201.40 → 197.05; 2.2% less; uncertain | 40.00 → 40.00; 0.0% more; uncertain | n/a | 40.00 → 40.00; 0.0% more; uncertain | 80.00 → 80.00; 0.0% more; uncertain |

## Supplemental rendering-opportunity estimate

Milliseconds from input capture to rAF followed by a timer, measured only for synchronous controls. This is not actual paint latency, INP, FPS, or evidence that users can notice a difference. Training and prediction have no latency estimate here.

| Scenario | P50 ms | P95 ms |
|---|---|---|
| decision-tree-manual | 16.85 → 16.85; 0.0% more; uncertain | 18.31 → 18.69; 2.1% more; uncertain |
| kmeans-step | 12.72 → 12.03; 5.5% less; lower | 18.47 → 17.69; 4.2% less; uncertain |
| linear-train | 20.20 → 20.10; 0.5% less; uncertain | 24.40 → 24.94; 2.2% more; uncertain |
| linear-step | 19.60 → 19.63; 0.1% more; uncertain | 21.58 → 20.95; 2.9% less; uncertain |
| svm-step | 39.75 → 41.33; 4.0% more; uncertain | 57.98 → 53.46; 7.8% less; uncertain |

## Evidence and limits

API responses are fixed local fixtures. These tests measure frontend work; backend computation and real network latency are excluded. Each mode uses its documented representative action, rather than every possible interaction. Five historical modes had already been removed from both revisions.

Paired trials match their workload values, final outcomes, persisted model inputs, controls and rendered plot geometry. Geometry and persistence hashes are collected outside the timed windows. Success-alert timers run normally during repeated training/prediction; their phase is not frozen. Alert visibility can differ in screenshots, and those timers can contribute extra React commits. Interpret commit counts as observed workload counts, rather than a fixed number of store notifications.

The [full report](summary.md) includes interquartile ranges and numerical confidence intervals for every metric. [Raw trials and environment](raw.json), before/after screenshots, exact registries, the complete uncommitted candidate changes and source hashes, and archived harness sources accompany it. The temporary application edits were discarded after measurement. These result artifacts remain uncommitted; caches and smoke runs remain ignored.
