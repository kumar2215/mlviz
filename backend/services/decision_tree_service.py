import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import numpy as np
from models import (
    ClassificationDataset,
    ClassificationMetadata,
    ClassificationMetrics,
    ClassificationMetricValues,
    DecisionTreeParameters,
    HistogramData,
    LeafNode,
    PredefinedClassificationDataset,
    SplitNode,
    TreeNode,
)
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.tree import DecisionTreeClassifier

from .dataset_service import dataset_service
from .model_cache import cache_service


class DecisionTreeService:
    """Service for decision tree training and management."""

    def __init__(self):
        self.cache = cache_service
        self.dataset_service = dataset_service
        self._load_parameter_config()

    def _load_parameter_config(self):
        config_path = (
            Path(__file__).parent.parent / "config" / "decision_tree_params.json"
        )
        with open(config_path) as f:
            self.param_config = json.load(f)

    async def get_parameters(self) -> List[Dict[str, Any]]:
        return self.param_config["parameters"]

    async def _resolve_dataset(
        self,
        dataset_param: Optional[
            Union[
                Dict[str, Any], PredefinedClassificationDataset, ClassificationDataset
            ]
        ],
    ) -> ClassificationDataset:
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

    def _create_histogram_data(
        self,
        sample_indices: np.ndarray,
        feature_idx: int,
        X_data: np.ndarray,
        y_data: np.ndarray,
        threshold: Optional[float] = None,
    ) -> Optional[HistogramData]:
        """Generate histogram data for visualization."""
        if len(sample_indices) == 0:
            return None

        feature_values = X_data[sample_indices, feature_idx]
        class_labels = y_data[sample_indices]

        # Create bins for histogram
        min_val, max_val = feature_values.min(), feature_values.max()
        if min_val == max_val:
            bins = [min_val - 0.1, min_val + 0.1]
        else:
            bins = np.linspace(min_val, max_val, min(10, len(sample_indices)) + 1)

        # Count samples per bin per class
        unique_classes = np.unique(y_data)
        counts_by_class = {}

        for class_label in unique_classes:
            class_mask = class_labels == class_label
            class_values = feature_values[class_mask]
            counts, _ = np.histogram(class_values, bins=bins)
            counts_by_class[str(class_label)] = counts.tolist()

        return HistogramData(
            feature_values=feature_values.tolist(),
            class_labels=class_labels.tolist(),
            bins=bins.tolist(),
            counts_by_class=counts_by_class,
            threshold=threshold,
            total_samples=len(sample_indices),
        )

    def _convert_tree_to_node(
        self,
        tree,
        node_id: int,
        feature_names: List[str],
        X_data: np.ndarray,
        y_data: np.ndarray,
        sample_indices: Optional[np.ndarray] = None,
    ) -> TreeNode:
        if sample_indices is None:
            sample_indices = np.arange(len(X_data))

        left_child = tree.children_left[node_id]
        right_child = tree.children_right[node_id]

        if left_child == right_child:
            return LeafNode(
                type="leaf",
                samples=int(tree.n_node_samples[node_id]),
                impurity=float(tree.impurity[node_id]),
                value=tree.value[node_id].tolist(),
            )

        feature_idx = tree.feature[node_id]
        feature_name = (
            feature_names[feature_idx] if feature_names else f"feature_{feature_idx}"
        )
        threshold = float(tree.threshold[node_id])

        histogram_data = self._create_histogram_data(
            sample_indices, feature_idx, X_data, y_data, threshold
        )

        feature_values = X_data[sample_indices, feature_idx]
        left_mask = feature_values <= threshold
        left_indices = sample_indices[left_mask]
        right_indices = sample_indices[~left_mask]

        left_node = self._convert_tree_to_node(
            tree, left_child, feature_names, X_data, y_data, left_indices
        )
        right_node = self._convert_tree_to_node(
            tree, right_child, feature_names, X_data, y_data, right_indices
        )

        return SplitNode(
            type="split",
            feature=feature_name,
            feature_index=feature_idx,
            threshold=threshold,
            samples=int(tree.n_node_samples[node_id]),
            impurity=float(tree.impurity[node_id]),
            value=tree.value[node_id].tolist(),
            histogram_data=histogram_data,
            left=left_node,
            right=right_node,
        )

    def _calculate_metrics(
        self, model: DecisionTreeClassifier, X_test: np.ndarray, y_test: np.ndarray
    ) -> ClassificationMetricValues:
        """Calculates the accuracy, precision, recall, f1-score, and confusion matrix of a model.

        Args:
            model (DecisionTreeClassifier): The model to assess
            X_test (np.ndarray): X test data
            y_test (np.ndarray): Y test data

        Returns:
            ClassificationMetricValues: confusion matrix, accuracy, precision, recall and f1 scores
        """
        predictions = model.predict(X_test)
        conf_matrix = confusion_matrix(y_test, predictions).tolist()

        return ClassificationMetricValues(
            confusion_matrix=conf_matrix,
            accuracy=accuracy_score(y_test, predictions),
            precision=precision_score(
                y_test, predictions, average="weighted", zero_division=0
            ),
            recall=recall_score(
                y_test, predictions, average="weighted", zero_division=0
            ),
            f1=f1_score(y_test, predictions, average="weighted", zero_division=0),
        )

    def _predict_with_tree(
        self, tree_node: TreeNode, X: np.ndarray, feature_names: List[str]
    ) -> np.ndarray:
        """Make predictions using a TreeNode structure.

        Args:
            tree_node: Root node of the tree
            X: Feature matrix to predict on
            feature_names: List of feature names

        Returns:
            Array of predicted class indices
        """
        predictions = []

        for sample in X:
            node = tree_node
            # Traverse tree until we reach a leaf
            while node.type == "split":
                feature_idx = feature_names.index(node.feature)
                if sample[feature_idx] <= node.threshold:
                    node = node.left
                else:
                    node = node.right

            # At leaf node, predict class with highest probability
            class_probs = node.value[0]
            predicted_class = np.argmax(class_probs)
            predictions.append(predicted_class)

        return np.array(predictions)

    async def train_model(
        self,
        training_params: DecisionTreeParameters,
        dataset_param: Optional[
            Union[
                Dict[str, Any], PredefinedClassificationDataset, ClassificationDataset
            ]
        ] = None,
    ) -> Dict[str, Any]:
        """Train a decision tree model with caching."""

        dataset = await self._resolve_dataset(dataset_param)

        model_key = self.cache.generate_model_key(
            params=training_params.model_dump(), dataset=dataset.model_dump()
        )

        if cached_result := await self.cache.get(model_key):
            cached_result["cached"] = True
            return cached_result

        dataset_info = await self.dataset_service.prepare_dataset_for_training(dataset)

        sklearn_params = training_params.to_sklearn_params()
        model = DecisionTreeClassifier(**sklearn_params)
        model.fit(dataset_info["X_train"], dataset_info["y_train"])

        tree_node = self._convert_tree_to_node(
            model.tree_,
            0,
            dataset_info["feature_names"],
            dataset_info["X_train"],
            dataset_info["y_train"],
        )

        train_metric_values = self._calculate_metrics(
            model, dataset_info["X_train"], dataset_info["y_train"]
        )

        test_metric_values = None
        if len(dataset_info["y_test"]) > 0:
            test_metric_values = self._calculate_metrics(
                model, dataset_info["X_test"], dataset_info["y_test"]
            )

        metrics = ClassificationMetrics(
            train=train_metric_values, test=test_metric_values
        )

        response_data = {
            "success": True,
            "model_key": model_key,
            "cached": False,
            "metadata": {
                "created_at": datetime.now().isoformat(),
                "dataset_info": dataset_info["info"].model_dump(),
                "feature_names": dataset_info["feature_names"],
                "class_names": dataset_info["target_names"],
                "n_features": dataset_info["info"].n_features,
                "n_classes": dataset_info["info"].n_classes,
                "dataset_name": dataset_info["info"].name,
                **sklearn_params,
            },
            "tree": tree_node.model_dump(),
            "metrics": metrics.model_dump(),
        }

        await self.cache.set(model_key, response_data)

        return response_data

    async def get_predict_params(
        self,
        dataset_param: Optional[
            Union[PredefinedClassificationDataset, ClassificationDataset]
        ] = None,
    ) -> List[str]:
        dataset = await self._resolve_dataset(dataset_param)
        return dataset.get_feature_names()

    async def predict(
        self, training_params: Dict[str, Any], input_data: List[List[float]]
    ) -> Dict[str, Any]:

        # Extract parameters using the domain model (same pattern as train_model)
        if "parameters" in training_params:
            dt_params = DecisionTreeParameters(**training_params["parameters"])
        else:
            dt_params = DecisionTreeParameters(
                **{k: v for k, v in training_params.items() if k != "dataset"}
            )

        dataset_param = training_params.get("dataset")
        dataset = await self._resolve_dataset(dataset_param)

        # Use the cache service's expected signature: params and dataset separately
        model_key = self.cache.generate_model_key(
            params=dt_params.model_dump(), dataset=dataset.model_dump()
        )

        cached_result = await self.cache.get(model_key)
        if not cached_result:
            raise ValueError("Model not found. Please train the model first.")

        dataset_info = await self.dataset_service.prepare_dataset_for_training(dataset)

        # Use the parameter model's conversion method
        sklearn_params = dt_params.to_sklearn_params()
        model = DecisionTreeClassifier(**sklearn_params)
        model.fit(dataset_info["X_train"], dataset_info["y_train"])

        input_array = np.array(input_data)
        predictions = model.predict(input_array)

        target_names = dataset_info["target_names"]
        prediction_names = [target_names[pred] for pred in predictions]

        return {
            "predictions": prediction_names,
            "prediction_indices": predictions.tolist(),
        }

    async def predict_with_instructions(
        self,
        tree: TreeNode,
        points: Dict[str, float],
        class_names: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Predict using a tree and return traversal instructions.

        Args:
            tree: Root node of the decision tree
            points: Feature name to value mapping
            class_names: Optional list of class names

        Returns:
            Dictionary with prediction and traversal instructions
        """
        instructions: List[str] = []
        node = tree

        # Traverse tree until we reach a leaf
        while node.type == "split":
            feature_value = points.get(node.feature)
            if feature_value is None:
                raise ValueError(f"Missing feature value for: {node.feature}")

            if feature_value <= node.threshold:
                instructions.append("left")
                node = node.left
            else:
                instructions.append("right")
                node = node.right

        # Reached leaf node
        instructions.append("stop")

        # Calculate prediction from leaf node values
        values = node.value[0] if node.value else []
        if not values:
            raise ValueError("Leaf node has no value array")

        max_value = max(values)
        predicted_index = values.index(max_value)
        total = sum(values)
        confidence = max_value / total if total > 0 else 0.0

        # Determine class name
        if class_names and predicted_index < len(class_names):
            predicted_class = class_names[predicted_index]
        else:
            predicted_class = f"Class {predicted_index}"

        return {
            "predicted_class": predicted_class,
            "predicted_class_index": predicted_index,
            "confidence": confidence,
            "instructions": instructions,
        }

    async def evaluate_manual_tree(
        self,
        tree: TreeNode,
        dataset_param: Optional[
            Union[
                Dict[str, Any], PredefinedClassificationDataset, ClassificationDataset
            ]
        ] = None,
    ) -> Dict[str, Any]:
        """Evaluate a manually built tree against test data.

        Args:
            tree: Root node of the manual tree
            dataset_param: ClassificationDataset to use for evaluation (defaults to Iris)

        Returns:
            Dictionary with scores and confusion matrix
        """
        dataset = await self._resolve_dataset(dataset_param)
        dataset_info = await self.dataset_service.prepare_dataset_for_training(dataset)

        # Make predictions using the manual tree on TRAIN set
        predictions_train = self._predict_with_tree(
            tree,
            dataset_info["X_train"],
            dataset_info["feature_names"],
        )

        y_train = dataset_info["y_train"]
        conf_matrix_train = confusion_matrix(y_train, predictions_train).tolist()

        train_metric_values = ClassificationMetricValues(
            confusion_matrix=conf_matrix_train,
            accuracy=accuracy_score(y_train, predictions_train),
            precision=precision_score(
                y_train, predictions_train, average="weighted", zero_division=0
            ),
            recall=recall_score(
                y_train, predictions_train, average="weighted", zero_division=0
            ),
            f1=f1_score(
                y_train, predictions_train, average="weighted", zero_division=0
            ),
        )

        test_metric_values = None
        # Make predictions using the manual tree on TEST set
        if len(dataset_info["y_test"]) > 0:
            predictions_test = self._predict_with_tree(
                tree,
                dataset_info["X_test"],
                dataset_info["feature_names"],
            )

            y_test = dataset_info["y_test"]
            conf_matrix_test = confusion_matrix(y_test, predictions_test).tolist()

            test_metric_values = ClassificationMetricValues(
                confusion_matrix=conf_matrix_test,
                accuracy=accuracy_score(y_test, predictions_test),
                precision=precision_score(
                    y_test, predictions_test, average="weighted", zero_division=0
                ),
                recall=recall_score(
                    y_test, predictions_test, average="weighted", zero_division=0
                ),
                f1=f1_score(
                    y_test, predictions_test, average="weighted", zero_division=0
                ),
            )

        metrics = ClassificationMetrics(
            train=train_metric_values,
            test=test_metric_values,
        )

        # Create metadata
        metadata = ClassificationMetadata(
            feature_names=dataset_info["feature_names"],
            class_names=dataset_info["target_names"],
            n_features=len(dataset_info["feature_names"]),
            n_classes=len(dataset_info["target_names"]),
            dataset_name=dataset.name if hasattr(dataset, "name") else None,
        )

        return {"metrics": metrics.model_dump(), "metadata": metadata.model_dump()}


# Global service instance
dt_service = DecisionTreeService()
