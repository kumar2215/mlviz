# Broad versus selective Zustand subscriptions

Baseline: `bddf2967c3bf74ded9a88a2abc2924e914b97583`; candidate: `ac889ef39017e225dcc7884520df8b75919c83c0`.

All 9 shared visualization scenarios were compared in ordinary production and separate React profiling builds. Each scenario/build has 20 measured pairs and 3 warm-up pairs, with 40 real UI actions and 250 fixture points per trial: 720 measured trials in total.

The audited change is the subscription optimization package: field selectors, shallow comparison of derived arrays, and reactive mode subscriptions. Store implementations, D3 renderers, dependencies, public configuration and backend are identical. Both revisions already use Zustand; this comparison does not measure Context versus Zustand.

Values below are baseline → candidate medians. Lower/higher means the paired bootstrap 95% difference interval excludes zero; uncertain means it crosses zero. Percentages compare median work. Intervals are exploratory and have no multiple-comparison correction.

None of the nine scenarios established a direction for total main-thread task time or script time at the reported confidence level. This does not establish that the costs are equal.

Directional React-duration changes: decision-tree-manual: 4.1% more; linear-train: 60.5% less. Directional layout-duration changes: knn-train: 20.3% less; linear-train: 15.1% less; svm-train: 10.9% less. All remaining React-duration and layout-duration intervals cross zero.

## Browser work in ordinary production builds

Times are totals in milliseconds across the entire workload, including automation and sampling overhead. They are not latency per click.

| Scenario | Main-thread task | Script | Layout | Style |
|---|---|---|---|---|
| decision-tree-manual | 1116.70 → 1054.67; 5.6% less; uncertain | 582.41 → 548.02; 5.9% less; uncertain | 89.40 → 84.02; 6.0% less; uncertain | 105.85 → 97.69; 7.7% less; uncertain |
| knn-train | 9422.71 → 9076.62; 3.7% less; uncertain | 3506.74 → 3361.74; 4.1% less; uncertain | 354.75 → 282.83; 20.3% less; lower | 1063.57 → 985.80; 7.3% less; uncertain |
| knn-predict | 10385.62 → 10835.17; 4.3% more; uncertain | 3608.64 → 3734.63; 3.5% more; uncertain | 297.00 → 311.25; 4.8% more; uncertain | 1252.90 → 1346.74; 7.5% more; uncertain |
| kmeans-step | 2444.03 → 2571.27; 5.2% more; uncertain | 721.55 → 752.71; 4.3% more; uncertain | 130.02 → 138.35; 6.4% more; uncertain | 430.07 → 446.20; 3.8% more; uncertain |
| linear-train | 2703.02 → 2642.87; 2.2% less; uncertain | 1092.80 → 1059.72; 3.0% less; uncertain | 157.86 → 133.97; 15.1% less; lower | 491.77 → 484.55; 1.5% less; uncertain |
| linear-step | 2638.49 → 2496.27; 5.4% less; uncertain | 941.33 → 879.66; 6.6% less; uncertain | 206.52 → 193.45; 6.3% less; uncertain | 463.66 → 443.92; 4.3% less; uncertain |
| svm-train | 12518.67 → 13520.41; 8.0% more; uncertain | 5003.11 → 5292.35; 5.8% more; uncertain | 534.11 → 475.87; 10.9% less; lower | 2197.82 → 2336.32; 6.3% more; uncertain |
| svm-predict | 8207.50 → 8315.67; 1.3% more; uncertain | 3524.46 → 3599.67; 2.1% more; uncertain | 440.20 → 442.57; 0.5% more; uncertain | 1193.50 → 1227.23; 2.8% more; uncertain |
| svm-step | 8003.49 → 7551.65; 5.6% less; uncertain | 3355.33 → 3161.79; 5.8% less; uncertain | 287.69 → 271.75; 5.5% less; uncertain | 2617.82 → 2498.91; 4.5% less; uncertain |

## React work in separate profiling builds

React duration excludes D3 effects. Counts are component function invocations, not DOM mutations. HUD counts aggregate mounted model HUDs. Fractional counts are medians; n/a means the component was absent.

| Scenario | React render ms | Commits | Results renders | Visualization renders | HUD renders |
|---|---|---|---|---|---|
| decision-tree-manual | 211.80 → 220.50; 4.1% more; higher | 80.00 → 80.00; 0.0% more; uncertain | 40.00 → 40.00; 0.0% more; uncertain | 40.00 → 40.00; 0.0% more; uncertain | 40.00 → 40.00; 0.0% more; uncertain |
| knn-train | 510.50 → 491.75; 3.7% less; uncertain | 228.00 → 193.00; 15.4% less; lower | 150.50 → 151.00; 0.3% more; uncertain | 150.50 → 151.00; 0.3% more; uncertain | n/a |
| knn-predict | 179.30 → 181.15; 1.0% more; uncertain | 182.00 → 180.00; 1.1% less; uncertain | n/a | 114.00 → 114.50; 0.4% more; uncertain | n/a |
| kmeans-step | 67.35 → 65.55; 2.7% less; uncertain | 60.00 → 60.00; 0.0% more; uncertain | n/a | 60.00 → 60.00; 0.0% more; uncertain | 40.00 → 40.00; 0.0% more; uncertain |
| linear-train | 150.65 → 59.55; 60.5% less; lower | 40.00 → 40.00; 0.0% more; uncertain | 40.00 → 0.00; 100.0% less; lower | 40.00 → 40.00; 0.0% more; uncertain | 80.00 → 80.00; 0.0% more; uncertain |
| linear-step | 75.10 → 70.30; 6.4% less; uncertain | 40.00 → 40.00; 0.0% more; uncertain | n/a | 40.00 → 40.00; 0.0% more; uncertain | 120.00 → 120.00; 0.0% more; uncertain |
| svm-train | 762.40 → 732.55; 3.9% less; uncertain | 229.00 → 192.00; 16.2% less; lower | 148.50 → 148.00; 0.3% less; uncertain | 148.50 → 148.00; 0.3% less; uncertain | 106.50 → 106.00; 0.5% less; uncertain |
| svm-predict | 163.05 → 154.95; 5.0% less; uncertain | 194.00 → 226.00; 16.5% more; higher | n/a | 150.00 → 149.00; 0.7% less; uncertain | n/a |
| svm-step | 347.00 → 343.25; 1.1% less; uncertain | 40.00 → 40.00; 0.0% more; uncertain | n/a | 40.00 → 40.00; 0.0% more; uncertain | 80.00 → 80.00; 0.0% more; uncertain |

## Supplemental rendering-opportunity estimate

Milliseconds from input capture to rAF followed by a timer, measured only for synchronous controls. This is not actual paint latency, INP, FPS, or evidence that users can notice a difference. Training and prediction have no latency estimate here.

| Scenario | P50 ms | P95 ms |
|---|---|---|
| decision-tree-manual | 25.92 → 24.52; 5.4% less; uncertain | 31.84 → 31.91; 0.2% more; uncertain |
| kmeans-step | 42.55 → 43.70; 2.7% more; uncertain | 56.44 → 55.45; 1.8% less; uncertain |
| linear-train | 82.83 → 81.13; 2.1% less; uncertain | 181.15 → 186.25; 2.8% more; uncertain |
| linear-step | 66.20 → 62.98; 4.9% less; lower | 114.75 → 111.48; 2.9% less; uncertain |
| svm-step | 189.25 → 179.05; 5.4% less; lower | 239.07 → 234.48; 1.9% less; uncertain |

## Evidence and limits

API responses are fixed local fixtures. These tests measure frontend work; backend computation and real network latency are excluded. Each mode uses its documented representative action, rather than every possible interaction. Five historical modes had already been removed from both revisions.

Paired trials match their workload values and final outcomes. Success-alert timers run normally during repeated training/prediction; their phase is not frozen. Alert visibility can differ in screenshots, and those timers can contribute extra React commits. Interpret commit counts as observed workload counts, rather than a fixed number of store notifications.

The [full report](summary.md) includes interquartile ranges and numerical confidence intervals for every metric. [Raw trials and environment](raw.json), before/after screenshots, exact registries, the audited revision diff, and archived harness sources accompany it. Results are intended to be tracked in Git; caches and smoke runs remain ignored.
