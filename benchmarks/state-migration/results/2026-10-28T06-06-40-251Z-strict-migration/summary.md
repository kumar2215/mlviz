# Controlled Context to optimized Zustand comparison

Baseline: 3bee6f3 @ 3bee6f351a810b6d6ff847a3c29e2378a5925ca6
Candidate: WORKTREE, based on 5da4d3f1adcc42761a35531e819fdb3f1c090275; uncommitted source SHA-256 b247e89fe07917a073a1dd515de1e028360ce4e9eb9fd2f7f06ffc00777ecf9a

20 measured pairs, 3 warm-up pairs per scenario/build; 40 real UI actions per trial; 250 fixture points; CPU 1x. Chrome 155.0.8059.86.

Positive reduction means less work. Values are median [Q25, Q75]. Confidence intervals bootstrap whole paired trials (candidate minus baseline). An interval spanning zero does not establish a direction. Fewer than 20 pairs is only a smoke test.

All 9 selected shared visualization scenarios are paired. The complete shared suite covers all nine pages registered identically in both revisions: decision-tree manual, KNN train/predict, K-means step, linear train/step, and SVM train/predict/step. The five historical modes removed before either revision cannot be compared here. Exact registries for both revisions and the source diff are saved beside this report.

Production task/script/layout/style durations come from CDP and include automation/measurement overhead. React times and component function invocation counts come from separate profiling builds; commits use one root Profiler. D3 work is outside React actualDuration. HUD counts aggregate the mounted model HUDs.

Rendering-opportunity delay is input capture → rAF → setTimeout, not paint latency, INP, FPS, or perceived response time. It is reported only for synchronous controls; asynchronous training/prediction actions have no latency estimate. Fixed API fixtures measure frontend update costs, not backend training or real network latency. The fixtures hold workload size constant and are not estimates of typical user behavior.

This compares Context model state at 3bee6f3 with an uncommitted migration-only candidate based on 5da4d3f, including selective model subscriptions. Existing app stores, dependencies, configuration, D3 renderers and visualization structure are held constant. Passive persistence and auto-load policies are retained. Diagnostic console log/debug/info statements are removed equally in both benchmark builds, including their argument evaluation. This estimates the optimized migration package, not an isolated library effect or perceived speed. Confidence intervals are exploratory without multiplicity correction.

## decision-tree-manual

Workload: threshold. Paired comparison.

| Build | Metric | baseline | candidate | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 452.93 [431.23, 461.47] | 469.20 [428.03, 479.81] | -3.59% | [-13.59, 38.79] |
| production | scriptMs | 226.80 [213.60, 233.52] | 231.89 [209.71, 240.76] | -2.25% | [-10.76, 20.98] |
| production | layoutMs | 37.78 [36.89, 39.49] | 39.87 [36.38, 40.91] | -5.54% | [-0.94, 3.32] |
| production | styleMs | 41.01 [39.94, 41.87] | 42.94 [39.94, 44.28] | -4.71% | [-0.59, 3.39] |
| production | renderOpportunityP50Ms | 16.85 [16.74, 16.91] | 16.85 [16.70, 16.90] | 0.00% | [-0.10, 0.07] |
| production | renderOpportunityP95Ms | 18.31 [17.93, 18.60] | 18.69 [18.18, 19.61] | -2.10% | [-0.09, 1.25] |
| profile | reactTotalMs | 55.20 [50.43, 63.67] | 53.60 [48.90, 67.90] | 2.90% | [-6.70, 10.95] |
| profile | reactCommits | 80.00 [80.00, 80.00] | 80.00 [80.00, 80.00] | 0.00% | [0.00, 0.00] |
| profile | resultsRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | visualisationRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | hudRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |

## knn-train

Workload: train. Paired comparison.

| Build | Metric | baseline | candidate | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 2901.27 [2850.14, 2971.67] | 2580.14 [2539.90, 2667.18] | 11.07% | [-365.00, -269.64] |
| production | scriptMs | 1383.55 [1360.73, 1426.14] | 1133.70 [1114.13, 1180.49] | 18.06% | [-278.45, -223.33] |
| production | layoutMs | 98.80 [96.11, 99.79] | 84.49 [83.69, 87.43] | 14.48% | [-15.10, -11.79] |
| production | styleMs | 290.07 [276.20, 296.03] | 256.76 [249.47, 268.21] | 11.48% | [-40.00, -21.15] |
| profile | reactTotalMs | 93.40 [91.48, 99.22] | 115.25 [112.40, 126.03] | -23.39% | [17.50, 31.30] |
| profile | reactCommits | 181.50 [180.00, 184.00] | 183.00 [183.00, 184.25] | -0.83% | [-1.00, 3.00] |
| profile | resultsRenders | 104.00 [102.00, 105.00] | 142.00 [141.75, 143.00] | -36.54% | [37.00, 40.00] |
| profile | visualisationRenders | 104.00 [102.00, 105.00] | 142.00 [141.75, 143.00] | -36.54% | [37.00, 40.00] |
| profile | hudRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |

## knn-predict

Workload: predict. Paired comparison.

| Build | Metric | baseline | candidate | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 2887.17 [2826.36, 3031.97] | 3058.48 [2895.71, 3131.77] | -5.93% | [37.02, 247.79] |
| production | scriptMs | 1115.13 [1083.98, 1184.60] | 1181.91 [1114.01, 1215.96] | -5.99% | [0.24, 103.76] |
| production | layoutMs | 85.18 [82.51, 89.64] | 93.95 [87.91, 96.80] | -10.30% | [2.72, 12.05] |
| production | styleMs | 304.72 [292.28, 319.58] | 350.11 [327.36, 364.64] | -14.90% | [20.46, 60.79] |
| profile | reactTotalMs | 48.65 [47.95, 50.90] | 51.00 [49.47, 52.33] | -4.83% | [0.50, 3.60] |
| profile | reactCommits | 180.00 [177.75, 181.25] | 148.00 [147.75, 149.25] | 17.78% | [-33.00, -29.50] |
| profile | resultsRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |
| profile | visualisationRenders | 104.00 [103.00, 105.00] | 106.00 [105.00, 106.25] | -1.92% | [1.00, 2.50] |
| profile | hudRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |

## kmeans-step

Workload: centroid. Paired comparison.

| Build | Metric | baseline | candidate | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 777.52 [747.10, 798.30] | 749.99 [721.66, 769.62] | 3.54% | [-50.93, 9.03] |
| production | scriptMs | 253.07 [240.67, 260.69] | 244.99 [231.91, 251.62] | 3.19% | [-21.92, 4.57] |
| production | layoutMs | 42.99 [41.75, 45.61] | 41.37 [39.51, 43.23] | 3.76% | [-3.74, 0.15] |
| production | styleMs | 133.91 [130.81, 137.18] | 129.19 [124.06, 132.75] | 3.53% | [-9.64, -0.34] |
| production | renderOpportunityP50Ms | 12.72 [11.85, 13.16] | 12.03 [11.17, 12.32] | 5.50% | [-1.40, -0.15] |
| production | renderOpportunityP95Ms | 18.47 [17.80, 19.56] | 17.69 [16.77, 19.11] | 4.24% | [-1.91, 0.58] |
| profile | reactTotalMs | 18.40 [17.50, 19.60] | 16.75 [15.55, 17.40] | 8.97% | [-3.05, -0.85] |
| profile | reactCommits | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | resultsRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |
| profile | visualisationRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | hudRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |

## linear-train

Workload: intercept. Paired comparison.

| Build | Metric | baseline | candidate | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 756.74 [743.73, 783.90] | 697.82 [663.68, 724.18] | 7.79% | [-103.18, -32.55] |
| production | scriptMs | 294.16 [290.31, 301.92] | 274.49 [263.18, 285.53] | 6.69% | [-33.17, -9.06] |
| production | layoutMs | 42.09 [41.68, 43.51] | 35.80 [33.91, 37.31] | 14.95% | [-8.04, -4.95] |
| production | styleMs | 128.30 [124.29, 133.29] | 122.35 [112.91, 126.98] | 4.63% | [-14.86, -0.06] |
| production | renderOpportunityP50Ms | 20.20 [20.10, 20.31] | 20.10 [19.90, 20.30] | 0.50% | [-0.30, 0.07] |
| production | renderOpportunityP95Ms | 24.40 [23.31, 27.94] | 24.94 [21.93, 28.26] | -2.22% | [-3.16, 4.13] |
| profile | reactTotalMs | 33.10 [32.58, 34.28] | 13.75 [13.10, 14.25] | 58.46% | [-20.90, -18.55] |
| profile | reactCommits | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | resultsRenders | 40.00 [40.00, 40.00] | 0.00 [0.00, 0.00] | 100.00% | [-40.00, -40.00] |
| profile | visualisationRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | hudRenders | 80.00 [80.00, 80.00] | 80.00 [80.00, 80.00] | 0.00% | [0.00, 0.00] |

## linear-step

Workload: intercept. Paired comparison.

| Build | Metric | baseline | candidate | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 612.44 [606.85, 643.31] | 625.30 [603.09, 649.01] | -2.10% | [-15.74, 26.76] |
| production | scriptMs | 217.37 [211.02, 225.05] | 224.66 [213.47, 235.14] | -3.35% | [-3.42, 17.22] |
| production | layoutMs | 45.96 [45.19, 47.61] | 47.78 [45.72, 49.51] | -3.98% | [-0.11, 2.92] |
| production | styleMs | 99.36 [97.99, 104.29] | 102.67 [99.27, 107.74] | -3.34% | [-1.33, 7.21] |
| production | renderOpportunityP50Ms | 19.60 [19.55, 19.63] | 19.63 [19.54, 19.70] | -0.13% | [-0.05, 0.10] |
| production | renderOpportunityP95Ms | 21.58 [20.56, 23.18] | 20.95 [20.63, 22.09] | 2.90% | [-1.97, 0.90] |
| profile | reactTotalMs | 53.85 [45.93, 61.75] | 51.80 [45.20, 57.78] | 3.81% | [-8.30, 3.80] |
| profile | reactCommits | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | resultsRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |
| profile | visualisationRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | hudRenders | 120.00 [120.00, 120.00] | 120.00 [120.00, 120.00] | 0.00% | [0.00, 0.00] |

## svm-train

Workload: train. Paired comparison.

| Build | Metric | baseline | candidate | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 2707.05 [2595.70, 2931.19] | 2926.36 [2837.10, 3098.06] | -8.10% | [62.44, 332.66] |
| production | scriptMs | 1010.70 [956.54, 1103.25] | 1204.57 [1162.33, 1269.11] | -19.18% | [141.71, 242.68] |
| production | layoutMs | 124.43 [119.55, 132.57] | 117.36 [113.89, 123.40] | 5.69% | [-11.79, -2.70] |
| production | styleMs | 460.49 [442.84, 499.82] | 449.71 [433.73, 487.36] | 2.34% | [-29.07, 20.31] |
| profile | reactTotalMs | 432.05 [167.58, 512.90] | 469.25 [193.12, 508.88] | -8.61% | [1.95, 61.25] |
| profile | reactCommits | 184.50 [178.00, 187.00] | 180.50 [178.75, 183.25] | 2.17% | [-6.00, 2.50] |
| profile | resultsRenders | 104.00 [98.00, 106.25] | 142.00 [136.00, 149.50] | -36.54% | [36.00, 44.50] |
| profile | visualisationRenders | 104.00 [98.00, 106.25] | 142.00 [136.00, 149.50] | -36.54% | [36.00, 44.50] |
| profile | hudRenders | 61.50 [57.00, 62.50] | 100.00 [96.00, 109.00] | -62.60% | [37.50, 46.50] |

## svm-predict

Workload: predict. Paired comparison.

| Build | Metric | baseline | candidate | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 1657.37 [1621.96, 1785.91] | 1916.78 [1894.52, 2022.99] | -15.65% | [188.07, 359.93] |
| production | scriptMs | 616.16 [602.69, 664.73] | 838.27 [815.62, 870.34] | -36.05% | [190.67, 256.33] |
| production | layoutMs | 90.72 [89.46, 96.98] | 97.88 [95.83, 103.33] | -7.90% | [3.10, 11.78] |
| production | styleMs | 249.69 [240.81, 266.90] | 253.57 [247.52, 267.70] | -1.55% | [-9.45, 18.78] |
| profile | reactTotalMs | 121.40 [83.25, 151.90] | 134.50 [98.55, 152.02] | -10.79% | [-6.60, 42.10] |
| profile | reactCommits | 154.00 [150.00, 155.25] | 193.00 [191.00, 196.00] | -25.32% | [37.50, 42.50] |
| profile | resultsRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |
| profile | visualisationRenders | 106.00 [104.00, 110.00] | 148.00 [145.75, 149.00] | -39.62% | [39.00, 44.00] |
| profile | hudRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |

## svm-step

Workload: bias. Paired comparison.

| Build | Metric | baseline | candidate | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 1819.71 [1702.44, 2980.44] | 1853.64 [1719.47, 3130.40] | -1.86% | [-143.51, 961.85] |
| production | scriptMs | 804.57 [756.66, 1272.30] | 803.58 [758.84, 1335.18] | 0.12% | [-40.25, 386.27] |
| production | layoutMs | 72.71 [67.72, 116.28] | 74.19 [68.37, 126.09] | -2.03% | [-6.30, 36.47] |
| production | styleMs | 515.07 [489.45, 917.38] | 537.38 [491.80, 958.73] | -4.33% | [-51.58, 318.27] |
| production | renderOpportunityP50Ms | 39.75 [37.78, 68.79] | 41.33 [37.85, 70.04] | -3.96% | [-2.57, 23.90] |
| production | renderOpportunityP95Ms | 57.98 [48.29, 84.51] | 53.46 [50.96, 90.63] | 7.78% | [-6.56, 20.49] |
| profile | reactTotalMs | 201.40 [187.07, 219.30] | 197.05 [183.37, 210.45] | 2.16% | [-13.90, 11.15] |
| profile | reactCommits | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | resultsRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |
| profile | visualisationRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | hudRenders | 80.00 [80.00, 80.00] | 80.00 [80.00, 80.00] | 0.00% | [0.00, 0.00] |

## Run audit

Completed trials retain their original harness hash. The timed action and metric collection code did not change across these resumptions. Every compared pair uses the same harness version. Exact harness sources and failed checkpoints are preserved beside the report.

- 2026-10-28T06:42:28.325Z: Wait for the historical configuration UI and navigate through its category and visualization links before initialization. This replaces a flaky network-idle/hash transition outside measurement. Timed actions, metric collection, candidate sources and fixtures are unchanged; restart the interrupted warm-up block. Discarded 5 trials; restarted blocks: svm-step:production.
