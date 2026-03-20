import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import numpy as np
from models import (
    ClassificationDataset,
    DecisionBoundaryData,
    KMeansParameters,
    PredefinedClassificationDataset,
)
from sklearn.cluster import KMeans

from .dataset_service import dataset_service


class KMeansService:
    """Service for K-Means clustering and visualization."""

    def __init__(self):
        self.dataset_service = dataset_service
        self._load_parameter_config()

    def _load_parameter_config(self):
        config_path = Path(__file__).parent.parent / "config" / "kmeans_params.json"
        with open(config_path) as f:
            self.param_config = json.load(f)

    async def get_parameters(self) -> List[Dict[str, Any]]:
        """Get K-Means parameter configuration."""
        return self.param_config["parameters"]

    async def _resolve_dataset(
        self, dataset_param: Optional[Union[Dict[str, Any], PredefinedClassificationDataset, ClassificationDataset]]
    ) -> ClassificationDataset:
        """Resolve dataset parameter to ClassificationDataset object."""
        if dataset_param is None:
            return await self.dataset_service.load_predefined_dataset(
                PredefinedClassificationDataset(name="iris")
            )
        elif isinstance(dataset_param, dict):
            if "name" in dataset_param:
                return await self.dataset_service.load_predefined_dataset(
                    PredefinedClassificationDataset(**dataset_param)
                )
            else:
                return ClassificationDataset(**dataset_param)
        elif isinstance(dataset_param, PredefinedClassificationDataset):
            return await self.dataset_service.load_predefined_dataset(dataset_param)
        else:
            return dataset_param

    def _calculate_distance_matrix(
        self, points: np.ndarray, centroids: np.ndarray, metric: str = "euclidean"
    ) -> np.ndarray:
        """Calculate distances from all points to all centroids.

        Args:
            points: Array of shape (n_points, n_features)
            centroids: Array of shape (n_centroids, n_features)
            metric: Distance metric ('euclidean' or 'manhattan')

        Returns:
            Distance matrix of shape (n_points, n_centroids)
            where element [i, j] is distance from point i to centroid j
        """
        if metric == "euclidean":
            # (x - c)^2 = x^2 - 2xc + c^2
            points_sq = np.sum(points**2, axis=1, keepdims=True)
            centroids_sq = np.sum(centroids**2, axis=1)
            cross_term = points @ centroids.T
            distances = np.sqrt(
                np.maximum(points_sq - 2 * cross_term + centroids_sq, 0)
            )
        elif metric == "manhattan":
            # |x - c| for each dimension, summed
            distances = np.sum(
                np.abs(points[:, np.newaxis, :] - centroids[np.newaxis, :, :]), axis=2
            )
        else:
            raise ValueError(f"Unknown metric: {metric}")

        return distances

    def _assign_centroids(
        self, points: np.ndarray, centroids: np.ndarray, metric: str = "euclidean"
    ) -> tuple[np.ndarray, np.ndarray]:
        """Assign each point to its nearest centroid.

        Args:
            points: Array of shape (n_points, n_features)
            centroids: Array of shape (n_centroids, n_features)
            metric: Distance metric ('euclidean' or 'manhattan')

        Returns:
            Tuple of:
                - assignments: Array of shape (n_points,) with centroid index for each point
                - distance_matrix: Array of shape (n_points, n_centroids) with all distances
        """
        if centroids.shape[0] == 0:
            # Handle case with no centroids
            assignments = np.full(points.shape[0], -1)
            distance_matrix = np.zeros((points.shape[0], 0))
            return assignments, distance_matrix

        distance_matrix = self._calculate_distance_matrix(points, centroids, metric)
        assignments = np.argmin(distance_matrix, axis=1)
        return assignments, distance_matrix

    def _update_centroids(
        self,
        points: np.ndarray,
        assignments: np.ndarray,
        n_clusters: int,
        centroid_type: str = "medoid",
        metric: str = "euclidean",
    ) -> np.ndarray:
        """Recalculate centroids as the mean of assigned points, or medoids as the nearest data point.

        Args:
            points: Array of shape (n_points, n_features)
            assignments: Array of shape (n_points,) with cluster assignment for each point
            n_clusters: Number of clusters
            centroid_type: 'centroid' (mean) or 'medoid' (nearest data point to mean)
            metric: Distance metric for medoid calculation

        Returns:
            New centroids array of shape (n_clusters, n_features)
        """
        n_features = points.shape[1]
        new_centroids = np.zeros((n_clusters, n_features))

        for k in range(n_clusters):
            mask = assignments == k
            if np.any(mask):
                cluster_points = points[mask]
                mean_pos = cluster_points.mean(axis=0)

                if centroid_type == "medoid":
                    # Find point in cluster closest to the mean
                    if metric == "euclidean":
                        dists = np.sum((cluster_points - mean_pos) ** 2, axis=1)
                    else:  # manhattan
                        dists = np.sum(np.abs(cluster_points - mean_pos), axis=1)

                    best_idx = np.argmin(dists)
                    new_centroids[k] = cluster_points[best_idx]
                else:
                    new_centroids[k] = mean_pos
            else:
                # Empty cluster: keep centroid unchanged (or could reinitialize)
                new_centroids[k] = np.nan

        return new_centroids

    def _check_convergence(
        self,
        old_centroids: np.ndarray,
        new_centroids: np.ndarray,
        tol: float = 1e-4
    ) -> tuple[bool, np.ndarray]:
        """Check if centroids have converged.

        Args:
            old_centroids: Previous centroids of shape (n_clusters, n_features)
            new_centroids: New centroids of shape (n_clusters, n_features)
            tol: Tolerance for convergence

        Returns:
            Tuple of:
                - converged: True if all centroids moved less than tol
                - centroid_shifts: Array of distances each centroid moved
        """
        centroid_shifts = np.sqrt(np.sum((new_centroids - old_centroids) ** 2, axis=1))
        converged = bool(np.all(centroid_shifts < tol))
        return converged, centroid_shifts

    def _generate_decision_boundary(
        self,
        centroids: np.ndarray,
        X_data: np.ndarray,
        metric: str = "euclidean",
        resolution: int = 50,
    ) -> Optional[Dict[str, Any]]:
        """Generate decision boundary visualization data for K-Means.
        
        Args:
            centroids: Array of shape (n_clusters, n_features) with centroid positions
            X_data: Training data of shape (n_samples, n_features) to determine bounds
            metric: Distance metric ('euclidean' or 'manhattan')
            resolution: Resolution of boundary mesh
            
        Returns:
            Dictionary with mesh_points, predictions (cluster IDs), and dimensions
        """
        from models import DecisionBoundaryData
        
        n_features = X_data.shape[1]
        
        # Only support 1D, 2D, and 3D visualization
        if n_features > 3:
            n_features = min(3, X_data.shape[1])
            X_data = X_data[:, :n_features]
            centroids = centroids[:, :n_features]
        
        if n_features == 1:
            # 1D: Create a line of points
            x_min, x_max = X_data[:, 0].min(), X_data[:, 0].max()
            margin = (x_max - x_min) * 0.1
            x_line = np.linspace(x_min - margin, x_max + margin, resolution)
            mesh_points = x_line.reshape(-1, 1)
            
        elif n_features == 2:
            # 2D: Create a grid
            x_min, x_max = X_data[:, 0].min(), X_data[:, 0].max()
            y_min, y_max = X_data[:, 1].min(), X_data[:, 1].max()
            x_margin = (x_max - x_min) * 0.1
            y_margin = (y_max - y_min) * 0.1
            
            xx, yy = np.meshgrid(
                np.linspace(x_min - x_margin, x_max + x_margin, resolution),
                np.linspace(y_min - y_margin, y_max + y_margin, resolution),
            )
            mesh_points = np.c_[xx.ravel(), yy.ravel()]
            
        else:  # n_features == 3
            # 3D: Create a 3D grid (smaller resolution to avoid memory issues)
            res_3d = min(resolution, 30)  # Cap at 30 for 3D to avoid explosion
            x_min, x_max = X_data[:, 0].min(), X_data[:, 0].max()
            y_min, y_max = X_data[:, 1].min(), X_data[:, 1].max()
            z_min, z_max = X_data[:, 2].min(), X_data[:, 2].max()
            x_margin = (x_max - x_min) * 0.1
            y_margin = (y_max - y_min) * 0.1
            z_margin = (z_max - z_min) * 0.1
            
            xx, yy, zz = np.meshgrid(
                np.linspace(x_min - x_margin, x_max + x_margin, res_3d),
                np.linspace(y_min - y_margin, y_max + y_margin, res_3d),
                np.linspace(z_min - z_margin, z_max + z_margin, res_3d),
            )
            mesh_points = np.c_[xx.ravel(), yy.ravel(), zz.ravel()]
        
        if centroids.shape[0] == 0:
            return DecisionBoundaryData(
                mesh_points=mesh_points.tolist(),
                predictions=["Unassigned"] * mesh_points.shape[0],
                dimensions=int(n_features),
            )
        
        # Assign each mesh point to nearest centroid
        assignments, _ = self._assign_centroids(mesh_points, centroids, metric)
        
        # Convert cluster IDs to strings for consistency with KNN
        predictions = [str(int(cluster_id)) for cluster_id in assignments]
        
        return DecisionBoundaryData(
            mesh_points=mesh_points.tolist(),
            predictions=predictions,
            dimensions=n_features,
        )


    async def step(
        self,
        parameters: KMeansParameters,
        centroids: Optional[List[List[float]]] = None,
        dataset_param: Optional[Union[Dict[str, Any], PredefinedClassificationDataset, ClassificationDataset]] = None,
        visualisation_features: Optional[List[int]] = None,
        include_boundary: bool = True,
        boundary_resolution: int = 50,
    ) -> Dict[str, Any]:
        """Perform one K-Means iteration: assign points to centroids and update centroids.

        Args:
            parameters: K-Means parameters (metric, n_clusters)
            centroids: Current centroid positions [[x, y], ...]
            dataset_param: ClassificationDataset to use (defaults to Iris)
            visualisation_features: Feature indices for visualization (defaults to [0, 1])
            include_boundary: Whether to generate decision boundary
            boundary_resolution: Resolution of boundary mesh

        Returns:
            Dict containing assignments, distances, updated centroids, and visualization data
        """
        # Load dataset
        dataset = await self._resolve_dataset(dataset_param)
        X_full = np.array(dataset.X)
        n_features = X_full.shape[1]

        # Determine visualization features
        if visualisation_features is None:
            visualisation_features = [parameters.feature_1]
            if parameters.feature_2 is not None:
                visualisation_features.append(parameters.feature_2)

        # Validate visualization features
        if len(visualisation_features) < 1:
            visualisation_features = [0, 1] if n_features >= 2 else [0]

        max_idx = max(visualisation_features)
        if max_idx >= n_features:
            visualisation_features = [0, 1] if n_features >= 2 else [0]

        # Extract visualization features
        X_viz = X_full[:, visualisation_features]
        
        # Initialize centroids - if empty, we start with 0 clusters
        # Ensure dimensionality matches visualization features
        if centroids is None or len(centroids) == 0:
            centroids_array = np.zeros((0, len(visualisation_features)))
            n_clusters = 0
        else:
            centroids_array = np.array(centroids)
            n_clusters = centroids_array.shape[0]

        if n_clusters == 0:
            # Special case: Return state with no clusters
            assignments = np.full(X_viz.shape[0], -1)
            distance_matrix = np.zeros((X_viz.shape[0], 0))
            new_centroids = np.zeros((0, n_features))
            centroid_shifts = np.zeros(0)
            converged = True
            cluster_info = []
        else:
            # Assign points to centroids
            assignments, distance_matrix = self._assign_centroids(
                X_viz, centroids_array, parameters.metric
            )

            # Update centroids
            new_centroids = self._update_centroids(
                X_viz, assignments, n_clusters, parameters.centroid_type, parameters.metric
            )

            # Check convergence
            converged, centroid_shifts = self._check_convergence(
                centroids_array, new_centroids
            )

            # Get cluster info
            cluster_info = []
            for k in range(n_clusters):
                mask = assignments == k
                cluster_info.append({
                    "cluster_id": k,
                    "centroid": new_centroids[k].tolist(),
                    "n_points": int(np.sum(mask)),
                    "point_indices": np.where(mask)[0].tolist(),
                })

        # Get visualization feature names
        viz_feature_names = [dataset.feature_names[i] for i in visualisation_features]

        # Generate decision boundary if requested
        decision_boundary = None
        if include_boundary and len(visualisation_features) <= 3:
            decision_boundary = self._generate_decision_boundary(
                new_centroids, X_viz, parameters.metric, boundary_resolution
            )

        return {
            "success": True,
            "data_points": X_viz.tolist(),
            "assignments": assignments.tolist(),
            "distance_matrix": distance_matrix.tolist(),
            "centroids": centroids_array.tolist(),
            "new_centroids": new_centroids.tolist(),
            "centroid_shifts": centroid_shifts.tolist(),
            "converged": converged,
            "cluster_info": cluster_info,
            "metadata": {
                "feature_names": dataset.feature_names,
                "n_features": n_features,
                "n_samples": len(X_full),
                "n_clusters": centroids_array.shape[0],
            },
            "visualisation_feature_indices": visualisation_features,
            "visualisation_feature_names": viz_feature_names,
            "decision_boundary": (
                decision_boundary.model_dump() if decision_boundary else None
            ),
        }

    async def train(
        self,
        parameters: KMeansParameters,
        centroids: Optional[List[List[float]]] = None,
        dataset_param: Optional[Union[Dict[str, Any], PredefinedClassificationDataset, ClassificationDataset]] = None,
        visualisation_features: Optional[List[int]] = None,
        max_iterations: int = 100,
        include_boundary: bool = True,
        boundary_resolution: int = 50,
    ) -> Dict[str, Any]:
        """Run K-Means until convergence, returning all iterations.

        Args:
            parameters: K-Means parameters (metric, n_clusters)
            centroids: Initial centroid positions [[x, y], ...]
            dataset_param: ClassificationDataset to use (defaults to Iris)
            visualisation_features: Feature indices for visualization (defaults to [0, 1])
            max_iterations: Maximum number of iterations before stopping
            include_boundary: Whether to generate decision boundary
            boundary_resolution: Resolution of boundary mesh

        Returns:
            Dict containing all iterations and final results
        """
        # Load dataset
        dataset = await self._resolve_dataset(dataset_param)
        X_full = np.array(dataset.X)
        n_features = X_full.shape[1]

        # Determine visualization features
        if visualisation_features is None:
            visualisation_features = [parameters.feature_1]
            if parameters.feature_2 is not None:
                visualisation_features.append(parameters.feature_2)

        # Validate visualization features
        if len(visualisation_features) < 1:
            visualisation_features = [0, 1] if n_features >= 2 else [0]

        max_idx = max(visualisation_features)
        if max_idx >= n_features:
            visualisation_features = [0, 1] if n_features >= 2 else [0]

        # Extract visualization features
        X_viz = X_full[:, visualisation_features]
        
        # Initialize centroids - if empty, we start with 0 clusters
        # Ensure dimensionality matches visualization features
        if centroids is None or len(centroids) == 0:
            current_centroids = np.zeros((0, len(visualisation_features)))
            n_clusters = 0
        else:
            current_centroids = np.array(centroids)
            n_clusters = len(centroids)

        # Get visualization feature names
        viz_feature_names = [dataset.feature_names[i] for i in visualisation_features]

        iterations = []
        converged = False

        if n_clusters == 0:
            # Special case: Return single iteration with no clusters
            assignments = np.full(X_viz.shape[0], -1)
            distance_matrix = np.zeros((X_viz.shape[0], 0))
            iterations.append({
                "iteration": 0,
                "assignments": assignments.tolist(),
                "distance_matrix": distance_matrix.tolist(),
                "centroids": [],
                "new_centroids": [],
                "centroid_shifts": [],
                "converged": True,
                "cluster_info": [],
            })
            converged = True
        else:
            for iteration in range(max_iterations):
                # Assign points to centroids
                assignments, distance_matrix = self._assign_centroids(
                    X_viz, current_centroids, parameters.metric
                )

                # Update centroids
                new_centroids = self._update_centroids(
                    X_viz, assignments, n_clusters, parameters.centroid_type, parameters.metric
                )

                # Check convergence
                converged, centroid_shifts = self._check_convergence(
                    current_centroids, new_centroids
                )

                # Get cluster info
                cluster_info = []
                for k in range(n_clusters):
                    mask = assignments == k
                    cluster_info.append({
                        "cluster_id": k,
                        "centroid": new_centroids[k].tolist(),
                        "n_points": int(np.sum(mask)),
                        "point_indices": np.where(mask)[0].tolist(),
                    })

                # Store iteration data
                iterations.append({
                    "iteration": iteration,
                    "assignments": assignments.tolist(),
                    "distance_matrix": distance_matrix.tolist(),
                    "centroids": current_centroids.tolist(),
                    "new_centroids": new_centroids.tolist(),
                    "centroid_shifts": centroid_shifts.tolist(),
                    "converged": converged,
                    "cluster_info": cluster_info,
                })

                # Update centroids for next iteration
                current_centroids = new_centroids

                if converged:
                    break

        # Generate decision boundary if requested (using final centroids)
        decision_boundary = None
        if include_boundary and len(visualisation_features) <= 3:
            decision_boundary = self._generate_decision_boundary(
                current_centroids, X_viz, parameters.metric, boundary_resolution
            )

        return {
            "success": True,
            "data_points": X_viz.tolist(),
            "iterations": iterations,
            "total_iterations": len(iterations),
            "converged": converged,
            "final_centroids": current_centroids.tolist(),
            "final_assignments": iterations[-1]["assignments"] if iterations else [],
            "metadata": {
                "feature_names": dataset.feature_names,
                "n_features": n_features,
                "n_samples": len(X_full),
                "n_clusters": n_clusters,
            },
            "visualisation_feature_indices": visualisation_features,
            "visualisation_feature_names": viz_feature_names,
            "decision_boundary": (
                decision_boundary.model_dump() if decision_boundary else None
            ),
        }

    async def predict(
        self,
        parameters: KMeansParameters,
        centroids: List[List[float]],
        query_points: List[List[float]],
    ) -> Dict[str, Any]:
        """Predict cluster assignments for query points given centroids.

        Args:
            parameters: K-Means parameters (metric)
            centroids: Centroid positions [[x, y], ...]
            query_points: Points to assign to clusters [[x, y], ...]

        Returns:
            Dict containing assignments and distances for query points
        """
        centroids_array = np.array(centroids)
        query_array = np.array(query_points)

        # Assign query points to centroids
        assignments, distance_matrix = self._assign_centroids(
            query_array, centroids_array, parameters.metric
        )

        # Get distance to assigned centroid for each point
        assigned_distances = distance_matrix[
            np.arange(len(query_array)), assignments
        ].tolist()

        return {
            "success": True,
            "query_points": query_array.tolist(),
            "assignments": assignments.tolist(),
            "distance_matrix": distance_matrix.tolist(),
            "assigned_distances": assigned_distances,
            "centroids": centroids_array.tolist(),
        }


# Global service instance
kmeans_service = KMeansService()
