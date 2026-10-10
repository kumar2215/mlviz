import { regressionFixture, parameters } from './fixtures.mjs';

// Unique dynamic model/mode combinations in handover's default config.
// Duplicate story pages share a component and are measured once.
export const scenarios = [
  { id: 'decision-tree-train', model: 'decision_tree', mode: 'train', page: null, action: 'train' },
  { id: 'decision-tree-predict', model: 'decision_tree', mode: 'predict', page: null, action: 'predict' },
  { id: 'decision-tree-manual', model: 'decision_tree', mode: 'manual', page: 'DecisionTree', action: 'threshold' },
  { id: 'knn-train', model: 'knn', mode: 'train', page: 'KNNTrain', action: 'train' },
  { id: 'knn-predict', model: 'knn', mode: 'predict', page: 'KNNPredict', action: 'predict' },
  { id: 'kmeans-train', model: 'kmeans', mode: 'train', page: null, action: 'centroid' },
  { id: 'kmeans-predict', model: 'kmeans', mode: 'predict', page: null, action: 'predict', dispatchOnly: true },
  { id: 'kmeans-step', model: 'kmeans', mode: 'step', page: 'KMeansStep', action: 'centroid' },
  { id: 'linear-train', model: 'linear', mode: 'train', page: 'LinearRegressionTrain', action: 'intercept' },
  { id: 'linear-step', model: 'linear', mode: 'step', page: 'LinearRegressionStep', action: 'intercept' },
  { id: 'linear-predict', model: 'linear', mode: 'predict', page: null, action: 'predict', localPrediction: true, dispatchOnly: true },
  { id: 'svm-train', model: 'svm', mode: 'train', page: 'SVMTrain', action: 'train' },
  { id: 'svm-predict', model: 'svm', mode: 'predict', page: 'SVMPredict', action: 'predict' },
  { id: 'svm-step', model: 'svm', mode: 'step', page: 'SVMStep', action: 'bias' },
];

export function fixtures(count) {
  const points = Array.from({ length: count }, (_, i) => [
    -4 + 8 * i / (count - 1), Math.sin(i * 1.7) * 2 + (i < count / 2 ? -1 : 1),
  ]);
  const labels = points.map(p => p[0] <= 0 ? 0 : 1);
  const names = ['Class 0', 'Class 1'];
  const metadata = { feature_names: ['x', 'y'], class_names: names, feature_x_name: 'x', feature_y_name: 'y', n_samples: count, n_features: 2, train_samples: count, test_samples: count };
  const metric = { confusion_matrix: [[Math.ceil(count / 2), 0], [0, Math.floor(count / 2)]], accuracy: 1, precision: 1, recall: 1, f1: 1 };
  const metrics = { train: metric, test: metric };
  const mesh_points = Array.from({ length: 400 }, (_, i) => [-5 + 10 * (i % 20) / 19, -4 + 8 * Math.floor(i / 20) / 19]);
  const boundary = { mesh_points, predictions: mesh_points.map(p => names[p[0] <= 0 ? 0 : 1]), grid_shape: [20, 20] };
  const knn = {
    success: true, training_points: points, training_labels: labels.map(i => names[i]),
    distance_matrix: points.map(a => points.map(b => Math.hypot(a[0] - b[0], a[1] - b[1]))),
    neighbor_indices: points.map((a, i) => points.map((b, j) => ({ j, d: Math.hypot(a[0] - b[0], a[1] - b[1]) })).filter(p => p.j !== i).sort((a, b) => a.d - b.d).slice(0, 5).map(p => p.j)),
    decision_boundary: boundary, metadata, metrics, visualisation_feature_indices: [0, 1], visualisation_feature_names: ['x', 'y'],
  };
  const leaf = (value, samples) => ({ type: 'leaf', samples, impurity: 0, value: [value] });
  const dt = { success: true, model_key: 'benchmark-tree', cached: false, metadata, metrics,
    tree: { type: 'split', feature: 'x', feature_index: 0, threshold: 0, samples: count, impurity: 0.5, value: [[0.5, 0.5]], left: leaf([1, 0], Math.ceil(count / 2)), right: leaf([0, 1], Math.floor(count / 2)) } };
  const histogram = { bins: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5], counts_by_class: Object.fromEntries(names.map(name => [name, Array(10).fill(0)])), feature_values: points.map(p => p[0]), class_labels: labels, threshold: null, total_samples: count };
  points.forEach((p, i) => histogram.counts_by_class[names[labels[i]]][Math.min(9, Math.max(0, Math.floor(p[0] + 5)))]++);
  const nodeStats = indices => {
    const counts = [0, 0]; indices.forEach(i => counts[labels[i]]++);
    const proportions = counts.map(n => indices.length ? n / indices.length : 0);
    return { samples: indices.length, impurity: indices.length ? 1 - proportions.reduce((s, p) => s + p * p, 0) : 0, value: [proportions], class_distribution: counts };
  };
  const thresholds = Array.from({ length: 99 }, (_, i) => {
    const threshold = Number((-4.9 + i * 0.1).toFixed(1));
    const left_samples_mask = points.flatMap((p, j) => p[0] <= threshold ? [j] : []);
    const right_samples_mask = points.flatMap((p, j) => p[0] > threshold ? [j] : []);
    const left_stats = nodeStats(left_samples_mask), right_stats = nodeStats(right_samples_mask);
    const parent_stats = nodeStats(points.map((_, j) => j));
    const weighted_impurity = (left_stats.samples * left_stats.impurity + right_stats.samples * right_stats.impurity) / count;
    const information_gain = parent_stats.impurity - weighted_impurity;
    return { threshold, information_gain, left_samples_mask, right_samples_mask, split_stats: { parent_stats, left_stats, right_stats, information_gain, weighted_impurity } };
  });
  const featureStats = { feature: 'x', feature_index: 0, thresholds, best_threshold: 0, best_threshold_index: 49, feature_range: [-5, 5], histogram_data: histogram, total_unique_values: count, returned_threshold_count: thresholds.length, available_features: ['x', 'y'], class_names: names };
  const centroids = [[-2, -1], [2, 1]];
  const iteration = { iteration: 0, centroids, new_centroids: centroids, assignments: labels, centroid_shifts: [0, 0], converged: true, cluster_info: [] };
  const kmeans = { success: true, data_points: points, iterations: [iteration], total_iterations: 1, converged: true, final_centroids: centroids, final_assignments: labels, metadata: { ...metadata, n_clusters: 2 }, visualisation_feature_indices: [0, 1], visualisation_feature_names: ['x', 'y'], decision_boundary: null };
  const svm = { success: true, points, labels, x_range: [-5, 5], y_range: [-4, 4], optimal_w1: 1, optimal_w2: 0.5, optimal_b: 0, support_vector_indices: [Math.floor(count / 2) - 1, Math.floor(count / 2)], boundary_resolution: 20, metrics, metadata, decision_boundary: boundary, iterations: [], total_iterations: 0 };
  return { points, labels, names, metadata, metrics, knn, dt, featureStats, kmeans, svm, linear: regressionFixture(count), dataset: { X: points, y: labels, feature_names: ['x', 'y'], target_names: names } };
}

export function suiteRoutes(kind, scenario, data) {
  const moduleName = scenario.model === 'linear' ? 'linear_regression' : scenario.model;
  const params = scenario.model === 'linear' ? parameters : { feature_1: 0, feature_2: 1, visualisation_features: [0, 1], n_neighbors: 5, kernel: 'linear', C: 1 };
  const common = { page_type: 'dynamic', note: null, dataset: null, parameters: params };
  const routes = {
    '/api/dt/train_params': [], '/api/dt/train': data.dt,
    '/api/dt/manual/feature-stats': data.featureStats,
    '/api/dt/manual/evaluate': { metrics: data.metrics, metadata: data.metadata },
    '/api/dataset/load': data.dataset,
    '/api/knn/params': [], '/api/knn/train': data.knn, '/api/knn/visualise': data.knn,
    '/api/kmeans/params': [], '/api/kmeans/train': request => scenario.mode !== 'predict' && request.centroids?.length === 0 ? { ...data.kmeans, iterations: [{ ...data.kmeans.iterations[0], centroids: [], new_centroids: [], assignments: data.points.map(() => -1), converged: false }], total_iterations: 1, converged: false, final_centroids: [], final_assignments: data.points.map(() => -1), metadata: { ...data.kmeans.metadata, n_clusters: 0 } } : data.kmeans,
    '/api/linear/params': [], '/api/linear/train': data.linear, '/api/linear/visualise': data.linear,
    '/api/svm/params': [], '/api/svm/train': data.svm, '/api/svm/visualise': data.svm,
  };
  routes['/api/dt/predict'] = request => ({ predicted_class: request.points?.x > 0 ? 'Class 1' : 'Class 0', predicted_class_index: request.points?.x > 0 ? 1 : 0, confidence: 1, instructions: [request.points?.x > 0 ? 'right' : 'left', 'stop'] });
  routes['/api/knn/predict'] = request => {
    const query = request.query_points?.[0] || [0, 0];
    const nearest = data.knn.distance_matrix[0].map((_, i) => ({ index: i, distance: Math.hypot(query[0] - data.points[i][0], query[1] - data.points[i][1]) })).sort((a, b) => a.distance - b.distance).slice(0, 5);
    const index = query[0] > 0 ? 1 : 0;
    return { ...data.knn, predictions: [data.names[index]], prediction_indices: [index], neighbors_info: [nearest], all_distances: [data.points.map(p => Math.hypot(query[0] - p[0], query[1] - p[1]))], feature_names: ['x', 'y'], class_names: data.names, n_dimensions: 2 };
  };
  routes['/api/kmeans/predict'] = request => {
    const query_points = request.query_points || [[0, 0]], centroids = data.kmeans.final_centroids;
    const distances = query_points.map(q => centroids.map(c => Math.hypot(q[0] - c[0], q[1] - c[1])));
    const assignments = distances.map(d => d[0] <= d[1] ? 0 : 1);
    return { success: true, query_points, centroids, assignments, distance_matrix: distances, assigned_distances: distances.map((d, i) => d[assignments[i]]), metadata: data.kmeans.metadata, visualisation_feature_indices: [0, 1], visualisation_feature_names: ['x', 'y'] };
  };
  routes['/api/svm/predict'] = request => {
    const w1 = request.w1 ?? 0, w2 = request.w2 ?? 1, b = request.b ?? 0;
    const loss = data.points.reduce((sum, p, i) => sum + Math.max(0, 1 - (2 * data.labels[i] - 1) * (w1 * p[0] + w2 * p[1] + b)), 0) / data.points.length;
    return { success: true, loss, metrics: data.metrics, decision_boundary: { ...data.svm.decision_boundary, predictions: data.svm.decision_boundary.mesh_points.map(p => data.names[w1 * p[0] + w2 * p[1] + b > 0 ? 1 : 0]) } };
  };
  if (kind === 'context') {
    routes['/config/config.json'] = { datasets: {}, stories: { benchmark: { name: 'benchmark', description: 'Benchmark', start_page: 0, nodes: [{ index: 'benchmark' }], edges: [] } }, pages: { benchmark: { ...common, name: scenario.id, dynamic_type: 'model', model_name: scenario.model, component_type: scenario.mode, problem_type: scenario.model === 'linear' ? 'regression' : scenario.model === 'kmeans' ? 'clustering' : 'classifier' } } };
  } else {
    routes['/config/config.json'] = { datasets: {}, categories: [{ name: 'Benchmark', config_path: 'traditional_ml', files: [moduleName + '.json'] }], stories: [] };
    routes['/config/visual/traditional_ml/' + moduleName + '.json'] = { display_name: 'Benchmark', pages: [{ ...common, name: scenario.page }], transitions: [] };
  }
  return routes;
}
