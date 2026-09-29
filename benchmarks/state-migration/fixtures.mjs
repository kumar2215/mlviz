// Deliberately independent of either branch and of backend training/randomness.
export const parameters = { feature_x: 0, fit_intercept: true, test_size: 0.2, random_state: 42 };
export function regressionFixture(count = 250) {
  const points = Array.from({ length: count }, (_, i) => {
    const x = -10 + 20 * i / (count - 1);
    return [x, 0.8 * x + 1 + Math.sin(i * 1.7) * 0.7];
  });
  const residuals = points.map(([x, y]) => y - (0.8 * x + 1));
  const mse = residuals.reduce((s, x) => s + x * x, 0) / count;
  const mean = points.reduce((s, p) => s + p[1], 0) / count;
  const variance = points.reduce((s, p) => s + (p[1] - mean) ** 2, 0) / count;
  const metrics = { mse, rmse: Math.sqrt(mse), mae: residuals.reduce((s, x) => s + Math.abs(x), 0) / count, r2: 1 - mse / variance };
  return {
    success: true, points, x_range: [-11, 11], y_range: [-10, 12],
    line: { slope: 0.8, intercept: 1 },
    slider_hints: { intercept_min: -20, intercept_max: 20 },
    metrics: { train: metrics, test: metrics },
    metadata: { feature_names: ["x"], feature_x_name: "x", target_name: "y", n_samples: count, n_features: 1, train_samples: count, test_samples: count },
  };
}

export function routesFor(kind, fixture) {
  const common = { page_type: "dynamic", note: null, dataset: null, parameters };
  const routes = {
    "/api/linear/params": [],
    "/api/linear/train": fixture,
    "/api/linear/visualise": fixture,
  };
  if (kind === "context") {
    routes["/config/config.json"] = {
      datasets: {},
      stories: { benchmark: { name: "benchmark", description: "Benchmark", start_page: 0, nodes: [{ index: "benchmark" }], edges: [] } },
      pages: { benchmark: { ...common, name: "Train: Optimal Line", dynamic_type: "model", model_name: "linear", component_type: "train", problem_type: "regression" } },
    };
  } else {
    routes["/config/config.json"] = { datasets: {}, categories: [{ name: "Benchmark", config_path: "traditional_ml", files: ["linear_regression.json"] }], stories: [] };
    routes["/config/visual/traditional_ml/linear_regression.json"] = {
      display_name: "Benchmark", pages: [{ ...common, name: "LinearRegressionTrain" }], transitions: [],
    };
  }
  return routes;
}
