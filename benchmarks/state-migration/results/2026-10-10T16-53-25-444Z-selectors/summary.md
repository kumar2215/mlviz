# Zustand selector comparison

Baseline: bddf296 @ bddf2967c3bf74ded9a88a2abc2924e914b97583
Candidate: ac889ef @ ac889ef39017e225dcc7884520df8b75919c83c0

20 measured pairs, 3 warm-up pairs per scenario/build; 40 real UI actions per trial; 250 fixture points; CPU 1x. Chrome 154.0.8037.98.

Positive reduction means less work. Values are median [Q25, Q75]. Confidence intervals bootstrap whole paired trials (candidate minus baseline). An interval spanning zero does not establish a direction. Fewer than 20 pairs is only a smoke test.

All 9 selected shared visualization scenarios are paired. The complete selector suite covers all nine pages registered identically in both revisions: decision-tree manual, KNN train/predict, K-means step, linear train/step, and SVM train/predict/step. The five historical modes removed before either revision cannot be compared here. Exact registries for both revisions and the source diff are saved beside this report.

Production task/script/layout/style durations come from CDP and include automation/measurement overhead. React times and component function invocation counts come from separate profiling builds; commits use one root Profiler. D3 work is outside React actualDuration. HUD counts aggregate the mounted model HUDs.

Rendering-opportunity delay is input capture → rAF → setTimeout, not paint latency, INP, FPS, or perceived response time. It is reported only for synchronous controls; asynchronous training/prediction actions have no latency estimate. Fixed API fixtures measure frontend update costs, not backend training or real network latency. The fixtures hold workload size constant and are not estimates of typical user behavior.

This controlled comparison isolates the audited subscription optimization package: field selectors, shallow derived-array selectors, and reactive mode subscriptions. Store implementations, D3 renderers, dependencies, public configuration and backend are identical. Both versions already use Zustand, so this does not measure Context versus Zustand. Work totals and rendering-opportunity estimates do not establish perceived speed. Intervals are per metric, without multiple-comparison correction; isolated significant changes are exploratory.

## decision-tree-manual

Workload: threshold. Paired comparison.

| Build | Metric | baseline | candidate | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 1116.70 [999.38, 1213.24] | 1054.67 [972.57, 1182.65] | 5.55% | [-160.99, 63.45] |
| production | scriptMs | 582.41 [518.47, 620.52] | 548.02 [503.40, 614.77] | 5.91% | [-83.87, 32.41] |
| production | layoutMs | 89.40 [80.66, 97.52] | 84.02 [76.21, 95.54] | 6.02% | [-15.73, 5.66] |
| production | styleMs | 105.85 [92.57, 112.50] | 97.69 [89.71, 106.35] | 7.70% | [-15.48, 0.46] |
| production | renderOpportunityP50Ms | 25.92 [23.44, 28.50] | 24.52 [22.99, 27.99] | 5.40% | [-3.55, 1.78] |
| production | renderOpportunityP95Ms | 31.84 [30.91, 33.48] | 31.91 [30.63, 34.21] | -0.20% | [-1.44, 2.29] |
| profile | reactTotalMs | 211.80 [203.50, 213.58] | 220.50 [211.88, 233.85] | -4.11% | [1.10, 23.95] |
| profile | reactCommits | 80.00 [80.00, 80.00] | 80.00 [80.00, 80.00] | 0.00% | [0.00, 0.00] |
| profile | resultsRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | visualisationRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | hudRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |

## knn-train

Workload: train. Paired comparison.

| Build | Metric | baseline | candidate | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 9422.71 [9267.23, 10507.53] | 9076.62 [8570.39, 9831.36] | 3.67% | [-1026.99, 145.82] |
| production | scriptMs | 3506.74 [3491.77, 3939.85] | 3361.74 [3227.72, 3722.40] | 4.13% | [-349.29, 125.60] |
| production | layoutMs | 354.75 [344.31, 391.24] | 282.83 [267.76, 305.45] | 20.27% | [-98.48, -54.84] |
| production | styleMs | 1063.57 [1033.45, 1207.88] | 985.80 [942.97, 1081.97] | 7.31% | [-160.76, 2.24] |
| profile | reactTotalMs | 510.50 [487.38, 530.23] | 491.75 [463.33, 510.50] | 3.67% | [-46.35, 8.96] |
| profile | reactCommits | 228.00 [226.00, 230.00] | 193.00 [192.00, 194.25] | 15.35% | [-36.50, -32.50] |
| profile | resultsRenders | 150.50 [150.00, 151.00] | 151.00 [150.00, 152.00] | -0.33% | [-0.50, 1.00] |
| profile | visualisationRenders | 150.50 [150.00, 151.00] | 151.00 [150.00, 152.00] | -0.33% | [-0.50, 1.00] |
| profile | hudRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |

## knn-predict

Workload: predict. Paired comparison.

| Build | Metric | baseline | candidate | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 10385.62 [10084.86, 10873.86] | 10835.17 [9438.08, 12646.03] | -4.33% | [-976.47, 1704.17] |
| production | scriptMs | 3608.64 [3348.69, 3717.89] | 3734.63 [3275.15, 4383.66] | -3.49% | [-352.94, 646.34] |
| production | layoutMs | 297.00 [288.76, 307.50] | 311.25 [263.35, 356.42] | -4.80% | [-31.79, 50.33] |
| production | styleMs | 1252.90 [1216.97, 1296.15] | 1346.74 [1129.80, 1505.55] | -7.49% | [-115.66, 226.82] |
| profile | reactTotalMs | 179.30 [168.58, 197.50] | 181.15 [174.12, 194.70] | -1.03% | [-13.75, 12.15] |
| profile | reactCommits | 182.00 [179.00, 184.25] | 180.00 [178.75, 183.00] | 1.10% | [-4.00, 2.00] |
| profile | resultsRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |
| profile | visualisationRenders | 114.00 [113.00, 115.25] | 114.50 [113.75, 115.00] | -0.44% | [-1.00, 2.00] |
| profile | hudRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |

## kmeans-step

Workload: centroid. Paired comparison.

| Build | Metric | baseline | candidate | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 2444.03 [2181.68, 2617.84] | 2571.27 [2307.84, 2708.64] | -5.21% | [-89.32, 342.21] |
| production | scriptMs | 721.55 [658.11, 762.98] | 752.71 [673.33, 808.18] | -4.32% | [-43.96, 103.24] |
| production | layoutMs | 130.02 [119.92, 141.31] | 138.35 [123.94, 152.20] | -6.40% | [-5.98, 20.17] |
| production | styleMs | 430.07 [393.76, 466.78] | 446.20 [404.08, 485.00] | -3.75% | [-18.91, 57.22] |
| production | renderOpportunityP50Ms | 42.55 [38.86, 46.99] | 43.70 [40.99, 47.33] | -2.70% | [-3.18, 5.40] |
| production | renderOpportunityP95Ms | 56.44 [51.85, 60.56] | 55.45 [53.70, 58.10] | 1.76% | [-4.21, 2.97] |
| profile | reactTotalMs | 67.35 [63.32, 70.08] | 65.55 [63.85, 69.37] | 2.67% | [-3.45, 1.75] |
| profile | reactCommits | 60.00 [60.00, 60.00] | 60.00 [60.00, 60.00] | 0.00% | [0.00, 0.00] |
| profile | resultsRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |
| profile | visualisationRenders | 60.00 [60.00, 60.00] | 60.00 [60.00, 60.00] | 0.00% | [0.00, 0.00] |
| profile | hudRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |

## linear-train

Workload: intercept. Paired comparison.

| Build | Metric | baseline | candidate | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 2703.02 [2221.93, 3366.86] | 2642.87 [2151.18, 2979.18] | 2.23% | [-534.91, 377.79] |
| production | scriptMs | 1092.80 [893.47, 1333.69] | 1059.72 [898.95, 1182.88] | 3.03% | [-218.29, 134.67] |
| production | layoutMs | 157.86 [129.71, 192.70] | 133.97 [108.50, 144.22] | 15.13% | [-50.78, -0.27] |
| production | styleMs | 491.77 [402.57, 593.29] | 484.55 [386.34, 561.74] | 1.47% | [-86.71, 75.95] |
| production | renderOpportunityP50Ms | 82.83 [77.11, 94.12] | 81.13 [75.38, 84.00] | 2.05% | [-9.20, 2.12] |
| production | renderOpportunityP95Ms | 181.15 [135.61, 195.79] | 186.25 [142.71, 203.95] | -2.82% | [-7.50, 45.42] |
| profile | reactTotalMs | 150.65 [139.90, 155.90] | 59.55 [53.30, 63.40] | 60.47% | [-99.30, -84.15] |
| profile | reactCommits | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | resultsRenders | 40.00 [40.00, 40.00] | 0.00 [0.00, 0.00] | 100.00% | [-40.00, -40.00] |
| profile | visualisationRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | hudRenders | 80.00 [80.00, 80.00] | 80.00 [80.00, 80.00] | 0.00% | [0.00, 0.00] |

## linear-step

Workload: intercept. Paired comparison.

| Build | Metric | baseline | candidate | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 2638.49 [2460.17, 2869.51] | 2496.27 [2355.24, 2586.11] | 5.39% | [-355.45, 16.10] |
| production | scriptMs | 941.33 [864.45, 1000.08] | 879.66 [857.58, 918.63] | 6.55% | [-104.13, 13.92] |
| production | layoutMs | 206.52 [190.63, 217.34] | 193.45 [185.55, 200.47] | 6.33% | [-23.72, 4.56] |
| production | styleMs | 463.66 [433.44, 488.09] | 443.92 [424.96, 453.56] | 4.26% | [-45.92, 5.66] |
| production | renderOpportunityP50Ms | 66.20 [62.20, 69.80] | 62.98 [60.63, 64.24] | 4.87% | [-6.77, -0.07] |
| production | renderOpportunityP95Ms | 114.75 [109.17, 120.56] | 111.48 [104.10, 112.74] | 2.85% | [-9.73, 1.78] |
| profile | reactTotalMs | 75.10 [70.80, 80.17] | 70.30 [66.32, 79.43] | 6.39% | [-8.50, 4.70] |
| profile | reactCommits | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | resultsRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |
| profile | visualisationRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | hudRenders | 120.00 [120.00, 120.00] | 120.00 [120.00, 120.00] | 0.00% | [0.00, 0.00] |

## svm-train

Workload: train. Paired comparison.

| Build | Metric | baseline | candidate | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 12518.67 [10749.08, 15029.17] | 13520.41 [10741.81, 15749.19] | -8.00% | [-1284.73, 2067.26] |
| production | scriptMs | 5003.11 [4249.74, 5777.20] | 5292.35 [4218.44, 5807.80] | -5.78% | [-548.67, 784.05] |
| production | layoutMs | 534.11 [464.53, 629.35] | 475.87 [397.12, 523.81] | 10.90% | [-142.71, -13.25] |
| production | styleMs | 2197.82 [1918.39, 2651.98] | 2336.32 [1854.72, 2447.42] | -6.30% | [-275.35, 268.71] |
| profile | reactTotalMs | 762.40 [707.05, 796.85] | 732.55 [681.72, 774.05] | 3.92% | [-82.31, 8.40] |
| profile | reactCommits | 229.00 [228.00, 230.25] | 192.00 [191.00, 194.25] | 16.16% | [-38.00, -34.50] |
| profile | resultsRenders | 148.50 [147.00, 150.00] | 148.00 [147.00, 150.00] | 0.34% | [-2.00, 2.00] |
| profile | visualisationRenders | 148.50 [147.00, 150.00] | 148.00 [147.00, 150.00] | 0.34% | [-2.00, 2.00] |
| profile | hudRenders | 106.50 [104.75, 108.00] | 106.00 [105.00, 108.00] | 0.47% | [-2.00, 2.00] |

## svm-predict

Workload: predict. Paired comparison.

| Build | Metric | baseline | candidate | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 8207.50 [7942.36, 8571.21] | 8315.67 [7792.52, 8727.11] | -1.32% | [-376.48, 542.87] |
| production | scriptMs | 3524.46 [3379.66, 3657.82] | 3599.67 [3360.30, 3721.87] | -2.13% | [-120.26, 182.31] |
| production | layoutMs | 440.20 [405.41, 456.45] | 442.57 [411.85, 470.14] | -0.54% | [-26.55, 40.62] |
| production | styleMs | 1193.50 [1130.34, 1246.43] | 1227.23 [1154.56, 1279.43] | -2.83% | [-48.95, 100.21] |
| profile | reactTotalMs | 163.05 [154.48, 172.03] | 154.95 [146.00, 160.90] | 4.97% | [-19.10, 1.45] |
| profile | reactCommits | 194.00 [193.00, 195.00] | 226.00 [225.00, 227.25] | -16.49% | [31.00, 34.00] |
| profile | resultsRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |
| profile | visualisationRenders | 150.00 [148.75, 151.00] | 149.00 [148.75, 150.00] | 0.67% | [-2.00, 1.00] |
| profile | hudRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |

## svm-step

Workload: bias. Paired comparison.

| Build | Metric | baseline | candidate | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 8003.49 [7674.81, 8141.37] | 7551.65 [7146.34, 8114.93] | 5.65% | [-855.95, 137.54] |
| production | scriptMs | 3355.33 [3198.43, 3407.71] | 3161.79 [3020.06, 3387.19] | 5.77% | [-345.61, 27.23] |
| production | layoutMs | 287.69 [270.13, 301.11] | 271.75 [253.80, 295.85] | 5.54% | [-34.64, 8.32] |
| production | styleMs | 2617.82 [2514.56, 2682.97] | 2498.91 [2381.68, 2667.68] | 4.54% | [-250.77, 30.64] |
| production | renderOpportunityP50Ms | 189.25 [183.13, 192.75] | 179.05 [169.72, 187.24] | 5.39% | [-16.50, -1.55] |
| production | renderOpportunityP95Ms | 239.07 [228.97, 251.21] | 234.48 [225.15, 243.28] | 1.92% | [-15.46, 7.10] |
| profile | reactTotalMs | 347.00 [330.43, 365.35] | 343.25 [326.23, 358.85] | 1.08% | [-23.00, 14.95] |
| profile | reactCommits | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | resultsRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |
| profile | visualisationRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | hudRenders | 80.00 [80.00, 80.00] | 80.00 [80.00, 80.00] | 0.00% | [0.00, 0.00] |
