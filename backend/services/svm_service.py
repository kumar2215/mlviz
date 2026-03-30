import json
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path

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
    """Service for SVM classification with a custom SMO optimiser.
    
    Implements the Sequential Minimal Optimization (SMO) algorithm so that
    training iterations are captured and returned for every kernel type
    (linear, rbf, poly), enabling kernel-agnostic animated playback.
    """

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
        labels = sorted(np.unique(np.concatenate([y_true, y_pred])))
        return ClassificationMetricValues(
            confusion_matrix=confusion_matrix(y_true, y_pred, labels=labels).tolist(),
            accuracy=accuracy_score(y_true, y_pred),
            precision=precision_score(y_true, y_pred, average="weighted", zero_division=0),
            recall=recall_score(y_true, y_pred, average="weighted", zero_division=0),
            f1=f1_score(y_true, y_pred, average="weighted", zero_division=0),
        )

    def _get_2d_points(self, X: np.ndarray, y: np.ndarray, feature_x_idx: int, feature_y_idx: int):
        X_reduced = X[:, [feature_x_idx, feature_y_idx]]
        unique_classes = np.unique(y)
        if len(unique_classes) > 2:
            target_classes = unique_classes[:2]
            mask = np.isin(y, target_classes)
            X_filtered, y_filtered = X_reduced[mask], y[mask]
        else:
            X_filtered, y_filtered = X_reduced, y
            target_classes = unique_classes

        if len(target_classes) >= 1:
            label_map = {label: i for i, label in enumerate(target_classes)}
            y_mapped = np.array([label_map[label] for label in y_filtered])
            return X_filtered, y_mapped, list(target_classes)

        return X_filtered, y_filtered, list(target_classes)

    def _resolve_gamma(self, parameters: SVMParameters, X: np.ndarray) -> float:
        """Return a concrete float gamma value."""
        if parameters.gamma is not None:
            return float(parameters.gamma)
        # "scale" default: 1 / (n_features * X.var())
        var = float(X.var())
        n_features = X.shape[1]
        return 1.0 / (n_features * var) if var > 0 else 1.0

    # -------------------------------------------------------------------------
    # Kernel evaluation
    # -------------------------------------------------------------------------

    def _kernel(
        self,
        X1: np.ndarray,
        X2: np.ndarray,
        kernel: str,
        gamma: float,
        degree: int,
    ) -> np.ndarray:
        """Compute kernel matrix K(X1, X2) → (n1, n2)."""
        if kernel == "linear":
            return X1 @ X2.T
        elif kernel == "rbf":
            # ||x1 - x2||² via identity: ||x1||² + ||x2||² - 2*x1·x2
            sq_dist = (
                np.sum(X1 ** 2, axis=1, keepdims=True)
                + np.sum(X2 ** 2, axis=1)
                - 2.0 * X1 @ X2.T
            )
            return np.exp(-gamma * np.clip(sq_dist, 0.0, None))
        elif kernel == "poly":
            return (gamma * X1 @ X2.T + 1.0) ** degree
        else:
            return X1 @ X2.T  # fallback

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

    # -------------------------------------------------------------------------
    # Custom SVM Optimizer: Projected Dual Gradient Ascent
    # -------------------------------------------------------------------------

    def _gd_train(
        self,
        X: np.ndarray,          # Training subset
        y_01: np.ndarray,       # labels in {0, 1}
        X_full: np.ndarray,     # Full dataset (for kernel space projection)
        C: float,
        kernel: str,
        gamma: float,
        degree: int,
        mesh_points: np.ndarray,
        class_names: List[str],
        idx_train: np.ndarray,      # indices mapping X rows → X_full rows
        boundary_resolution: int = 50,
        max_iter: int = 100,
        lr: float = 0.01,
    ) -> Tuple[List[Dict[str, Any]], np.ndarray, float, np.ndarray]:
        """
        Projected dual gradient ascent with iterative kernel space recording.
        """
        n = len(y_01)
        y = np.where(y_01 == 0, -1.0, 1.0)

        alpha = np.zeros(n)
        b = 0.0

        # Pre-compute essential kernels
        K = self._kernel(X, X, kernel, gamma, degree)
        K_mesh = self._kernel(X, mesh_points, kernel, gamma, degree)
        K_train_full = self._kernel(X, X_full, kernel, gamma, degree)

        # Pre-compute PC1 for kernel space visualization (if non-linear)
        pc1_full = np.zeros(len(X_full))
        if kernel != "linear":
            K_full = self._kernel(X_full, X_full, kernel, gamma, degree)
            n_f = len(X_full)
            one_n = np.ones((n_f, n_f)) / n_f
            K_c = K_full - one_n @ K_full - K_full @ one_n + one_n @ K_full @ one_n
            eigvals, eigvecs = np.linalg.eigh(K_c)
            top_idx = np.argsort(eigvals)[::-1][0]
            pc1_full = eigvecs[:, top_idx] * np.sqrt(np.maximum(eigvals[top_idx], 0))

        # Lipschitz constant for step size
        Q = (y[:, None] * y[None, :]) * K
        v = np.ones(len(y))
        for _ in range(10):
            v = Q @ v
            norm = np.linalg.norm(v)
            if norm > 0: v /= norm
        lambda_max = float(v @ Q @ v) or 1.0
        effective_lr = lr / lambda_max

        iterations: List[Dict[str, Any]] = []
        max_frames = 15
        store_every = max(1, max_iter // max_frames)

        for epoch in range(max_iter):
            f = (alpha * y) @ K + b
            grad = 1.0 - y * f
            alpha = np.clip(alpha + effective_lr * grad, 0.0, C)

            # Re-estimate bias
            sv_mask = (alpha > 1e-5) & (alpha < C - 1e-5)
            if sv_mask.any():
                b = float(np.mean(y[sv_mask] - (alpha * y) @ K[:, sv_mask]))

            if epoch % store_every == 0 or epoch == max_iter - 1:
                # 1. Original space mesh
                scores_mesh = (alpha * y) @ K_mesh + b
                mesh_preds = [class_names[1 if s > 0.0 else 0] for s in scores_mesh]

                # 2. Kernel space projection
                k_points = None
                k_boundary = None
                if kernel != "linear":
                    scores_full = (alpha * y) @ K_train_full + b
                    # Normalize by SV margin
                    all_sv_mask = (alpha > 1e-5)
                    if all_sv_mask.any():
                        avg_sv_score = np.mean(np.abs(scores_full[idx_train][all_sv_mask]))
                        if avg_sv_score > 1e-8: scores_full /= avg_sv_score
                    
                    k_points = np.c_[scores_full, pc1_full].tolist()
                    
                    # Boundary mesh in kernel space
                    pk = np.abs(k_points).max(axis=0) * 0.2 + 0.1
                    z1 = np.linspace(np.min(scores_full) - pk[0], np.max(scores_full) + pk[0], boundary_resolution)
                    z2 = np.linspace(np.min(pc1_full) - pk[1], np.max(pc1_full) + pk[1], boundary_resolution)
                    zz1, zz2 = np.meshgrid(z1, z2)
                    mesh_k = np.c_[zz1.ravel(), zz2.ravel()]
                    k_boundary = {
                        "mesh_points": mesh_k.tolist(),
                        "predictions": [class_names[1 if s > 0.0 else 0] for s in mesh_k[:, 0]],
                        "dimensions": 2
                    }

                loss = float(np.mean(np.maximum(0.0, 1.0 - y * f)))
                w1_it, w2_it = (float(v) for v in (alpha * y) @ X) if kernel == "linear" else (0.0, 0.0)

                # Record full alpha vector for all points in X_full
                full_alphas = np.zeros(len(X_full))
                full_alphas[idx_train] = alpha

                iterations.append({
                    "iteration": epoch,
                    "w1": w1_it,
                    "w2": w2_it,
                    "b": float(b),
                    "loss": loss,
                    "mesh_predictions": mesh_preds,
                    "support_vector_indices": idx_train[alpha > 1e-5].tolist(),
                    "kernel_space_points": k_points,
                    "kernel_space_boundary": k_boundary,
                    "alphas": full_alphas.tolist(),
                })

        sv_indices = np.where(alpha > 1e-5)[0]
        return iterations, alpha, b, sv_indices

    # -------------------------------------------------------------------------
    # SV Contributions (for heatmap overlay)
    # -------------------------------------------------------------------------

    def _compute_sv_contributions(
        self,
        alpha: np.ndarray,
        y_01: np.ndarray,
        X_train: np.ndarray,
        sv_indices_local: np.ndarray,  # indices into X_train
        sv_indices_global: np.ndarray, # indices into X_2d
        mesh_points: np.ndarray,
        kernel: str,
        gamma: float,
        degree: int,
    ) -> List[Dict[str, Any]]:
        """Compute per-SV signed contribution across the mesh."""
        y = np.where(y_01 == 0, -1.0, 1.0)
        svs = X_train[sv_indices_local]
        dual_coefs = alpha[sv_indices_local] * y[sv_indices_local]  # alpha_i * y_i

        results = []
        for i, (alpha_y, sv, global_idx) in enumerate(
            zip(dual_coefs, svs, sv_indices_global)
        ):
            K_sv_mesh = self._kernel(sv[np.newaxis, :], mesh_points, kernel, gamma, degree)[0]
            contributions = float(alpha_y) * K_sv_mesh
            results.append({
                "sv_index": int(global_idx),
                "alpha_y": float(alpha_y),
                "sv_coords": sv.tolist(),
                "mean_abs_contribution": float(np.mean(np.abs(contributions))),
                "heatmap": contributions.tolist(),
            })
        return results

    def _compute_hinge_loss(self, X: np.ndarray, y: np.ndarray, w1: float, w2: float, b: float) -> float:
        y_mapped = np.where(y == 0, -1, 1)
        margins = y_mapped * (X[:, 0] * w1 + X[:, 1] * w2 + b)
        loss = np.maximum(0, 1 - margins)
        return float(np.mean(loss))

    def _generate_decision_boundary(
        self,
        alpha: np.ndarray,
        y_01: np.ndarray,
        X_train: np.ndarray,
        b: float,
        kernel: str,
        gamma: float,
        degree: int,
        class_names: List[str],
        mesh_points: np.ndarray,
    ) -> DecisionBoundaryData:
        """Generate final decision boundary using the trained dual model."""
        y = np.where(y_01 == 0, -1.0, 1.0)
        K_mesh = self._kernel(X_train, mesh_points, kernel, gamma, degree)
        scores = (alpha * y) @ K_mesh + b
        predictions = [class_names[1 if s > 0.0 else 0] for s in scores]
        return DecisionBoundaryData(
            mesh_points=mesh_points.tolist(),
            predictions=predictions,
            dimensions=2,
        )

    # -------------------------------------------------------------------------
    # SVM predict using dual model
    # -------------------------------------------------------------------------

    def _predict_dual(
        self,
        X_query: np.ndarray,
        alpha: np.ndarray,
        y_01: np.ndarray,
        X_train: np.ndarray,
        b: float,
        kernel: str,
        gamma: float,
        degree: int,
    ) -> np.ndarray:
        """Predict class labels (0/1) for X_query using the trained dual SVM."""
        y = np.where(y_01 == 0, -1.0, 1.0)
        K = self._kernel(X_train, X_query, kernel, gamma, degree)
        scores = (alpha * y) @ K + b
        return (scores > 0.0).astype(int)

    # -------------------------------------------------------------------------
    # Public API methods
    # -------------------------------------------------------------------------

    async def visualise(
        self,
        parameters: SVMParameters,
        dataset_param: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Return raw scatter data for 2D classification (no training)."""
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
        visible_class_names = [class_names[i] for i in target_class_indices]

        x_min, x_max = float(X_2d[:, 0].min()), float(X_2d[:, 0].max())
        y_min, y_max = float(X_2d[:, 1].min()), float(X_2d[:, 1].max())
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
            class_names=visible_class_names,
            dataset_name=dataset.info.name if dataset.info else None,
        )

        # Trivial zero-weight boundary for visualisation
        mesh_points = self._make_mesh(X_2d, parameters.boundary_resolution if hasattr(parameters, "boundary_resolution") else 50)
        decision_boundary = DecisionBoundaryData(
            mesh_points=mesh_points.tolist(),
            predictions=[visible_class_names[0]] * len(mesh_points),
            dimensions=2,
        )

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
        """
        Train SVM using a custom SMO optimiser.
        Returns per-iteration mesh predictions for all kernel types,
        enabling kernel-agnostic animated playback on the frontend.
        """
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

        boundary_resolution = parameters.boundary_resolution if hasattr(parameters, "boundary_resolution") else 50
        gamma = self._resolve_gamma(parameters, X_train)
        degree = parameters.degree
        kernel = parameters.kernel
        C = parameters.C
        max_iter = parameters.max_iterations if hasattr(parameters, "max_iterations") else 100

        mesh_points = self._make_mesh(X_2d, boundary_resolution)

        # ── Run custom Dual Gradient Ascent ───────────────────────────────────
        iterations, final_alpha, final_b, sv_local = self._gd_train(
            X_train, y_train, X_2d, C, kernel, gamma, degree,
            mesh_points, visible_class_names,
            idx_train=idx_train,
            boundary_resolution=boundary_resolution,
            max_iter=max_iter,
            lr=parameters.learning_rate,
        )

        # Map local (train-subset) SV indices back to X_2d indices
        sv_global = idx_train[sv_local]

        # Weights (only meaningful for linear kernel)
        if kernel == "linear":
            y_signed = np.where(y_train == 0, -1.0, 1.0)
            w = (final_alpha * y_signed) @ X_train
            optimal_w1, optimal_w2 = float(w[0]), float(w[1])
        else:
            optimal_w1, optimal_w2 = 0.0, 0.0

        # ── Evaluation metrics ────────────────────────────────────────────────
        y_train_pred = self._predict_dual(X_train, final_alpha, y_train, X_train, final_b, kernel, gamma, degree)
        train_metrics = self._compute_metrics(y_train, y_train_pred)

        test_metrics = None
        if len(y_test) > 0:
            y_test_pred = self._predict_dual(X_test, final_alpha, y_train, X_train, final_b, kernel, gamma, degree)
            test_metrics = self._compute_metrics(y_test, y_test_pred)

        metrics = ClassificationMetrics(train=train_metrics, test=test_metrics)

        # ── Final boundary ────────────────────────────────────────────────────
        decision_boundary = self._generate_decision_boundary(
            final_alpha, y_train, X_train, final_b,
            kernel, gamma, degree, visible_class_names, mesh_points,
        )

        x_min, x_max = float(X_2d[:, 0].min()), float(X_2d[:, 0].max())
        y_min, y_max = float(X_2d[:, 1].min()), float(X_2d[:, 1].max())
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
            class_names=visible_class_names,
            dataset_name=dataset.info.name if dataset.info else None,
        )

        return {
            "success": True,
            "points": X_2d.tolist(),
            "labels": y_2d.tolist(),
            "x_range": [x_min - x_margin, x_max + x_margin],
            "y_range": [y_min - y_margin, y_max + y_margin],
            "optimal_w1": optimal_w1,
            "optimal_w2": optimal_w2,
            "optimal_b": float(final_b),
            "support_vector_indices": sv_global.tolist(),
            "boundary_resolution": boundary_resolution,
            "metrics": metrics.model_dump(),
            "decision_boundary": decision_boundary.model_dump(),
            "metadata": metadata.model_dump(),
            "iterations": iterations,
            "total_iterations": len(iterations),
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
        """Perform a single subgradient descent step (linear-kernel, manual mode)."""
        dataset = await self._resolve_dataset(dataset_param)
        X_full = np.array(dataset.X)
        y_full = np.array(dataset.y)
        class_names = dataset.get_target_names()

        feature_x_idx = min(parameters.feature_x, X_full.shape[1] - 1)
        feature_y_idx = min(parameters.feature_y, X_full.shape[1] - 1)
        X_2d, y_2d, target_class_indices = self._get_2d_points(X_full, y_full, feature_x_idx, feature_y_idx)
        visible_class_names = [class_names[i] for i in target_class_indices]

        y_mapped = np.where(y_2d == 0, -1, 1)
        N = len(y_2d)
        margin = y_mapped * (X_2d[:, 0] * current_w1 + X_2d[:, 1] * current_w2 + current_b)

        misclassified = margin < 1

        grad_w1 = parameters.C * current_w1
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
        boundary_resolution = parameters.boundary_resolution if hasattr(parameters, "boundary_resolution") else 50
        mesh_points = self._make_mesh(X_2d, boundary_resolution)

        return {
            "success": True,
            "new_w1": float(new_w1),
            "new_w2": float(new_w2),
            "new_b": float(new_b),
            "loss": loss,
            "decision_boundary": DecisionBoundaryData(
                mesh_points=mesh_points.tolist(),
                predictions=[visible_class_names[1 if p[0] * new_w1 + p[1] * new_w2 + new_b > 0 else 0] for p in mesh_points],
                dimensions=2,
            ).model_dump(),
        }

    async def predict(
        self,
        w1: float,
        w2: float,
        b: float,
        parameters: SVMParameters,
        dataset_param: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Compute metrics for an arbitrary linear boundary (manual step mode)."""
        dataset = await self._resolve_dataset(dataset_param)
        X_full = np.array(dataset.X)
        y_full = np.array(dataset.y)
        class_names = dataset.get_target_names()

        feature_x_idx = min(parameters.feature_x, X_full.shape[1] - 1)
        feature_y_idx = min(parameters.feature_y, X_full.shape[1] - 1)
        X_2d, y_2d, target_class_indices = self._get_2d_points(X_full, y_full, feature_x_idx, feature_y_idx)
        visible_class_names = [class_names[i] for i in target_class_indices]

        y_pred = np.where(X_2d[:, 0] * w1 + X_2d[:, 1] * w2 + b > 0, 1, 0)
        metrics_values = self._compute_metrics(y_2d, y_pred)
        metrics = ClassificationMetrics(train=metrics_values, test=None)

        loss = self._compute_hinge_loss(X_2d, y_2d, w1, w2, b)
        boundary_resolution = parameters.boundary_resolution if hasattr(parameters, "boundary_resolution") else 50
        mesh_points = self._make_mesh(X_2d, boundary_resolution)

        return {
            "success": True,
            "loss": loss,
            "metrics": metrics.model_dump(),
            "decision_boundary": DecisionBoundaryData(
                mesh_points=mesh_points.tolist(),
                predictions=[visible_class_names[1 if p[0] * w1 + p[1] * w2 + b > 0 else 0] for p in mesh_points],
                dimensions=2,
            ).model_dump(),
        }


# Global service instance
svm_service = SVMService()
