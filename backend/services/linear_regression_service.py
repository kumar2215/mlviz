import json
import numpy as np
from typing import Dict, List, Optional, Any
from pathlib import Path

from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error

from models import (
    LinearRegressionParameters,
    RegressionMetadata,
    RegressionMetrics,
    RegressionMetricValues,
    RegressionDataset,
)
from services.dataset_service import dataset_service


class LinearRegressionService:
    """Service for Simple Linear Regression visualisation and gradient descent."""

    def __init__(self):
        self._load_parameter_config()

    def _load_parameter_config(self):
        config_path = Path(__file__).parent.parent / "config" / "linear_regression_params.json"
        with open(config_path) as f:
            self.param_config = json.load(f)

    async def get_parameters(self) -> List[Dict[str, Any]]:
        """Get linear regression parameter configuration."""
        return self.param_config["parameters"]

    async def _resolve_dataset(
        self,
        dataset_param: Optional[Any],
    ) -> RegressionDataset:
        return await dataset_service.resolve_regression_dataset(dataset_param)

    def _compute_metrics(self, y_true: np.ndarray, y_pred: np.ndarray) -> RegressionMetricValues:
        """Compute regression metrics given true and predicted values."""
        r2 = float(r2_score(y_true, y_pred))
        mse = float(mean_squared_error(y_true, y_pred))
        rmse = float(np.sqrt(mse))
        mae = float(mean_absolute_error(y_true, y_pred))
        return RegressionMetricValues(r2=r2, mse=mse, rmse=rmse, mae=mae)

    async def visualise(
        self,
        parameters: LinearRegressionParameters,
        dataset_param: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Return raw scatter data for the chosen feature vs target.

        No model fitting is performed. The frontend uses this data
        to render the scatter plot and compute R² for any user-drawn line.

        Args:
            parameters: Algorithm parameters (uses feature_x index)
            dataset_param: Dataset to use. Defaults to diabetes.

        Returns:
            Dict with points, metadata, and axis ranges.
        """
        dataset = await self._resolve_dataset(dataset_param)
        X = np.array(dataset.X)
        y = np.array(dataset.y)
        feature_names = dataset.get_feature_names()
        target_name = dataset.target_name or "target"

        n_features = X.shape[1]
        feature_x_idx = min(parameters.feature_x, n_features - 1)
        x_vals = X[:, feature_x_idx]

        # Build [[x, y], ...] scatter points
        points = [[float(x), float(yi)] for x, yi in zip(x_vals, y)]

        x_min, x_max = float(x_vals.min()), float(x_vals.max())
        y_min, y_max = float(y.min()), float(y.max())
        x_margin = (x_max - x_min) * 0.05
        y_margin = (y_max - y_min) * 0.05

        metadata = RegressionMetadata(
            feature_names=feature_names,
            n_features=n_features,
            n_samples=len(y),
            target_name=target_name,
            feature_x_index=feature_x_idx,
            feature_x_name=feature_names[feature_x_idx],
        )

        return {
            "success": True,
            "points": points,
            "x_range": [x_min - x_margin, x_max + x_margin],
            "y_range": [y_min - y_margin, y_max + y_margin],
            "metadata": metadata.model_dump(),
        }

    async def train(
        self,
        parameters: LinearRegressionParameters,
        dataset_param: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Fit an OLS Linear Regression model and return the optimal line + metrics.

        Splits dataset into train/test, fits on a single feature (feature_x),
        and returns the optimal slope and intercept alongside regression metrics.
        The frontend uses these as the "target" the user tries to match interactively.

        Args:
            parameters: Algorithm parameters
            dataset_param: Dataset to use. Defaults to diabetes.

        Returns:
            Dict with scatter points, optimal line (slope/intercept), train + test metrics.
        """
        dataset = await self._resolve_dataset(dataset_param)
        X_full = np.array(dataset.X)
        y_full = np.array(dataset.y, dtype=float)
        feature_names = dataset.get_feature_names()
        target_name = dataset.target_name or "target"

        n_features = X_full.shape[1]
        feature_x_idx = min(parameters.feature_x, n_features - 1)
        x_vals = X_full[:, feature_x_idx].reshape(-1, 1)

        # Train / test split on the chosen single feature
        X_train, X_test, y_train, y_test = train_test_split(
            x_vals, y_full,
            test_size=parameters.test_size,
            random_state=parameters.random_state,
        )

        # Fit OLS
        model = LinearRegression(fit_intercept=parameters.fit_intercept)
        model.fit(X_train, y_train)

        slope = float(model.coef_[0])
        intercept = float(model.intercept_) if parameters.fit_intercept else 0.0

        # Metrics on train set
        y_pred_train = model.predict(X_train)
        train_metric_values = self._compute_metrics(y_train, y_pred_train)

        # Metrics on test set
        test_metric_values = None
        if len(y_test) > 0:
            y_pred_test = model.predict(X_test)
            test_metric_values = self._compute_metrics(y_test, y_pred_test)

        train_metrics = RegressionMetrics(
            train=train_metric_values,
            test=test_metric_values
        )

        # All scatter points (full dataset, for display)
        x_display = X_full[:, feature_x_idx]
        points = [[float(xi), float(yi)] for xi, yi in zip(x_display, y_full)]

        # Train/test point indices (for coloring on frontend)
        all_x = x_vals.flatten()
        _, X_test_flat, _, y_test_arr = train_test_split(
            x_vals.flatten(), y_full,
            test_size=parameters.test_size,
            random_state=parameters.random_state,
        )

        x_min, x_max = float(x_display.min()), float(x_display.max())
        y_min, y_max = float(y_full.min()), float(y_full.max())
        x_margin = (x_max - x_min) * 0.05
        y_margin = (y_max - y_min) * 0.05

        metadata = RegressionMetadata(
            feature_names=feature_names,
            n_features=n_features,
            n_samples=len(y_full),
            target_name=target_name,
            feature_x_index=feature_x_idx,
            feature_x_name=feature_names[feature_x_idx],
        )

        return {
            "success": True,
            "points": points,
            "x_range": [x_min - x_margin, x_max + x_margin],
            "y_range": [y_min - y_margin, y_max + y_margin],
            "line": {
                "slope": slope,
                "intercept": intercept,
            },
            "metrics": train_metrics.model_dump(),
            "metadata": metadata.model_dump(),
        }

    async def evaluate(
        self,
        slope: float,
        intercept: float,
        points: List[List[float]],
    ) -> Dict[str, Any]:
        """Evaluate an arbitrary line against the given points.

        Args:
            slope: Slope of the line
            intercept: Intercept of the line
            points: List of [x, y] data points

        Returns:
            Dict with evaluation metrics.
        """
        pts = np.array(points, dtype=float)
        x_vals = pts[:, 0]
        y_true = pts[:, 1]

        y_pred = slope * x_vals + intercept
        metric_values = self._compute_metrics(y_true, y_pred)
        
        metrics = RegressionMetrics(
            train=metric_values,
        )

        return {
            "success": True,
            "metrics": metrics.model_dump(),
        }

    async def step(
        self,
        slope: float,
        intercept: float,
        learning_rate: float,
        points: List[List[float]],
        fit_intercept: bool = True,
    ) -> Dict[str, Any]:
        """Perform a single gradient descent step from the given slope/intercept.

        Fully stateless — the frontend owns the current slope/intercept and
        passes them in on each 'Next Step' button press. The server computes
        one GD update and returns the proposed new line. The user accepts or
        rejects the update.

        Gradient of MSE loss for y = slope*x + intercept:
            grad_slope     = -2/N * sum((y_i - ŷ_i) * x_i)
            grad_intercept = -2/N * sum(y_i - ŷ_i)

        Args:
            slope: Current slope of the line
            intercept: Current intercept of the line
            learning_rate: Step size
            points: List of [x, y] data points
            fit_intercept: Whether to update the intercept term

        Returns:
            Dict with proposed new slope/intercept, gradients, and loss before/after.
        """
        pts = np.array(points, dtype=float)
        x_vals = pts[:, 0]
        y_true = pts[:, 1]
        n = len(y_true)

        # Predictions with current parameters
        y_pred_before = slope * x_vals + intercept
        residuals = y_true - y_pred_before

        # MSE loss before
        loss_before = float(np.mean(residuals ** 2))

        # Gradients of MSE
        grad_slope = float(-2.0 / n * np.dot(residuals, x_vals))
        grad_intercept = float(-2.0 / n * np.sum(residuals)) if fit_intercept else 0.0

        # Gradient descent update
        new_slope = slope - learning_rate * grad_slope
        new_intercept = intercept - learning_rate * grad_intercept if fit_intercept else intercept

        # Loss after the proposed update
        y_pred_after = new_slope * x_vals + new_intercept
        residuals_after = y_true - y_pred_after
        loss_after = float(np.mean(residuals_after ** 2))

        # Compute metrics for both before and after states
        metrics_before_values = self._compute_metrics(y_true, y_pred_before)
        metrics_after_values = self._compute_metrics(y_true, y_pred_after)
        
        metrics_before = RegressionMetrics(train=metrics_before_values)
        metrics_after = RegressionMetrics(train=metrics_after_values)

        return {
            "success": True,
            # Current state
            "slope": slope,
            "intercept": intercept,
            "metrics_before": metrics_before.model_dump(),
            # Proposed new state
            "new_slope": new_slope,
            "new_intercept": new_intercept,
            "metrics_after": metrics_after.model_dump(),
            # Gradient information (for display)
            "grad_slope": grad_slope,
            "grad_intercept": grad_intercept,
            "loss_before": loss_before,
            "loss_after": loss_after,
        }


# Global service instance
linear_regression_service = LinearRegressionService()
