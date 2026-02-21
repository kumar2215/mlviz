import json
import numpy as np
from typing import Dict, List, Optional, Any, Union
from pathlib import Path

from sklearn.neighbors import KNeighborsClassifier

from models import (
    KNNParameters,
    NeighborInfo,
    DecisionBoundaryData,
    ClassificationMetrics,
    ClassificationMetadata,
    Dataset,
    PredefinedDataset,
)
from .dataset_service import dataset_service


class KNNService:
    """Service for KNN prediction and visualization."""

    def __init__(self):
        self.dataset_service = dataset_service
        self._load_parameter_config()

    def _load_parameter_config(self):
        config_path = Path(__file__).parent.parent / \
            "config" / "knn_params.json"
        with open(config_path) as f:
            self.param_config = json.load(f)

    async def get_parameters(self) -> List[Dict[str, Any]]:
        """Get KNN parameter configuration."""
        return self.param_config["parameters"]

    async def _resolve_dataset(
        self, dataset_param: Optional[Union[Dict[str, Any], PredefinedDataset, Dataset]]
    ) -> Dataset:
        """Resolve dataset parameter to Dataset object."""
        if dataset_param is None:
            return await self.dataset_service.load_predefined_dataset(
                PredefinedDataset(name="iris")
            )
        elif isinstance(dataset_param, dict):
            if "name" in dataset_param:
                return await self.dataset_service.load_predefined_dataset(
                    PredefinedDataset(**dataset_param)
                )
            else:
                return Dataset(**dataset_param)
        elif isinstance(dataset_param, PredefinedDataset):
            return await self.dataset_service.load_predefined_dataset(dataset_param)
        else:
            return dataset_param

    def _get_neighbor_info(
        self,
        model: KNeighborsClassifier,
        query_point: np.ndarray,
        X_train: np.ndarray,
        y_train: np.ndarray,
        class_names: List[str],
    ) -> List[NeighborInfo]:
        """Get information about K-nearest neighbors for a query point."""
        # Get K nearest neighbors
        distances, indices = model.kneighbors(
            query_point.reshape(1, -1), return_distance=True
        )

        neighbors = []
        for idx, dist in zip(indices[0], distances[0]):
            neighbors.append(
                NeighborInfo(
                    index=int(idx),
                    distance=float(dist),
                    label=class_names[int(y_train[idx])],
                    coordinates=X_train[idx].tolist(),
                )
            )

        return neighbors

    def _get_all_distances(
        self, query_point: np.ndarray, X_train: np.ndarray, metric: str, p: float
    ) -> List[float]:
        """Calculate distances from query point to all training points."""
        from sklearn.metrics import pairwise_distances

        distances = pairwise_distances(
            query_point.reshape(1, -1),
            X_train,
            metric=metric if metric != "minkowski" else "minkowski",
            n_jobs=1,
            **({"p": p} if metric == "minkowski" else {}),
        )

        return distances[0].tolist()

    def _compute_distance_matrix(
        self, X_train: np.ndarray, metric: str, p: float
    ) -> List[List[float]]:
        """Compute pairwise distance matrix for all training points.

        Returns a matrix where element [i][j] is the distance from point i to point j.
        Diagonal elements (self-distance) are set to 0.
        """
        from sklearn.metrics import pairwise_distances

        distance_matrix = pairwise_distances(
            X_train,
            X_train,
            metric=metric if metric != "minkowski" else "minkowski",
            n_jobs=1,
            **({"p": p} if metric == "minkowski" else {}),
        )

        # Ensure diagonal is exactly 0 (may have small floating point errors)
        np.fill_diagonal(distance_matrix, 0)

        return distance_matrix.tolist()

    def _compute_neighbor_indices(
        self, X_train: np.ndarray, k: int, metric: str, p: float
    ) -> List[List[int]]:
        """Compute K nearest neighbor indices for each training point.

        Returns a list where element [i] contains the indices of the K nearest
        neighbors for point i, sorted by distance (closest first).
        """
        from sklearn.metrics import pairwise_distances

        distance_matrix = pairwise_distances(
            X_train,
            X_train,
            metric=metric if metric != "minkowski" else "minkowski",
            n_jobs=1,
            **({"p": p} if metric == "minkowski" else {}),
        )

        # For each point, find K nearest neighbors (excluding itself)
        neighbor_indices = []
        for i in range(len(X_train)):
            # Get distances for this point, set self-distance to infinity
            distances = distance_matrix[i].copy()
            distances[i] = np.inf

            # Get indices of K nearest neighbors
            k_nearest = np.argsort(distances)[:k]
            neighbor_indices.append(k_nearest.tolist())

        return neighbor_indices

    def _generate_decision_boundary(
        self,
        model: KNeighborsClassifier,
        X_train: np.ndarray,
        class_names: List[str],
        resolution: int = 50,
    ) -> Optional[DecisionBoundaryData]:
        """Generate decision boundary visualization data."""
        n_features = X_train.shape[1]

        # Only support 1D, 2D, and 3D visualization
        if n_features > 3:
            # For higher dimensions, use first 3 features
            n_features = min(3, X_train.shape[1])
            X_train = X_train[:, :n_features]

        if n_features == 1:
            # 1D: Create a line of points
            x_min, x_max = X_train[:, 0].min(), X_train[:, 0].max()
            margin = (x_max - x_min) * 0.1
            x_line = np.linspace(x_min - margin, x_max + margin, resolution)
            mesh_points = x_line.reshape(-1, 1)

        elif n_features == 2:
            # 2D: Create a grid
            x_min, x_max = X_train[:, 0].min(), X_train[:, 0].max()
            y_min, y_max = X_train[:, 1].min(), X_train[:, 1].max()
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
            x_min, x_max = X_train[:, 0].min(), X_train[:, 0].max()
            y_min, y_max = X_train[:, 1].min(), X_train[:, 1].max()
            z_min, z_max = X_train[:, 2].min(), X_train[:, 2].max()
            x_margin = (x_max - x_min) * 0.1
            y_margin = (y_max - y_min) * 0.1
            z_margin = (z_max - z_min) * 0.1

            xx, yy, zz = np.meshgrid(
                np.linspace(x_min - x_margin, x_max + x_margin, res_3d),
                np.linspace(y_min - y_margin, y_max + y_margin, res_3d),
                np.linspace(z_min - z_margin, z_max + z_margin, res_3d),
            )
            mesh_points = np.c_[xx.ravel(), yy.ravel(), zz.ravel()]

        # Predict class for each mesh point
        predictions_idx = model.predict(mesh_points)
        predictions = [class_names[int(idx)] for idx in predictions_idx]

        return DecisionBoundaryData(
            mesh_points=mesh_points.tolist(),
            predictions=predictions,
            dimensions=n_features,
        )

    async def predict(
        self,
        parameters: KNNParameters,
        dataset_param: Dict[str, Any],
        query_points: List[List[float]],
        visualisation_features: Optional[List[int]] = None,
        include_boundary: bool = True,
        boundary_resolution: int = 50,
    ) -> Dict[str, Any]:
        """Make KNN predictions with visualization data.

        Args:
            parameters: KNN algorithm parameters
            dataset_param: Training dataset
            query_points: Points to classify
            visualization_features: Feature indices for visualization (1-2 features)
            include_boundary: Whether to generate decision boundary
            boundary_resolution: Resolution of boundary mesh

        Returns:
            Dictionary with predictions, neighbors, and visualization data
        """
        # Resolve dataset
        dataset = await self._resolve_dataset(dataset_param)
        dataset_info = await self.dataset_service.prepare_dataset_for_training(dataset)

        X_train_full = dataset_info["X_train"]
        y_train = dataset_info["y_train"]
        feature_names_full = dataset_info["feature_names"]
        class_names = dataset_info["target_names"]

        n_features = X_train_full.shape[1]

        # Determine visualization features
        if visualisation_features is None:
            if n_features <= 2:
                # Use all features for <=2d
                visualisation_features = list(range(n_features))
            else:
                # Use first 2 features for 2D
                visualisation_features = [0, 1]

        # Validate visualization_features
        if len(visualisation_features) > 3:
            raise ValueError(
                "visualization_features can have at most 3 features")
        if len(visualisation_features) < 1:
            raise ValueError(
                "visualization_features must have at least 1 feature")
        if max(visualisation_features) >= n_features:
            raise ValueError(
                f"Feature index {max(visualisation_features)} out of range for dataset with {n_features} features")

        # Extract visualization feature names
        viz_feature_names = [feature_names_full[i]
                             for i in visualisation_features]

        # Automatically disable boundary for >3D if no visualization features specified
        # or if visualization features still result in >3D
        if len(visualisation_features) > 3:
            include_boundary = False

        # Extract data for visualization (subset of features)
        X_train_viz = X_train_full[:, visualisation_features]

        # Fit KNN model. 
        # If visualisation_features provided, we fit ONLY on those features for consistency 
        # with the WYSIWYG model shown in the TrainPage and visualization.
        sklearn_params = parameters.to_sklearn_params()
        model = KNeighborsClassifier(**sklearn_params)
        
        if visualisation_features is not None:
            model.fit(X_train_viz, y_train)
        else:
            model.fit(X_train_full, y_train)


        # Make predictions
        # Handle query points slicing if they were provided as full vectors

        query_points = np.array(query_points)
        if query_points.shape[1] == n_features:
            query_array_viz = query_points[:, visualisation_features]
            query_array_predict = query_array_viz if visualisation_features is not None else query_array
            query_array_for_neighbors = query_array_predict
        else:
            # Assume query points are already the subset
            query_array_viz = query_points
            query_array_predict = query_points
            query_array_for_neighbors = query_points

        predictions_idx = model.predict(query_array_predict)
        predictions = [class_names[int(idx)] for idx in predictions_idx]

        # Use the appropriate training set for neighbor calculations
        X_train_for_neighbors = X_train_viz if visualisation_features is not None else X_train_full

        # Get neighbor information for each query point
        neighbors_info = []
        all_distances = []

        for query_point in query_array_for_neighbors:
            # Get K-nearest neighbors info
            neighbor_info = self._get_neighbor_info(
                model, query_point, X_train_for_neighbors, y_train, class_names
            )
            neighbors_info.append(neighbor_info)

            # Get distances to all training points
            distances = self._get_all_distances(
                query_point, X_train_for_neighbors, parameters.metric, parameters.p
            )
            all_distances.append(distances)

        # Compute distance matrix and neighbor indices for interactive exploration
        # Use visualization features for distances (since that's what user sees)
        distance_matrix = self._compute_distance_matrix(
            X_train_viz, parameters.metric, parameters.p
        )
        neighbor_indices = self._compute_neighbor_indices(
            X_train_viz, parameters.n_neighbors, parameters.metric, parameters.p
        )

        # Generate decision boundary if requested (using visualization features only)
        decision_boundary = None
        if include_boundary:
            # Create a separate model trained ONLY on visualization features
            # This shows the decision boundary for the selected feature space
            model_viz = KNeighborsClassifier(**sklearn_params)
            model_viz.fit(X_train_viz, y_train)

            decision_boundary = self._generate_decision_boundary(
                model_viz, X_train_viz, class_names, boundary_resolution
            )

        return {
            "success": True,
            "predictions": predictions,
            "prediction_indices": predictions_idx.tolist(),
            "neighbors_info": [
                [neighbor.model_dump() for neighbor in neighbors]
                for neighbors in neighbors_info
            ],
            "training_points": X_train_viz.tolist(),  # Visualization subset only
            "training_labels": [class_names[int(idx)] for idx in y_train],
            "all_distances": all_distances,  # Distances based on FULL features
            "distance_matrix": distance_matrix,
            "neighbor_indices": neighbor_indices,
            "decision_boundary": (
                decision_boundary.model_dump() if decision_boundary else None
            ),
            "feature_names": feature_names_full,  # All feature names
            "class_names": class_names,
            "n_dimensions": n_features,  # Total number of features
            "visualisation_feature_indices": visualisation_features,
            "visualisation_feature_names": viz_feature_names,
        }

    async def visualise(
        self,
        parameters: KNNParameters,
        dataset_param: Dict[str, Any],
        visualisation_features: Optional[List[int]] = None,
        include_boundary: bool = True,
        boundary_resolution: int = 50,
    ) -> Dict[str, Any]:
        """Get KNN visualisation data without making predictions.

        This endpoint is useful for visualizing the training dataset
        with decision boundaries before making any predictions.

        Args:
            parameters: KNN algorithm parameters
            dataset_param: Training dataset
            visualisation_features: Feature indices for visualisation (1-3 features)
            include_boundary: Whether to generate decision boundary
            boundary_resolution: Resolution of boundary mesh

        Returns:
            Dictionary with training data, decision boundary, and metadata
        """
        # Resolve dataset
        dataset = await self._resolve_dataset(dataset_param)
        dataset_info = await self.dataset_service.prepare_dataset_for_training(dataset)

        X_train_full = dataset_info["X_train"]
        y_train = dataset_info["y_train"]
        feature_names_full = dataset_info["feature_names"]
        class_names = dataset_info["target_names"]

        n_features = X_train_full.shape[1]

        # Determine visualisation features
        if visualisation_features is None:
            visualisation_features = [0, 1] if n_features >= 2 else [0]

        # Validate visualisation_features
        if len(visualisation_features) > 3:
            raise ValueError(
                "visualisation_features can have at most 3 features")
        if len(visualisation_features) < 1:
            raise ValueError(
                "visualisation_features must have at least 1 feature")
        if max(visualisation_features) >= n_features:
            raise ValueError(
                f"Feature index {max(visualisation_features)} out of range for dataset with {n_features} features"
            )

        # Extract visualisation feature names
        viz_feature_names = [feature_names_full[i]
                             for i in visualisation_features]

        # Auto-disable boundary for >3D
        if len(visualisation_features) > 3:
            include_boundary = False

        # Extract data for visualisation (subset of features)
        X_train_viz = X_train_full[:, visualisation_features]

        # Compute distance matrix and neighbor indices for interactive exploration
        # Use visualization features for distances (since that's what user sees)
        distance_matrix = self._compute_distance_matrix(
            X_train_viz, parameters.metric, parameters.p
        )
        neighbor_indices = self._compute_neighbor_indices(
            X_train_viz, parameters.n_neighbors, parameters.metric, parameters.p
        )

        # Generate decision boundary if requested
        decision_boundary = None
        if include_boundary:
            # Create model trained on visualisation features only
            sklearn_params = parameters.to_sklearn_params()
            model_viz = KNeighborsClassifier(**sklearn_params)
            model_viz.fit(X_train_viz, y_train)

            decision_boundary = self._generate_decision_boundary(
                model_viz, X_train_viz, class_names, boundary_resolution
            )

        return {
            "success": True,
            "training_points": X_train_viz.tolist(),
            "training_labels": [class_names[int(idx)] for idx in y_train],
            "distance_matrix": distance_matrix,
            "neighbor_indices": neighbor_indices,
            "decision_boundary": (
                decision_boundary.model_dump() if decision_boundary else None
            ),
            "metadata": {
                "feature_names": feature_names_full,
                "class_names": class_names,
                "n_features": n_features,
                "n_classes": len(class_names),
            },
            "visualisation_feature_indices": visualisation_features,
            "visualisation_feature_names": viz_feature_names,
        }

    async def train(
        self,
        parameters: KNNParameters,
        dataset_param: Optional[Union[Dict[str, Any], PredefinedDataset, Dataset]] = None,
        visualisation_features: Optional[List[int]] = None,
        include_boundary: bool = True,
        boundary_resolution: int = 50,
    ) -> Dict[str, Any]:
        """Train KNN and return visualization data + evaluation metrics.
        
        WYSIWYG: Trains and evaluates ONLY on the visualization features.
        This ensures the model metrics match what's displayed in the visualization.
        
        This combines visualization (like visualise()) with evaluation metrics
        (like DecisionTree's train()). It:
        1. Loads and splits dataset (train/test)
        2. Determines visualization features (defaults to first 2)
        3. Trains KNN on ONLY visualization features
        4. Evaluates on test set using ONLY visualization features → confusion matrix + scores
        5. Generates visualization data (decision boundary, etc.)
        
        Args:
            parameters: KNN algorithm parameters
            dataset_param: Dataset to use (defaults to Iris)
            visualisation_features: Feature indices for visualization (defaults to [0, 1])
            include_boundary: Whether to include decision boundary
            boundary_resolution: Resolution of boundary mesh
            
        Returns:
            Dict containing visualization data AND metrics (matrix, scores)
        """
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import (
            confusion_matrix,
            accuracy_score,
            precision_score,
            recall_score,
            f1_score,
        )
        
        # Load full dataset
        dataset = await self._resolve_dataset(dataset_param)
        X_full = np.array(dataset.X)
        y_full = np.array(dataset.y)
        n_features = X_full.shape[1]
        
        # Determine visualization features (default to first 2)
        if visualisation_features is None:
                visualisation_features = [0, 1]
        
        if len(visualisation_features) < 1:
            visualisation_features = [0, 1] if n_features >= 2 else [0]
            
        # Validate and auto-correct visualisation_features if out of bounds
        max_idx = max(visualisation_features)
        if max_idx >= n_features:
            # Fallback to defaults if indices are invalid for this dataset
            # (e.g. switching from 4-feature dataset to 2-feature dataset)
            print(f"Feature indices {visualisation_features} out of bounds for {n_features} features. Resetting to defaults.")
            visualisation_features = [0, 1] if n_features >= 2 else [0]
        
        # Extract ONLY visualization features for WYSIWYG
        X_viz = X_full[:, visualisation_features]
        
        # Split into train/test (80/20) using ONLY visualization features
        X_train, X_test, y_train, y_test = train_test_split(
            X_viz, y_full, test_size=0.2, random_state=42, stratify=y_full
        )
        
        # Train KNN model on visualization features ONLY
        sklearn_params = parameters.to_sklearn_params()
        model = KNeighborsClassifier(**sklearn_params)
        model.fit(X_train, y_train)
        
        # Evaluate on test set (using visualization features)
        y_pred = model.predict(X_test)
        
        # Calculate confusion matrix and metrics
        cm = confusion_matrix(y_test, y_pred)
        
        metrics = ClassificationMetrics(
            confusion_matrix=cm.tolist(),
            accuracy=float(accuracy_score(y_test, y_pred)),
            precision=float(precision_score(y_test, y_pred, average='weighted', zero_division=0)),
            recall=float(recall_score(y_test, y_pred, average='weighted', zero_division=0)),
            f1=float(f1_score(y_test, y_pred, average='weighted', zero_division=0)),
        )
        
        # Generate visualization data using training set only
        # X_train is ALREADY the visualization features (sliced before split)
        # So we use X_train directly, NO re-slicing needed
        X_train_viz = X_train
        
        # Compute distance matrix and neighbor indices
        distance_matrix = self._compute_distance_matrix(
            X_train_viz, parameters.metric, parameters.p
        )
        neighbor_indices = self._compute_neighbor_indices(
            X_train_viz, parameters.n_neighbors, parameters.metric, parameters.p
        )
        
        # Generate decision boundary if requested
        decision_boundary = None
        if include_boundary:
            sklearn_params = parameters.to_sklearn_params()
            model_viz = KNeighborsClassifier(**sklearn_params)
            model_viz.fit(X_train_viz, y_train)
            
            decision_boundary = self._generate_decision_boundary(
                model_viz, X_train_viz, dataset.target_names, boundary_resolution
            )
        
        # Create metadata to match DecisionTree service structure
        # Ensure we return valid strings for feature names
        viz_feature_names = [str(dataset.feature_names[i]) for i in visualisation_features]
        
        metadata = ClassificationMetadata(
            feature_names=dataset.feature_names,
            class_names=dataset.target_names,
            n_features=len(dataset.feature_names),
            n_classes=len(dataset.target_names),
            dataset_name=dataset.name if hasattr(dataset, 'name') else None
        )
        
        # Return visualization data + metrics + metadata
        return {
            "success": True,
            "training_points": X_train_viz.tolist(),
            "training_labels": [dataset.target_names[int(idx)] for idx in y_train],
            "distance_matrix": distance_matrix,
            "neighbor_indices": neighbor_indices,
            "decision_boundary": (
                decision_boundary.model_dump() if decision_boundary else None
            ),
            "metadata": metadata.model_dump(),
            "visualisation_feature_indices": visualisation_features,
            "visualisation_feature_names": [dataset.feature_names[i] for i in visualisation_features],
            "metrics": metrics.model_dump(),
        }




# Global service instance
knn_service = KNNService()
