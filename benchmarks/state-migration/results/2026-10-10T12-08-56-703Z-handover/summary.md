# Handover visualization comparison

Baseline: handover @ a02cc25c307510a289f4ff06b34379f49fbbfc83
Candidate: e2ead6e031e75d1d9ccaaa1acf2c1b2e1a52411b @ e2ead6e031e75d1d9ccaaa1acf2c1b2e1a52411b

20 measured pairs, 3 warm-up pairs per scenario/build; 40 real UI actions per trial; 250 fixture points; CPU 1x. Chrome 154.0.8037.98.

Positive reduction means less work. Values are median [Q25, Q75]. Confidence intervals bootstrap whole paired trials (candidate minus baseline). An interval spanning zero does not establish a direction. Fewer than 20 pairs is only a smoke test.

All 14 registered handover visualizations are covered: 12 model/mode combinations in the default config (15 pages), plus 2 registered prediction modes not linked there. Duplicate pages are measured once. Five modes have no current counterpart and receive baseline-only measurements; there is no invented percentage for them. Deprecated decision-tree components and the unregistered KNN learning component cannot be reached through the historical app registry and are excluded. Viz-only dispatch reuses training components. Exact historical config and registry sources are saved beside this report.

Production task/script/layout/style durations come from CDP and include automation/measurement overhead. React times and component function invocation counts come from separate profiling builds; commits use one root Profiler. D3 work is outside React actualDuration. HUD counts aggregate the mounted model HUDs.

Rendering-opportunity delay is input capture → rAF → setTimeout, not paint latency, INP, FPS, or perceived response time. It is reported only for synchronous controls; asynchronous training/prediction actions have no latency estimate. Fixed API fixtures measure frontend update costs, not backend training or real network latency. The fixtures hold workload size constant and are not estimates of typical user behavior.

This compares whole revisions, including layout, renderer, routing, dependency and other refactor differences. It cannot isolate Zustand as the cause. Intervals are per metric, without multiple-comparison correction; isolated significant changes are exploratory.

## decision-tree-train

Workload: train. Removed from candidate registry; baseline only.

| Build | Metric | handover | test-benchmark | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 1166.47 [971.99, 1341.65] | not available | n/a | n/a |
| production | scriptMs | 371.33 [313.32, 436.51] | not available | n/a | n/a |
| production | layoutMs | 65.20 [53.67, 76.73] | not available | n/a | n/a |
| production | styleMs | 83.49 [68.12, 95.65] | not available | n/a | n/a |
| profile | reactTotalMs | 269.40 [240.33, 298.70] | not available | n/a | n/a |
| profile | reactCommits | 125.00 [124.00, 128.00] | not available | n/a | n/a |
| profile | resultsRenders | 100.00 [98.75, 102.00] | not available | n/a | n/a |
| profile | visualisationRenders | 123.00 [122.00, 124.00] | not available | n/a | n/a |
| profile | hudRenders | 0.00 [0.00, 0.00] | not available | n/a | n/a |

## decision-tree-predict

Workload: predict. Removed from candidate registry; baseline only.

| Build | Metric | handover | test-benchmark | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 2222.99 [1868.16, 2455.95] | not available | n/a | n/a |
| production | scriptMs | 648.92 [544.27, 709.57] | not available | n/a | n/a |
| production | layoutMs | 203.21 [163.50, 228.92] | not available | n/a | n/a |
| production | styleMs | 152.29 [127.12, 174.37] | not available | n/a | n/a |
| profile | reactTotalMs | 198.90 [189.93, 214.40] | not available | n/a | n/a |
| profile | reactCommits | 280.00 [275.00, 282.00] | not available | n/a | n/a |
| profile | resultsRenders | 0.00 [0.00, 0.00] | not available | n/a | n/a |
| profile | visualisationRenders | 237.50 [232.75, 240.00] | not available | n/a | n/a |
| profile | hudRenders | 0.00 [0.00, 0.00] | not available | n/a | n/a |

## decision-tree-manual

Workload: threshold. Paired comparison.

| Build | Metric | handover | test-benchmark | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 656.63 [632.57, 716.09] | 665.43 [642.10, 796.63] | -1.34% | [-33.26, 85.32] |
| production | scriptMs | 327.00 [314.97, 362.60] | 342.15 [329.11, 414.63] | -4.63% | [-10.22, 57.81] |
| production | layoutMs | 53.94 [51.66, 59.83] | 52.07 [49.09, 61.26] | 3.48% | [-6.94, 4.44] |
| production | styleMs | 60.24 [57.04, 66.28] | 60.12 [56.41, 73.22] | 0.20% | [-5.02, 6.71] |
| production | renderOpportunityP50Ms | 17.30 [16.57, 17.94] | 16.67 [16.50, 19.09] | 3.61% | [-0.98, 0.85] |
| production | renderOpportunityP95Ms | 22.02 [21.32, 24.46] | 23.30 [21.31, 27.21] | -5.82% | [-1.22, 3.44] |
| profile | reactTotalMs | 197.50 [190.10, 203.10] | 212.05 [198.25, 218.82] | -7.37% | [4.70, 19.90] |
| profile | reactCommits | 80.00 [80.00, 80.00] | 80.00 [80.00, 80.00] | 0.00% | [0.00, 0.00] |
| profile | resultsRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | visualisationRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | hudRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |

## knn-train

Workload: train. Paired comparison.

| Build | Metric | handover | test-benchmark | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 6281.13 [6099.77, 6746.54] | 7337.81 [7151.39, 7438.85] | -16.82% | [656.79, 1214.23] |
| production | scriptMs | 2496.64 [2373.35, 2593.42] | 2777.11 [2712.74, 2869.43] | -11.23% | [182.63, 398.51] |
| production | layoutMs | 167.25 [156.52, 175.83] | 232.68 [223.79, 235.66] | -39.11% | [56.64, 75.79] |
| production | styleMs | 756.82 [717.87, 797.40] | 811.18 [777.19, 845.97] | -7.18% | [15.81, 91.71] |
| profile | reactTotalMs | 258.75 [244.87, 288.77] | 371.40 [361.97, 390.20] | -43.54% | [85.95, 133.10] |
| profile | reactCommits | 110.00 [109.00, 112.25] | 191.50 [190.00, 192.25] | -74.09% | [79.00, 83.00] |
| profile | resultsRenders | 106.00 [103.00, 108.25] | 149.50 [148.00, 150.00] | -41.04% | [41.00, 46.50] |
| profile | visualisationRenders | 106.00 [103.00, 108.25] | 149.50 [148.00, 150.00] | -41.04% | [41.00, 46.50] |
| profile | hudRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |

## knn-predict

Workload: predict. Paired comparison.

| Build | Metric | handover | test-benchmark | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 8261.22 [8083.36, 8501.21] | 8580.99 [8081.57, 9077.83] | -3.87% | [-180.08, 775.71] |
| production | scriptMs | 3398.76 [3300.98, 3482.36] | 2952.14 [2825.05, 3233.60] | 13.14% | [-589.28, -190.46] |
| production | layoutMs | 241.98 [235.47, 252.84] | 244.63 [230.69, 262.62] | -1.10% | [-13.69, 16.86] |
| production | styleMs | 1003.79 [972.97, 1048.59] | 1012.12 [955.35, 1131.32] | -0.83% | [-57.01, 100.52] |
| profile | reactTotalMs | 145.45 [136.48, 151.75] | 145.45 [139.05, 167.77] | -0.00% | [-6.40, 14.10] |
| profile | reactCommits | 185.50 [183.00, 189.25] | 181.00 [178.00, 183.00] | 2.43% | [-8.50, -2.00] |
| profile | resultsRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |
| profile | visualisationRenders | 110.00 [108.75, 111.25] | 112.00 [111.00, 113.00] | -1.82% | [1.00, 3.50] |
| profile | hudRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |

## kmeans-train

Workload: centroid. Removed from candidate registry; baseline only.

| Build | Metric | handover | test-benchmark | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 1670.19 [1614.64, 2269.27] | not available | n/a | n/a |
| production | scriptMs | 619.31 [582.16, 850.08] | not available | n/a | n/a |
| production | layoutMs | 101.77 [97.20, 139.90] | not available | n/a | n/a |
| production | styleMs | 248.67 [239.24, 353.64] | not available | n/a | n/a |
| production | renderOpportunityP50Ms | 39.40 [35.43, 50.23] | not available | n/a | n/a |
| production | renderOpportunityP95Ms | 66.42 [59.57, 85.25] | not available | n/a | n/a |
| profile | reactTotalMs | 69.05 [65.60, 73.07] | not available | n/a | n/a |
| profile | reactCommits | 40.00 [40.00, 40.00] | not available | n/a | n/a |
| profile | resultsRenders | 0.00 [0.00, 0.00] | not available | n/a | n/a |
| profile | visualisationRenders | 40.00 [40.00, 40.00] | not available | n/a | n/a |
| profile | hudRenders | 40.00 [40.00, 40.00] | not available | n/a | n/a |

## kmeans-predict

Workload: predict. Removed from candidate registry; baseline only.

| Build | Metric | handover | test-benchmark | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 3689.76 [3354.91, 4123.41] | not available | n/a | n/a |
| production | scriptMs | 1153.08 [1023.76, 1303.20] | not available | n/a | n/a |
| production | layoutMs | 217.44 [203.72, 254.04] | not available | n/a | n/a |
| production | styleMs | 511.86 [476.33, 579.82] | not available | n/a | n/a |
| profile | reactTotalMs | 145.20 [135.30, 152.97] | not available | n/a | n/a |
| profile | reactCommits | 186.50 [186.00, 188.00] | not available | n/a | n/a |
| profile | resultsRenders | 0.00 [0.00, 0.00] | not available | n/a | n/a |
| profile | visualisationRenders | 107.00 [105.75, 107.00] | not available | n/a | n/a |
| profile | hudRenders | 0.00 [0.00, 0.00] | not available | n/a | n/a |

## kmeans-step

Workload: centroid. Paired comparison.

| Build | Metric | handover | test-benchmark | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 1721.67 [1513.59, 1929.15] | 1688.03 [1475.62, 1904.64] | 1.95% | [-228.29, 172.66] |
| production | scriptMs | 528.68 [463.02, 576.96] | 513.90 [448.88, 579.24] | 2.80% | [-68.90, 61.09] |
| production | layoutMs | 94.64 [82.30, 108.30] | 88.51 [78.42, 103.76] | 6.48% | [-18.53, 6.35] |
| production | styleMs | 306.00 [270.09, 346.96] | 294.66 [266.94, 347.50] | 3.71% | [-40.26, 28.00] |
| production | renderOpportunityP50Ms | 29.58 [26.14, 37.25] | 30.32 [26.53, 33.50] | -2.54% | [-5.72, 3.88] |
| production | renderOpportunityP95Ms | 50.43 [41.63, 62.16] | 46.92 [38.10, 53.66] | 6.97% | [-16.45, 7.11] |
| profile | reactTotalMs | 64.00 [57.50, 71.45] | 65.70 [60.40, 70.03] | -2.66% | [-4.10, 7.30] |
| profile | reactCommits | 40.00 [40.00, 40.00] | 60.00 [60.00, 60.00] | -50.00% | [20.00, 20.00] |
| profile | resultsRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |
| profile | visualisationRenders | 40.00 [40.00, 40.00] | 60.00 [60.00, 60.00] | -50.00% | [20.00, 20.00] |
| profile | hudRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |

## linear-train

Workload: intercept. Paired comparison.

| Build | Metric | handover | test-benchmark | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 1948.42 [1884.09, 2650.35] | 1872.00 [1834.54, 2738.86] | 3.92% | [-491.56, 481.01] |
| production | scriptMs | 791.86 [776.66, 1072.61] | 764.08 [745.76, 1078.58] | 3.51% | [-181.70, 177.41] |
| production | layoutMs | 93.75 [89.59, 131.24] | 90.69 [88.33, 140.73] | 3.26% | [-24.84, 25.69] |
| production | styleMs | 333.31 [324.35, 476.23] | 335.41 [327.17, 492.94] | -0.63% | [-84.85, 99.38] |
| production | renderOpportunityP50Ms | 66.15 [54.41, 78.89] | 70.18 [58.85, 76.20] | -6.08% | [-7.55, 13.62] |
| production | renderOpportunityP95Ms | 119.81 [105.47, 163.94] | 110.19 [105.88, 175.39] | 8.03% | [-35.48, 35.33] |
| profile | reactTotalMs | 119.00 [105.85, 129.40] | 60.85 [54.55, 63.40] | 48.87% | [-66.75, -49.25] |
| profile | reactCommits | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | resultsRenders | 40.00 [40.00, 40.00] | 0.00 [0.00, 0.00] | 100.00% | [-40.00, -40.00] |
| profile | visualisationRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | hudRenders | 80.00 [80.00, 80.00] | 80.00 [80.00, 80.00] | 0.00% | [0.00, 0.00] |

## linear-step

Workload: intercept. Paired comparison.

| Build | Metric | handover | test-benchmark | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 1898.10 [1601.49, 2309.44] | 1750.58 [1532.90, 2285.07] | 7.77% | [-365.42, 144.49] |
| production | scriptMs | 676.55 [567.00, 824.18] | 626.93 [561.87, 787.08] | 7.33% | [-129.74, 57.47] |
| production | layoutMs | 146.71 [126.10, 180.66] | 138.28 [118.28, 177.02] | 5.75% | [-30.89, 11.00] |
| production | styleMs | 320.75 [276.56, 403.70] | 305.60 [259.60, 399.03] | 4.72% | [-73.52, 27.50] |
| production | renderOpportunityP50Ms | 53.60 [46.35, 59.84] | 51.35 [42.16, 61.58] | 4.20% | [-8.48, 3.25] |
| production | renderOpportunityP95Ms | 86.63 [71.31, 97.59] | 79.23 [65.03, 97.21] | 8.55% | [-18.62, 9.37] |
| profile | reactTotalMs | 86.90 [82.47, 88.73] | 77.70 [74.45, 84.15] | 10.59% | [-11.30, -2.80] |
| profile | reactCommits | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | resultsRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |
| profile | visualisationRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | hudRenders | 120.00 [120.00, 120.00] | 120.00 [120.00, 120.00] | 0.00% | [0.00, 0.00] |

## linear-predict

Workload: predict. Removed from candidate registry; baseline only.

| Build | Metric | handover | test-benchmark | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 3727.06 [3043.62, 5472.95] | not available | n/a | n/a |
| production | scriptMs | 1124.94 [907.98, 1609.28] | not available | n/a | n/a |
| production | layoutMs | 232.08 [190.12, 323.06] | not available | n/a | n/a |
| production | styleMs | 548.57 [435.77, 742.96] | not available | n/a | n/a |
| profile | reactTotalMs | 110.85 [98.75, 116.95] | not available | n/a | n/a |
| profile | reactCommits | 113.00 [112.00, 113.00] | not available | n/a | n/a |
| profile | resultsRenders | 0.00 [0.00, 0.00] | not available | n/a | n/a |
| profile | visualisationRenders | 68.00 [66.75, 69.00] | not available | n/a | n/a |
| profile | hudRenders | 0.00 [0.00, 0.00] | not available | n/a | n/a |

## svm-train

Workload: train. Paired comparison.

| Build | Metric | handover | test-benchmark | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 6404.38 [6123.37, 9391.10] | 7853.01 [7392.07, 12617.92] | -22.62% | [494.93, 4712.23] |
| production | scriptMs | 2316.80 [2193.01, 3318.29] | 3094.98 [2905.00, 4545.73] | -33.59% | [462.92, 1628.07] |
| production | layoutMs | 195.79 [184.71, 284.21] | 297.87 [272.14, 388.91] | -52.14% | [69.53, 153.18] |
| production | styleMs | 1188.38 [1126.59, 1666.72] | 1381.32 [1276.86, 1924.73] | -16.24% | [-17.69, 420.14] |
| profile | reactTotalMs | 610.90 [586.68, 640.60] | 775.60 [736.80, 834.25] | -26.96% | [123.85, 200.46] |
| profile | reactCommits | 145.00 [144.00, 147.75] | 193.00 [191.00, 194.00] | -33.10% | [46.00, 49.00] |
| profile | resultsRenders | 108.00 [107.00, 110.00] | 149.50 [149.00, 151.00] | -38.43% | [40.00, 43.00] |
| profile | visualisationRenders | 108.00 [107.00, 110.00] | 149.50 [149.00, 151.00] | -38.43% | [40.00, 43.00] |
| profile | hudRenders | 66.50 [64.00, 67.00] | 107.50 [106.00, 108.25] | -61.65% | [39.50, 43.00] |

## svm-predict

Workload: predict. Paired comparison.

| Build | Metric | handover | test-benchmark | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 4610.82 [4422.39, 5049.76] | 5188.81 [4976.90, 6192.87] | -12.54% | [119.71, 1427.96] |
| production | scriptMs | 1703.77 [1641.19, 1861.47] | 2204.03 [2112.12, 2670.32] | -29.36% | [319.70, 898.55] |
| production | layoutMs | 271.77 [257.80, 291.83] | 281.08 [263.38, 333.38] | -3.43% | [-14.12, 55.40] |
| production | styleMs | 745.47 [711.94, 814.38] | 754.54 [719.78, 905.20] | -1.22% | [-68.10, 155.93] |
| profile | reactTotalMs | 148.00 [139.87, 154.85] | 177.35 [164.22, 192.00] | -19.83% | [16.55, 45.30] |
| profile | reactCommits | 155.50 [154.00, 156.00] | 228.50 [226.75, 230.25] | -46.95% | [72.00, 75.00] |
| profile | resultsRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |
| profile | visualisationRenders | 109.00 [108.00, 110.25] | 151.00 [148.00, 152.00] | -38.53% | [39.00, 43.00] |
| profile | hudRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |

## svm-step

Workload: bias. Paired comparison.

| Build | Metric | handover | test-benchmark | Reduction | 95% CI Δ |
|---|---|---:|---:|---:|---:|
| production | taskMs | 4277.62 [4089.68, 4685.59] | 4314.49 [4180.89, 4710.60] | -0.86% | [-148.11, 235.13] |
| production | scriptMs | 1792.23 [1740.32, 1945.83] | 1810.36 [1750.91, 1974.30] | -1.01% | [-71.41, 78.99] |
| production | layoutMs | 151.02 [146.55, 168.62] | 150.71 [146.40, 165.34] | 0.20% | [-9.10, 9.49] |
| production | styleMs | 1393.27 [1350.91, 1561.41] | 1416.61 [1376.60, 1545.67] | -1.68% | [-61.16, 87.28] |
| production | renderOpportunityP50Ms | 104.02 [101.81, 113.55] | 103.60 [101.70, 114.48] | 0.41% | [-4.43, 4.83] |
| production | renderOpportunityP95Ms | 142.00 [131.69, 173.23] | 134.93 [129.69, 154.33] | 4.98% | [-24.85, 7.53] |
| profile | reactTotalMs | 356.55 [348.15, 373.10] | 354.65 [345.27, 364.08] | 0.53% | [-14.70, 9.50] |
| profile | reactCommits | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | resultsRenders | 0.00 [0.00, 0.00] | 0.00 [0.00, 0.00] | n/a | [0.00, 0.00] |
| profile | visualisationRenders | 40.00 [40.00, 40.00] | 40.00 [40.00, 40.00] | 0.00% | [0.00, 0.00] |
| profile | hudRenders | 80.00 [80.00, 80.00] | 80.00 [80.00, 80.00] | 0.00% | [0.00, 0.00] |

## Run audit

Completed trials retain their original harness hash. The timed action and metric collection code did not change across these resumptions. Every compared pair uses the same harness version. Exact harness sources and failed checkpoints are preserved beside the report.

- 2026-10-10T12:55:49.455Z: K-means placement readiness must be awaited before measuring; the measured action and metrics are unchanged. Incomplete pairs are repeated together. Discarded 11 trials; restarted blocks: kmeans-step:production.
- 2026-10-10T13:50:52.137Z: Checkpoint persistence stopped on a transient Windows UNKNOWN open error. Atomic replacement and bounded retries were added between trials; timed actions and metrics are unchanged. Discarded 0 trials; restarted blocks: none.
