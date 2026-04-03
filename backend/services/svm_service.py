import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from models import (
    ClassificationDataset,
    ClassificationMetadata,
    ClassificationMetrics,
    ClassificationMetricValues,
    DecisionBoundaryData,
    PredefinedClassificationDataset,
    SVMMetadata,
    SVMParameters,
)
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split

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
                PredefinedClassificationDataset(name="simple_binary")
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

    def _compute_metrics(
        self, y_true: np.ndarray, y_pred: np.ndarray
    ) -> ClassificationMetricValues:
        """Compute classification metrics given true and predicted values."""
        labels = sorted(np.unique(np.concatenate([y_true, y_pred])))
        return ClassificationMetricValues(
            confusion_matrix=confusion_matrix(y_true, y_pred, labels=labels).tolist(),
            accuracy=accuracy_score(y_true, y_pred),
            precision=precision_score(
                y_true, y_pred, average="weighted", zero_division=0
            ),
            recall=recall_score(y_true, y_pred, average="weighted", zero_division=0),
            f1=f1_score(y_true, y_pred, average="weighted", zero_division=0),
        )

    def _get_2d_points(
        self, X: np.ndarray, y: np.ndarray, feature_x_idx: int, feature_y_idx: int
    ):
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

    # -------------------------------------------------------------------------
    # Kernel evaluation
    # -------------------------------------------------------------------------

    def _kernel(
        self,
        X1: np.ndarray,
        X2: np.ndarray,
    ) -> np.ndarray:
        """Compute linear kernel matrix K(X1, X2) → (n1, n2)."""
        return X1 @ X2.T

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
    # Custom SVM Optimizer: Simplified SMO
    # -------------------------------------------------------------------------

    def _gd_train(
        self,
        X: np.ndarray,  # Training subset
        y_01: np.ndarray,  # labels in {0, 1}
        X_full: np.ndarray,  # Full dataset
        C: float,
        margin_type: str,
        mesh_points: np.ndarray,
        class_names: List[str],
        idx_train: np.ndarray,  # indices mapping X rows → X_full rows
        boundary_resolution: int = 50,
        max_iter: int = 500,
    ) -> Tuple[List[Dict[str, Any]], np.ndarray, float, np.ndarray]:
        """
        Simplified SMO: each pass picks the worst KKT-violating pair,
        solves the 2-variable subproblem analytically, then updates b.
        This guarantees sum(alpha*y)=0 exactly at every step and converges
        to well-defined support vectors.
        """
        n = len(y_01)
        y = np.where(y_01 == 0, -1.0, 1.0)
        if margin_type == "hard":
            C = 1e9  # Enforce hard margin

        alpha = np.zeros(n)
        b = 0.0

        # Pre-compute essential kernels
        K = self._kernel(X, X)
        K_mesh = self._kernel(X, mesh_points)

        all_frames: List[Dict[str, Any]] = []
        max_frames = 15
        sv_tol = max(1e-5, C * 1e-3)
        current_optimise_pair = []

        def _record_frame(f_cur: np.ndarray, epoch: int) -> None:
            scores_mesh = (alpha * y) @ K_mesh + b
            mesh_preds = [class_names[1 if s > 0.0 else 0] for s in scores_mesh]

            w_it = (alpha * y) @ X
            w1_it, w2_it, b_it = float(w_it[0]), float(w_it[1]), float(b)

            full_alphas = np.zeros(len(X_full))
            full_alphas[idx_train] = alpha

            functional_margins = y * f_cur
            geom_sv_mask = (functional_margins <= 1.0 + 0.15) & (alpha > 1e-7)

            all_frames.append(
                {
                    "iteration": epoch,
                    "w1": w1_it,
                    "w2": w2_it,
                    "b": b_it,
                    "loss": float(np.mean(np.maximum(0.0, 1.0 - y * f_cur))),
                    "mesh_predictions": mesh_preds,
                    "support_vector_indices": idx_train[geom_sv_mask].tolist(),
                    "alphas": full_alphas.tolist(),
                    "optimised_points": current_optimise_pair.copy(),
                }
            )

        f = K @ (alpha * y) + b

        for epoch in range(max_iter):
            # One full pass: try to update every point as i
            n_changed = 0
            for i in range(n):
                f = K @ (alpha * y) + b
                Ei = float(f[i]) - float(y[i])
                ri = float(y[i]) * float(f[i]) - 1.0

                # Skip if this point already satisfies KKT
                kkt_ok = (
                    (alpha[i] < sv_tol and ri >= -1e-3)
                    or (alpha[i] > C - sv_tol and ri <= 1e-3)
                    or (sv_tol <= alpha[i] <= C - sv_tol and abs(ri) <= 1e-3)
                )
                if kkt_ok:
                    continue

                # Pick j: maximum |Ei - Ej| heuristic
                E_all = f - y
                diffs = np.abs(Ei - E_all)
                diffs[i] = -1.0
                j = int(np.argmax(diffs))

                ai_old, aj_old = alpha[i], alpha[j]
                yi, yj = y[i], y[j]

                eta = K[i, i] + K[j, j] - 2.0 * K[i, j]
                if eta <= 1e-12:
                    continue

                if yi == yj:
                    L = max(0.0, aj_old + ai_old - C)
                    H = min(C, aj_old + ai_old)
                else:
                    L = max(0.0, aj_old - ai_old)
                    H = min(C, C + aj_old - ai_old)

                if H <= L + 1e-12:
                    continue

                Ej = float(f[j]) - float(yj)
                aj_new = np.clip(aj_old + yj * (Ei - Ej) / eta, L, H)

                if abs(aj_new - aj_old) < 1e-8:
                    continue

                ai_new = ai_old + yi * yj * (aj_old - aj_new)
                alpha[i], alpha[j] = ai_new, aj_new

                b1 = (
                    b
                    - Ei
                    - yi * (ai_new - ai_old) * K[i, i]
                    - yj * (aj_new - aj_old) * K[i, j]
                )
                b2 = (
                    b
                    - Ej
                    - yi * (ai_new - ai_old) * K[i, j]
                    - yj * (aj_new - aj_old) * K[j, j]
                )
                if 0 < ai_new < C:
                    b = float(b1)
                elif 0 < aj_new < C:
                    b = float(b2)
                else:
                    b = float((b1 + b2) / 2.0)
                current_optimise_pair = [int(idx_train[i]), int(idx_train[j])]

                n_changed += 1

                # Record a frame after each successful (i, j) alpha update
                f_updated = K @ (alpha * y) + b
                _record_frame(f_updated, epoch)

            f = K @ (alpha * y) + b

            if n_changed == 0:
                break  # converged — all points satisfy KKT

        # Always record the final converged state
        scores_mesh_final = (alpha * y) @ K_mesh + b
        mesh_preds_final = [class_names[1 if s > 0.0 else 0] for s in scores_mesh_final]
        full_alphas_final = np.zeros(len(X_full))
        full_alphas_final[idx_train] = alpha

        w_final = (alpha * y) @ X
        w1_f, w2_f, b_f = float(w_final[0]), float(w_final[1]), float(b)

        f_final = K @ (alpha * y) + b
        functional_margins_final = y * f_final
        geom_sv_mask_final = (functional_margins_final <= 1.0 + 0.15) & (alpha > 1e-7)

        final_frame = {
            "iteration": epoch,
            "w1": w1_f,
            "w2": w2_f,
            "b": b_f,
            "loss": float(np.mean(np.maximum(0.0, 1.0 - y * f_final))),
            "mesh_predictions": mesh_preds_final,
            "support_vector_indices": idx_train[geom_sv_mask_final].tolist(),
            "alphas": full_alphas_final.tolist(),
            "optimised_points": current_optimise_pair.copy(),
        }

        # Downsample all_frames to max_frames evenly, always keeping the final frame
        if len(all_frames) <= max_frames - 1:
            iterations = all_frames
        else:
            indices = [
                int(i * (len(all_frames) - 1) / (max_frames - 2))
                for i in range(max_frames - 1)
            ]
            seen = set()
            iterations = []
            for idx in indices:
                if idx not in seen:
                    seen.add(idx)
                    iterations.append(all_frames[idx])
        iterations.append(final_frame)

        # Final SV indices: geometric condition — on or inside the margin
        f_conv = K @ (alpha * y) + b
        functional_margins_conv = y * f_conv
        sv_indices = np.where((functional_margins_conv <= 1.0 + 0.15) & (alpha > 1e-7))[
            0
        ]
        return iterations, alpha, b, sv_indices

    def _compute_hinge_loss(
        self, X: np.ndarray, y: np.ndarray, w1: float, w2: float, b: float
    ) -> float:
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
        class_names: List[str],
        mesh_points: np.ndarray,
    ) -> DecisionBoundaryData:
        """Generate final decision boundary using the trained dual model."""
        y = np.where(y_01 == 0, -1.0, 1.0)
        K_mesh = self._kernel(X_train, mesh_points)
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
    ) -> np.ndarray:
        """Predict class labels (0/1) for X_query using the trained dual SVM."""
        y = np.where(y_01 == 0, -1.0, 1.0)
        K = self._kernel(X_train, X_query)
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
        target_name = (
            dataset.info.target_name
            if dataset.info and hasattr(dataset.info, "target_name")
            else "target"
        )
        class_names = dataset.get_target_names()

        n_features = X.shape[1]
        feature_x_idx = min(parameters.feature_x, n_features - 1)
        feature_y_idx = min(parameters.feature_y, n_features - 1)

        X_2d, y_2d, target_class_indices = self._get_2d_points(
            X, y, feature_x_idx, feature_y_idx
        )
        visible_class_names = [class_names[i] for i in target_class_indices]

        x_min, x_max = float(X_2d[:, 0].min()), float(X_2d[:, 0].max())
        y_min, y_max = float(X_2d[:, 1].min()), float(X_2d[:, 1].max())
        x_margin = (x_max - x_min) * 0.1 if x_max > x_min else 1.0
        y_margin = (y_max - y_min) * 0.1 if y_max > y_min else 1.0

        metadata = SVMMetadata(
            feature_names=feature_names,
            n_features=n_features,
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
        mesh_points = self._make_mesh(
            X_2d,
            parameters.boundary_resolution
            if hasattr(parameters, "boundary_resolution")
            else 50,
        )
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

        X_2d, y_2d, target_class_indices = self._get_2d_points(
            X_full, y_full, feature_x_idx, feature_y_idx
        )
        visible_class_names = [class_names[i] for i in target_class_indices]

        indices = np.arange(len(X_2d))
        idx_train, idx_test, y_train, y_test = train_test_split(
            indices,
            y_2d,
            test_size=0.2,
            random_state=42,
            stratify=y_2d,
        )
        X_train = X_2d[idx_train]
        X_test = X_2d[idx_test]

        boundary_resolution = (
            parameters.boundary_resolution
            if hasattr(parameters, "boundary_resolution")
            else 50
        )
        margin_type = parameters.margin_type
        C = parameters.C
        max_iter = parameters.max_iterations

        mesh_points = self._make_mesh(X_2d, boundary_resolution)

        # ── Run custom Dual Gradient Ascent ───────────────────────────────────
        iterations, final_alpha, final_b, sv_local = self._gd_train(
            X_train,
            y_train,
            X_2d,
            C,
            margin_type,
            mesh_points,
            visible_class_names,
            idx_train=idx_train,
            boundary_resolution=boundary_resolution,
            max_iter=max_iter,
        )

        # Map local (train-subset) SV indices back to X_2d indices
        sv_global = idx_train[sv_local]

        # Weights
        y_signed = np.where(y_train == 0, -1.0, 1.0)
        w = (final_alpha * y_signed) @ X_train
        optimal_w1, optimal_w2 = float(w[0]), float(w[1])

        # ── Evaluation metrics ────────────────────────────────────────────────
        y_train_pred = self._predict_dual(
            X_train, final_alpha, y_train, X_train, final_b
        )
        train_metrics = self._compute_metrics(y_train, y_train_pred)

        test_metrics = None
        if len(y_test) > 0:
            y_test_pred = self._predict_dual(
                X_test, final_alpha, y_train, X_train, final_b
            )
            test_metrics = self._compute_metrics(y_test, y_test_pred)

        metrics = ClassificationMetrics(train=train_metrics, test=test_metrics)

        # ── Final boundary ────────────────────────────────────────────────────
        decision_boundary = self._generate_decision_boundary(
            final_alpha,
            y_train,
            X_train,
            final_b,
            visible_class_names,
            mesh_points,
        )

        x_min, x_max = float(X_2d[:, 0].min()), float(X_2d[:, 0].max())
        y_min, y_max = float(X_2d[:, 1].min()), float(X_2d[:, 1].max())
        x_margin = (x_max - x_min) * 0.1 if x_max > x_min else 1.0
        y_margin = (y_max - y_min) * 0.1 if y_max > y_min else 1.0

        target_name = (
            dataset.info.target_name
            if dataset.info and hasattr(dataset.info, "target_name")
            else "target"
        )
        metadata = SVMMetadata(
            feature_names=dataset.get_feature_names(),
            n_features=n_features,
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
        X_2d, y_2d, target_class_indices = self._get_2d_points(
            X_full, y_full, feature_x_idx, feature_y_idx
        )
        visible_class_names = [class_names[i] for i in target_class_indices]

        y_mapped = np.where(y_2d == 0, -1, 1)
        N = len(y_2d)
        margin = y_mapped * (
            X_2d[:, 0] * current_w1 + X_2d[:, 1] * current_w2 + current_b
        )

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
        boundary_resolution = (
            parameters.boundary_resolution
            if hasattr(parameters, "boundary_resolution")
            else 50
        )
        mesh_points = self._make_mesh(X_2d, boundary_resolution)

        return {
            "success": True,
            "new_w1": float(new_w1),
            "new_w2": float(new_w2),
            "new_b": float(new_b),
            "loss": loss,
            "decision_boundary": DecisionBoundaryData(
                mesh_points=mesh_points.tolist(),
                predictions=[
                    visible_class_names[
                        1 if p[0] * new_w1 + p[1] * new_w2 + new_b > 0 else 0
                    ]
                    for p in mesh_points
                ],
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
        X_2d, y_2d, target_class_indices = self._get_2d_points(
            X_full, y_full, feature_x_idx, feature_y_idx
        )
        visible_class_names = [class_names[i] for i in target_class_indices]

        y_pred = np.where(X_2d[:, 0] * w1 + X_2d[:, 1] * w2 + b > 0, 1, 0)
        metrics_values = self._compute_metrics(y_2d, y_pred)
        metrics = ClassificationMetrics(train=metrics_values, test=None)

        loss = self._compute_hinge_loss(X_2d, y_2d, w1, w2, b)
        boundary_resolution = (
            parameters.boundary_resolution
            if hasattr(parameters, "boundary_resolution")
            else 50
        )
        mesh_points = self._make_mesh(X_2d, boundary_resolution)

        return {
            "success": True,
            "loss": loss,
            "metrics": metrics.model_dump(),
            "decision_boundary": DecisionBoundaryData(
                mesh_points=mesh_points.tolist(),
                predictions=[
                    visible_class_names[1 if p[0] * w1 + p[1] * w2 + b > 0 else 0]
                    for p in mesh_points
                ],
                dimensions=2,
            ).model_dump(),
        }


# Global service instance
svm_service = SVMService()
