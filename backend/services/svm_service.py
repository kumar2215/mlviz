import json
import numpy as np
from typing import Dict, List, Optional, Any
from pathlib import Path

from sklearn.svm import SVC
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix, precision_score, recall_score, f1_score

from models import (
    ClassificationDataset,
    ClassificationMetadata,
    ClassificationMetrics,
    ClassificationMetricValues,
    DecisionBoundaryData,
    PredefinedClassificationDataset,
    SVMParameters,
    SVMMetadata,
)
from services.dataset_service import dataset_service


class SVMService:
    """Service for SVM classification visualisation and gradient descent steps."""

    def __init__(self):
        self._load_parameter_config()

    def _load_parameter_config(self):
        config_path = Path(__file__).parent.parent / "config" / "svm_params.json"
        with open(config_path) as f:
            self.param_config = json.load(f)

    async def get_parameters(self) -> List[Dict[str, Any]]:
        """Get SVM parameter configuration."""
        return self.param_config["parameters"]

    async def _resolve_dataset(
        self,
        dataset_param: Optional[Any],
    ) -> ClassificationDataset:
        if dataset_param is None:
            return await dataset_service.load_predefined_dataset(
                PredefinedClassificationDataset(name="moons")
            )
        elif isinstance(dataset_param, dict):
            if "name" in dataset_param:
                return await dataset_service.load_predefined_dataset(
                    PredefinedClassificationDataset(**dataset_param)
                )
            else:
                return ClassificationDataset(**dataset_param)
        elif isinstance(dataset_param, PredefinedClassificationDataset):
            return await dataset_service.load_predefined_dataset(dataset_param)
        else:
            return dataset_param

    def _compute_metrics(self, y_true: np.ndarray, y_pred: np.ndarray) -> ClassificationMetricValues:
        """Compute classification metrics given true and predicted values."""
        return ClassificationMetricValues(
            confusion_matrix=confusion_matrix(y_true, y_pred, labels=[0, 1]).tolist(),
            accuracy=accuracy_score(y_true, y_pred),
            precision=precision_score(y_true, y_pred, average="weighted", zero_division=0),
            recall=recall_score(y_true, y_pred, average="weighted", zero_division=0),
            f1=f1_score(y_true, y_pred, average="weighted", zero_division=0),
        )

    def _get_2d_points(self, X: np.ndarray, y: np.ndarray, feature_x_idx: int, feature_y_idx: int):
        X_reduced = X[:, [feature_x_idx, feature_y_idx]]
        # Dynamically find the first two unique classes if more than 2 are present
        unique_classes = np.unique(y)
        if len(unique_classes) > 2:
            # For SVM visualisation simplicity, we still want exactly two classes
            # We take the first two unique classes found in the provided data
            target_classes = unique_classes[:2]
            mask = np.isin(y, target_classes)
            X_filtered, y_filtered = X_reduced[mask], y[mask]
        else:
            X_filtered, y_filtered = X_reduced, y
            target_classes = unique_classes

        # Map labels to 0 and 1 for consistent SVM handling and frontend rendering
        # This mapping is local to the 2D visualisation
        if len(target_classes) >= 1:
            label_map = {label: i for i, label in enumerate(target_classes)}
            y_mapped = np.array([label_map[label] for label in y_filtered])
            return X_filtered, y_mapped, list(target_classes)
        
        return X_filtered, y_filtered, list(target_classes)
        
    def _compute_hinge_loss(self, X: np.ndarray, y: np.ndarray, w1: float, w2: float, b: float) -> float:
        # Map labels from 0/1 to -1/1 for hinge loss
        y_mapped = np.where(y == 0, -1, 1)
        margins = y_mapped * (X[:, 0] * w1 + X[:, 1] * w2 + b)
        loss = np.maximum(0, 1 - margins)
        return float(np.mean(loss))
    def _make_mesh(self, X: np.ndarray, resolution: int) -> np.ndarray:
        """Return a (resolution*resolution, 2) mesh grid covering X with 10% padding."""
        x_min, x_max = (X[:, 0].min(), X[:, 0].max()) if len(X) > 0 else (-5.0, 5.0)
        y_min, y_max = (X[:, 1].min(), X[:, 1].max()) if len(X) > 0 else (-5.0, 5.0)
        x_pad = (x_max - x_min) * 0.1 if x_max > x_min else 1.0
        y_pad = (y_max - y_min) * 0.1 if y_max > y_min else 1.0
        xx, yy = np.meshgrid(
            np.linspace(x_min - x_pad, x_max + x_pad, resolution),
            np.linspace(y_min - y_pad, y_max + y_pad, resolution),
        )
        return np.c_[xx.ravel(), yy.ravel()]

    def _compute_sv_contributions(self, model: SVC, mesh_points: np.ndarray, idx_train: np.ndarray) -> List[Dict[str, Any]]:
        """
        For each support vector, evaluate alpha_i * y_i * K(sv, mesh_points) over the
        mesh grid and return the signed contribution array alongside summary stats.
        """
        dual_coefs = model.dual_coef_[0]   # shape (n_SVs,) — already alpha_i * y_i
        svs = model.support_vectors_        # shape (n_SVs, 2)
        kernel = model.kernel

        results = []
        for i, (alpha_y, sv) in enumerate(zip(dual_coefs, svs)):
            if kernel == "linear":
                K = mesh_points @ sv
            elif kernel == "rbf":
                gamma = model._gamma
                K = np.exp(-gamma * np.sum((mesh_points - sv) ** 2, axis=1))
            elif kernel == "poly":
                gamma = model._gamma
                K = (gamma * (mesh_points @ sv) + model.coef0) ** model.degree
            else:
                K = np.ones(len(mesh_points))

            contributions = alpha_y * K   # signed, shape (resolution*resolution,)
            results.append({
                "sv_index": int(idx_train[model.support_[i]]),  # index into X_2d
                "alpha_y": float(alpha_y),
                "sv_coords": sv.tolist(),
                "mean_abs_contribution": float(np.mean(np.abs(contributions))),
                "heatmap": contributions.tolist(),  # per-mesh-point signed contribution
            })

        return results

    def _generate_decision_boundary(self, w1: float, w2: float, b: float, X: np.ndarray, class_names: List[str], resolution: int = 50, model: Optional[SVC] = None, mesh_points: Optional[np.ndarray] = None) -> DecisionBoundaryData:
        """Generate mesh grid for boundary visualisation."""
        if mesh_points is None:
            mesh_points = self._make_mesh(X, resolution)

        if model is not None:
            pred_indices = model.predict(mesh_points)
            predictions = [class_names[int(idx)] for idx in pred_indices]
        else:
            pred_vals = mesh_points[:, 0] * w1 + mesh_points[:, 1] * w2 + b
            predictions = [class_names[1 if v > 0 else 0] for v in pred_vals]

        return DecisionBoundaryData(
            mesh_points=mesh_points.tolist(),
            predictions=predictions,
            dimensions=2
        )

    async def visualise(
        self,
        parameters: SVMParameters,
        dataset_param: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Return raw scatter data for 2D classification."""
        dataset = await self._resolve_dataset(dataset_param)
        X = np.array(dataset.X)
        y = np.array(dataset.y)
        feature_names = dataset.get_feature_names()
        target_name = dataset.info.target_name if dataset.info and hasattr(dataset.info, "target_name") else "target"
        class_names = dataset.get_target_names()

        n_features = X.shape[1]
        feature_x_idx = min(parameters.feature_x, n_features - 1)
        feature_y_idx = min(parameters.feature_y, n_features - 1)
        
        X_2d, y_2d, target_class_indices = self._get_2d_points(X, y, feature_x_idx, feature_y_idx)
        # Use only the names of the classes being shown
        visible_class_names = [class_names[i] for i in target_class_indices]

        # Build [[x1, x2], ...] scatter points
        points = [[float(x[0]), float(x[1])] for x in X_2d]

        x_min, x_max = float(X_2d[:, 0].min()) if len(X_2d) > 0 else -5.0, float(X_2d[:, 0].max()) if len(X_2d) > 0 else 5.0
        y_min, y_max = float(X_2d[:, 1].min()) if len(X_2d) > 0 else -5.0, float(X_2d[:, 1].max()) if len(X_2d) > 0 else 5.0
        x_margin = (x_max - x_min) * 0.1 if x_max > x_min else 1.0
        y_margin = (y_max - y_min) * 0.1 if y_max > y_min else 1.0

        metadata = SVMMetadata(
            feature_names=feature_names,
            n_features=n_features,
            n_classes=len(np.unique(y)),
            n_samples=len(y),
            target_name=target_name,
            feature_x_index=feature_x_idx,
            feature_x_name=feature_names[feature_x_idx],
            feature_y_index=feature_y_idx,
            feature_y_name=feature_names[feature_y_idx],
            class_names=visible_class_names, # Use visible names
            dataset_name=dataset.info.name if dataset.info else None,
        )

        decision_boundary = self._generate_decision_boundary(0, 0, 0, X_2d, visible_class_names, parameters.boundary_resolution if hasattr(parameters, "boundary_resolution") else 50)

        return {
            "success": True,
            "points": X_2d.tolist(),
            "labels": y_2d.tolist(),
            "x_range": [x_min - x_margin, x_max + x_margin],
            "y_range": [y_min - y_margin, y_max + y_margin],
            "decision_boundary": decision_boundary.model_dump(),
            "metadata": metadata.model_dump(),
        }


    async def train(
        self,
        parameters: SVMParameters,
        dataset_param: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Fit an SVM Classification model and return the optimal parameters."""
        dataset = await self._resolve_dataset(dataset_param)
        X_full = np.array(dataset.X)
        y_full = np.array(dataset.y)
        class_names = dataset.get_target_names()
        
        n_features = X_full.shape[1]
        feature_x_idx = min(parameters.feature_x, n_features - 1)
        feature_y_idx = min(parameters.feature_y, n_features - 1)

        X_2d, y_2d, target_class_indices = self._get_2d_points(X_full, y_full, feature_x_idx, feature_y_idx)
        visible_class_names = [class_names[i] for i in target_class_indices]
        
        indices = np.arange(len(X_2d))
        idx_train, idx_test, y_train, y_test = train_test_split(
            indices, y_2d,
            test_size=parameters.test_size,
            random_state=parameters.random_state,
            stratify=y_2d,
        )
        X_train = X_2d[idx_train]
        X_test = X_2d[idx_test]

        model = SVC(**parameters.to_sklearn_params())
        model.fit(X_train, y_train)

        # Extract weights if linear
        if parameters.kernel == "linear":
            w1 = float(model.coef_[0][0])
            w2 = float(model.coef_[0][1])
            b = float(model.intercept_[0])
        else:
            w1 = 0.0
            w2 = 0.0
            b = 0.0

        # model.support_ are indices into X_train; map back to indices into X_2d
        support_vector_indices = idx_train[model.support_].tolist()

        mesh_points = self._make_mesh(X_2d, parameters.boundary_resolution if hasattr(parameters, "boundary_resolution") else 50)
        sv_contributions = self._compute_sv_contributions(model, mesh_points, idx_train)

        train_metric_values = self._compute_metrics(y_train, model.predict(X_train))
        test_metric_values = None
        if len(y_test) > 0:
            test_metric_values = self._compute_metrics(y_test, model.predict(X_test))

        metrics = ClassificationMetrics(
            train=train_metric_values,
            test=test_metric_values
        )

        x_min, x_max = float(X_2d[:, 0].min()) if len(X_2d) > 0 else -5.0, float(X_2d[:, 0].max()) if len(X_2d) > 0 else 5.0
        y_min, y_max = float(X_2d[:, 1].min()) if len(X_2d) > 0 else -5.0, float(X_2d[:, 1].max()) if len(X_2d) > 0 else 5.0
        x_margin = (x_max - x_min) * 0.1 if x_max > x_min else 1.0
        y_margin = (y_max - y_min) * 0.1 if y_max > y_min else 1.0

        target_name = dataset.info.target_name if dataset.info and hasattr(dataset.info, "target_name") else "target"

        metadata = SVMMetadata(
            feature_names=dataset.get_feature_names(),
            n_features=n_features,
            n_classes=len(np.unique(y_full)),
            n_samples=len(y_full),
            target_name=target_name,
            feature_x_index=feature_x_idx,
            feature_x_name=dataset.get_feature_names()[feature_x_idx],
            feature_y_index=feature_y_idx,
            feature_y_name=dataset.get_feature_names()[feature_y_idx],
            class_names=visible_class_names, # Use visible names
            dataset_name=dataset.info.name if dataset.info else None,
        )

        return {
            "success": True,
            "points": X_2d.tolist(),
            "labels": y_2d.tolist(),
            "x_range": [x_min - x_margin, x_max + x_margin],
            "y_range": [y_min - y_margin, y_max + y_margin],
            "optimal_w1": w1,
            "optimal_w2": w2,
            "optimal_b": b,
            "support_vector_indices": support_vector_indices,
            "sv_contributions": sv_contributions,
            "boundary_resolution": parameters.boundary_resolution if hasattr(parameters, "boundary_resolution") else 50,
            "metrics": metrics.model_dump(),
            "decision_boundary": self._generate_decision_boundary(w1, w2, b, X_2d, visible_class_names, model=model, mesh_points=mesh_points).model_dump(),
            "metadata": metadata.model_dump(),
        }



    async def step(
        self,
        current_w1: float,
        current_w2: float,
        current_b: float,
        learning_rate: float,
        parameters: SVMParameters,
        dataset_param: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Perform a simple mock gradient step towards optimal parameters."""
        dataset = await self._resolve_dataset(dataset_param)
        X_full = np.array(dataset.X)
        y_full = np.array(dataset.y)
        class_names = dataset.get_target_names()
        
        feature_x_idx = min(parameters.feature_x, X_full.shape[1] - 1)
        feature_y_idx = min(parameters.feature_y, X_full.shape[1] - 1)
        X_2d, y_2d, target_class_indices = self._get_2d_points(X_full, y_full, feature_x_idx, feature_y_idx)
        visible_class_names = [class_names[i] for i in target_class_indices]

        # For demonstration purposes, we perform gradient descent on hinge loss
        # Map labels to -1, 1
        y_mapped = np.where(y_2d == 0, -1, 1)
        
        N = len(y_2d)
        margin = y_mapped * (X_2d[:, 0] * current_w1 + X_2d[:, 1] * current_w2 + current_b)
        
        # Subgradient
        misclassified = margin < 1
        
        grad_w1 = parameters.C * current_w1 # Regularization term
        grad_w2 = parameters.C * current_w2
        grad_b = 0.0
        
        if np.any(misclassified):
            grad_w1 -= np.sum(y_mapped[misclassified] * X_2d[misclassified, 0]) / N
            grad_w2 -= np.sum(y_mapped[misclassified] * X_2d[misclassified, 1]) / N
            grad_b -= np.sum(y_mapped[misclassified]) / N
            
        new_w1 = current_w1 - learning_rate * grad_w1
        new_w2 = current_w2 - learning_rate * grad_w2
        new_b = current_b - learning_rate * grad_b
        
        loss = self._compute_hinge_loss(X_2d, y_2d, new_w1, new_w2, new_b)

        return {
            "success": True,
            "new_w1": float(new_w1),
            "new_w2": float(new_w2),
            "new_b": float(new_b),
            "loss": loss,
            "decision_boundary": self._generate_decision_boundary(new_w1, new_w2, new_b, X_2d, visible_class_names, parameters.boundary_resolution if hasattr(parameters, "boundary_resolution") else 50).model_dump(),
        }


    async def predict(
        self,
        w1: float,
        w2: float,
        b: float,
        parameters: SVMParameters,
        dataset_param: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Compute metrics for an arbitrary boundary."""
        dataset = await self._resolve_dataset(dataset_param)
        X_full = np.array(dataset.X)
        y_full = np.array(dataset.y)
        class_names = dataset.get_target_names()

        feature_x_idx = min(parameters.feature_x, X_full.shape[1] - 1)
        feature_y_idx = min(parameters.feature_y, X_full.shape[1] - 1)
        X_2d, y_2d, target_class_indices = self._get_2d_points(X_full, y_full, feature_x_idx, feature_y_idx)
        visible_class_names = [class_names[i] for i in target_class_indices]

        # Build [[x, y], ...] scatter points
        points = [[float(x[0]), float(x[1])] for x in X_2d]

        # Predictions with current parameters
        y_pred = np.where(X_2d[:, 0] * w1 + X_2d[:, 1] * w2 + b > 0, 1, 0)
        
        # Metrics on train set
        metrics_values = self._compute_metrics(y_2d, y_pred)
        
        metrics = ClassificationMetrics(
            train=metrics_values,
            test=None
        )

        loss = self._compute_hinge_loss(X_2d, y_2d, w1, w2, b)

        return {
            "success": True,
            "loss": loss,
            "metrics": metrics.model_dump(),
            "decision_boundary": self._generate_decision_boundary(w1, w2, b, X_2d, visible_class_names, parameters.boundary_resolution if hasattr(parameters, "boundary_resolution") else 50).model_dump(),
        }


# Global service instance
svm_service = SVMService()
