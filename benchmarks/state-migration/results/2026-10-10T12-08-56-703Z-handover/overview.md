# Handover versus test-benchmark: overview

Measured app commits: handover `a02cc25c307510a289f4ff06b34379f49fbbfc83`; test-benchmark `e2ead6e031e75d1d9ccaaa1acf2c1b2e1a52411b`.

All 14 registered historical modes were tested. Nine have a current counterpart; five removed modes have baseline-only results. Each scenario/build has 20 measured trials per available version, plus 3 warm-ups. Every trial performs 40 real UI actions with 250 fixture points. The full run contains 920 measured trials.

The outcome is mixed. Linear training avoided all 40 measured results-panel renders and reduced React render time by 48.9%; linear stepping reduced React time by 10.6%. Their production task/script/layout intervals still crossed zero. KNN training, SVM training, and SVM prediction had higher production main-thread costs (16.8%, 22.6%, and 12.5% more respectively), alongside more React work. KNN prediction used 13.1% less script time, but its total main-thread difference was uncertain. These results do not support a universal performance improvement.

All values are median workload totals, not milliseconds per click or perceived latency. Counts can be fractional because the median averages the middle two trials. Percentages describe changes in median work relative to handover. “Lower” and “higher” mean the paired bootstrap 95% interval for the difference excludes zero; “uncertain” means it spans zero. The intervals are exploratory, without a multiple-comparison correction.

## Browser work in ordinary production builds

| Mode | Main-thread task ms: old → new | Task change | Script ms: old → new | Script change | Layout ms: old → new | Layout change |
|---|---:|---|---:|---|---:|---|
| decision-tree-manual | 656.6 → 665.4 | 1.3% more; uncertain | 327.0 → 342.1 | 4.6% more; uncertain | 53.9 → 52.1 | 3.5% less; uncertain |
| knn-train | 6281.1 → 7337.8 | 16.8% more; higher | 2496.6 → 2777.1 | 11.2% more; higher | 167.3 → 232.7 | 39.1% more; higher |
| knn-predict | 8261.2 → 8581.0 | 3.9% more; uncertain | 3398.8 → 2952.1 | 13.1% less; lower | 242.0 → 244.6 | 1.1% more; uncertain |
| kmeans-step | 1721.7 → 1688.0 | 2.0% less; uncertain | 528.7 → 513.9 | 2.8% less; uncertain | 94.6 → 88.5 | 6.5% less; uncertain |
| linear-train | 1948.4 → 1872.0 | 3.9% less; uncertain | 791.9 → 764.1 | 3.5% less; uncertain | 93.7 → 90.7 | 3.3% less; uncertain |
| linear-step | 1898.1 → 1750.6 | 7.8% less; uncertain | 676.6 → 626.9 | 7.3% less; uncertain | 146.7 → 138.3 | 5.7% less; uncertain |
| svm-train | 6404.4 → 7853.0 | 22.6% more; higher | 2316.8 → 3095.0 | 33.6% more; higher | 195.8 → 297.9 | 52.1% more; higher |
| svm-predict | 4610.8 → 5188.8 | 12.5% more; higher | 1703.8 → 2204.0 | 29.4% more; higher | 271.8 → 281.1 | 3.4% more; uncertain |
| svm-step | 4277.6 → 4314.5 | 0.9% more; uncertain | 1792.2 → 1810.4 | 1.0% more; uncertain | 151.0 → 150.7 | 0.2% less; uncertain |

## React work in separate profiling builds

React duration excludes work done in D3 effects. Counts are component function invocations, not DOM mutations. Results counts cover ClassifierResults and RegressionResults; HUD counts aggregate the mounted model HUDs. “n/a” means that instrumented component was not mounted. A zero for a mounted component means it avoided rendering during the workload.

| Mode | React render ms: old → new | Render-time change | Commits: old → new | Results renders: old → new | Visualization renders: old → new | HUD renders: old → new |
|---|---:|---|---:|---:|---:|---:|
| decision-tree-manual | 197.5 → 212.1 | 7.4% more; higher | 80.0 → 80.0 | 40.0 → 40.0 | 40.0 → 40.0 | 40.0 → 40.0 |
| knn-train | 258.7 → 371.4 | 43.5% more; higher | 110.0 → 191.5 | 106.0 → 149.5 | 106.0 → 149.5 | n/a → n/a |
| knn-predict | 145.4 → 145.5 | 0.0% change; uncertain | 185.5 → 181.0 | n/a → n/a | 110.0 → 112.0 | n/a → n/a |
| kmeans-step | 64.0 → 65.7 | 2.7% more; uncertain | 40.0 → 60.0 | n/a → n/a | 40.0 → 60.0 | 40.0 → 40.0 |
| linear-train | 119.0 → 60.9 | 48.9% less; lower | 40.0 → 40.0 | 40.0 → 0.0 | 40.0 → 40.0 | 80.0 → 80.0 |
| linear-step | 86.9 → 77.7 | 10.6% less; lower | 40.0 → 40.0 | n/a → n/a | 40.0 → 40.0 | 120.0 → 120.0 |
| svm-train | 610.9 → 775.6 | 27.0% more; higher | 145.0 → 193.0 | 108.0 → 149.5 | 108.0 → 149.5 | 66.5 → 107.5 |
| svm-predict | 148.0 → 177.3 | 19.8% more; higher | 155.5 → 228.5 | n/a → n/a | 109.0 → 151.0 | n/a → n/a |
| svm-step | 356.6 → 354.6 | 0.5% less; uncertain | 40.0 → 40.0 | n/a → n/a | 40.0 → 40.0 | 80.0 → 80.0 |

## Scope and preservation

This is a whole-revision comparison. Layout, renderer, routing, dependencies and other refactors also changed between handover and test-benchmark, so these results do not isolate the causal effect of Zustand or selectors.

API responses are deterministic local fixtures. Backend training and real network latency are excluded. The supplementary rendering-opportunity measure is not paint latency, INP, FPS, or proof that a difference is noticeable to users.

The [full report](summary.md) contains medians, interquartile ranges, and numerical confidence intervals for all metrics, including the five retired modes. [Raw trials and metadata](raw.json), before/after screenshots, historical registries, and exact harness sources are saved beside it. The failed K-means setup attempt is preserved under audit; that entire production block was discarded and repeated after fixing readiness outside the timed workload. A later transient Windows checkpoint error was recovered without discarding completed trials, after adding atomic checkpoint replacement and bounded retries between trials. Neither recovery changed timed actions or metric definitions.

Only this new direct comparison was run. Missing main/test results were not recreated. This results directory is tracked in Git; disposable build and smoke-test caches remain ignored.
