from typing import Dict

import numpy as np
from models.dataset import (
    ClassificationDataset,
    DatasetInfo,
    PredefinedClassificationDataset,
    PredefinedRegressionDataset,
    RegressionDataset,
)
from sklearn.datasets import (
    load_breast_cancer,
    load_digits,
    load_iris,
    load_wine,
    make_circles,
    make_classification,
    make_moons,
)
from sklearn.model_selection import train_test_split


class DatasetService:
    """Service for loading and managing datasets."""

    def __init__(self):
        self._predefined_loaders = {
            "iris": self._load_iris,
            "wine": self._load_wine,
            "breast_cancer": self._load_breast_cancer,
            "digits": self._load_digits,
            "simple_binary": self._load_simple_binary,
            "moons": self._load_moons,
            "circles": self._load_circles,
        }
        self._predefined_regression_loaders = {
            "simple": self._load_simple_regression,
            "diabetes": self._load_diabetes,
            "california_housing": self._load_california_housing,
        }

    def _load_iris(self) -> ClassificationDataset:
        """Load the iris dataset."""
        data = load_iris()
        return ClassificationDataset(
            X=data.data.tolist(),
            y=data.target.tolist(),
            feature_names=list(data.feature_names),
            target_names=list(data.target_names),
            info=DatasetInfo(
                name="Iris",
                description="Classic iris flower classification dataset",
                n_samples=150,
                n_features=4,
                n_classes=3,
                target_type="classification",
            ),
        )

    def _load_wine(self) -> ClassificationDataset:
        """Load the wine dataset."""
        data = load_wine()
        return ClassificationDataset(
            X=data.data.tolist(),
            y=data.target.tolist(),
            feature_names=list(data.feature_names),
            target_names=list(data.target_names),
            info=DatasetInfo(
                name="Wine",
                description="Wine recognition dataset",
                n_samples=178,
                n_features=13,
                n_classes=3,
                target_type="classification",
            ),
        )

    def _load_breast_cancer(self) -> ClassificationDataset:
        """Load the breast cancer dataset."""
        data = load_breast_cancer()
        return ClassificationDataset(
            X=data.data.tolist(),
            y=data.target.tolist(),
            feature_names=list(data.feature_names),
            target_names=list(data.target_names),
            info=DatasetInfo(
                name="Breast Cancer",
                description="Breast cancer wisconsin diagnostic dataset",
                n_samples=569,
                n_features=30,
                n_classes=2,
                target_type="classification",
            ),
        )

    def _load_digits(self) -> ClassificationDataset:
        """Load the digits dataset."""
        data = load_digits()
        return ClassificationDataset(
            X=data.data.tolist(),
            y=data.target.tolist(),
            feature_names=[f"pixel_{i}" for i in range(64)],
            target_names=[str(i) for i in range(10)],
            info=DatasetInfo(
                name="Digits",
                description="Handwritten digits dataset (8x8 images)",
                n_samples=1797,
                n_features=64,
                n_classes=10,
                target_type="classification",
            ),
        )

    def _load_simple_binary(self) -> ClassificationDataset:
        """Create a simple synthetic binary classification dataset."""
        X, y = make_classification(
            n_samples=100,
            n_features=4,
            n_informative=2,
            n_redundant=0,
            n_clusters_per_class=1,
            n_classes=2,
            random_state=42,
        )
        return ClassificationDataset(
            X=X.tolist(),
            y=y.tolist(),
            feature_names=[f"{i + 1}" for i in range(4)],
            target_names=["A", "B"],
            info=DatasetInfo(
                name="Simple Binary",
                description="Synthetic binary classification dataset (Linearly Separable)",
                n_samples=100,
                n_features=4,
                n_classes=2,
                target_type="classification",
            ),
        )

    def _load_moons(self) -> ClassificationDataset:
        """Create a moons synthetic dataset (non-linear)."""
        X, y = make_moons(n_samples=100, noise=0.1, random_state=42)
        return ClassificationDataset(
            X=X.tolist(),
            y=y.tolist(),
            feature_names=["0", "1"],
            target_names=["A", "B"],
            info=DatasetInfo(
                name="Moons",
                description="Synthetic non-linear dataset (Moons shape)",
                n_samples=150,
                n_features=2,
                n_classes=2,
                target_type="classification",
            ),
        )

    def _load_circles(self) -> ClassificationDataset:
        """Create a circles synthetic dataset (non-linear)."""
        X, y = make_circles(n_samples=100, noise=0.1, factor=0.5, random_state=42)
        return ClassificationDataset(
            X=X.tolist(),
            y=y.tolist(),
            feature_names=["0", "1"],
            target_names=["A", "B"],
            info=DatasetInfo(
                name="Circles",
                description="Synthetic non-linear dataset (Circles shape)",
                n_samples=100,
                n_features=2,
                n_classes=2,
                target_type="classification",
            ),
        )

    async def load_predefined_dataset(
        self, dataset_ref: PredefinedClassificationDataset
    ) -> ClassificationDataset:
        """Load a predefined dataset."""
        if dataset_ref.name not in self._predefined_loaders:
            raise ValueError(f"Unknown dataset: {dataset_ref.name}")

        dataset = self._predefined_loaders[dataset_ref.name]()

        # Override test_size and random_state from the reference
        dataset.test_size = dataset_ref.test_size
        dataset.random_state = dataset_ref.random_state

        return dataset

    async def prepare_dataset_for_training(
        self, dataset: ClassificationDataset
    ) -> Dict[str, any]:
        """Prepare dataset for ML training with train/test split."""
        X, y = dataset.to_numpy()

        if dataset.test_size == 0:
            # "Representation Mode": Use the full set for both training and testing
            X_train, X_test, y_train, y_test = X, X, y, y
        else:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=dataset.test_size, random_state=dataset.random_state
            )

        return {
            "X": X,
            "y": y,
            "X_train": X_train,
            "X_test": X_test,
            "y_train": y_train,
            "y_test": y_test,
            "feature_names": dataset.get_feature_names(),
            "target_names": dataset.get_target_names(),
            "info": dataset.generate_info(),
        }

    async def get_available_datasets(self) -> Dict[str, DatasetInfo]:
        """Get information about all available predefined datasets."""
        datasets_info = {}

        for name in self._predefined_loaders:
            dataset = self._predefined_loaders[name]()
            datasets_info[name] = dataset.info

        return datasets_info

    async def validate_custom_dataset(
        self, dataset_data: Dict
    ) -> ClassificationDataset:
        """Validate and create a ClassificationDataset from uploaded data."""
        # This will automatically validate using Pydantic
        return ClassificationDataset(**dataset_data)

    # ------------------------------------------------------------------
    # Regression datasets
    # ------------------------------------------------------------------

    def _load_simple_regression(self) -> RegressionDataset:
        rng = np.random.default_rng(42)
        n = 100
        x = rng.uniform(-3, 3, size=n)
        y = 2.5 * x + 1.0 + rng.normal(0, 1.0, size=n)
        return RegressionDataset(
            X=[[float(xi)] for xi in x],
            y=[float(yi) for yi in y],
            feature_names=["x"],
            target_name="y",
        )

    def _load_diabetes(self) -> RegressionDataset:
        from sklearn.datasets import load_diabetes

        data = load_diabetes()
        return RegressionDataset(
            X=data.data.tolist(),
            y=data.target.tolist(),
            feature_names=list(data.feature_names),
            target_name="disease progression",
        )

    def _load_california_housing(self) -> RegressionDataset:
        from sklearn.datasets import fetch_california_housing

        data = fetch_california_housing()
        return RegressionDataset(
            X=data.data.tolist(),
            y=data.target.tolist(),
            feature_names=list(data.feature_names),
            target_name="median house value",
        )

    async def load_predefined_regression_dataset(
        self, dataset_ref: PredefinedRegressionDataset
    ) -> RegressionDataset:
        """Load a predefined regression dataset and apply split config from the reference."""
        if dataset_ref.name not in self._predefined_regression_loaders:
            raise ValueError(
                f"Unknown predefined regression dataset: {dataset_ref.name}"
            )

        dataset = self._predefined_regression_loaders[dataset_ref.name]()
        dataset.test_size = dataset_ref.test_size
        dataset.random_state = dataset_ref.random_state
        return dataset

    async def resolve_regression_dataset(
        self,
        dataset_param: "RegressionDataset | PredefinedRegressionDataset | dict | None",
    ) -> RegressionDataset:
        """Resolve any regression dataset representation to a RegressionDataset.

        Accepts a RegressionDataset, PredefinedRegressionDataset, a raw dict,
        or None (defaults to diabetes).
        """
        if dataset_param is None:
            return await self.load_predefined_regression_dataset(
                PredefinedRegressionDataset()
            )

        if isinstance(dataset_param, PredefinedRegressionDataset):
            return await self.load_predefined_regression_dataset(dataset_param)

        if isinstance(dataset_param, RegressionDataset):
            return dataset_param

        if isinstance(dataset_param, dict):
            if dataset_param.get("type") == "predefined_regression":
                return await self.load_predefined_regression_dataset(
                    PredefinedRegressionDataset(**dataset_param)
                )
            return RegressionDataset(**dataset_param)

        raise ValueError(
            f"Cannot resolve regression dataset from type {type(dataset_param)}"
        )


# Global dataset service instance
dataset_service = DatasetService()
