import numpy as np
from typing import Dict, List, Any
from collections import Counter

from models import NodeStatistics, SplitStatistics, HistogramData, ClassificationDataset, PredefinedClassificationDataset, ThresholdStatistics
from api.models import ManualNodeStatsRequest, ManualNodeStatsResponse, ManualFeatureStatsRequest, ManualFeatureStatsResponse
from .dataset_service import dataset_service


class ManualTreeService:
    """Service for manual decision tree building with statistics calculation."""

    def __init__(self):
        self.dataset_service = dataset_service
        # Cache datasets for the session to avoid reloading
        self._dataset_cache: Dict[str, Any] = {}

    async def _resolve_dataset(self, dataset_param: Dict[str, Any] | PredefinedClassificationDataset | ClassificationDataset | None) -> ClassificationDataset:
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

    async def _load_dataset(self, dataset_param: Dict[str, Any] | None) -> Dict[str, Any]:
        """Load and prepare dataset information."""
        dataset = await self._resolve_dataset(dataset_param)

        # Create cache key from dataset
        cache_key = str(dataset.model_dump())

        if cache_key in self._dataset_cache:
            return self._dataset_cache[cache_key]

        dataset_info = await self.dataset_service.prepare_dataset_for_training(dataset)

        # Combine train and test for manual tree building (user works with full dataset)
        X_full = np.vstack([dataset_info["X_train"], dataset_info["X_test"]])
        y_full = np.hstack([dataset_info["y_train"], dataset_info["y_test"]])

        cached_data = {
            "X": X_full,
            "y": y_full,
            "feature_names": dataset_info["feature_names"],
            "class_names": dataset_info["target_names"]
        }

        self._dataset_cache[cache_key] = cached_data
        return cached_data

    def _calculate_gini(self, y_labels: np.ndarray) -> float:
        """Calculate Gini impurity for a set of labels."""
        if len(y_labels) == 0:
            return 0.0

        _, counts = np.unique(y_labels, return_counts=True)
        probabilities = counts / len(y_labels)
        gini = 1.0 - np.sum(probabilities ** 2)
        return float(gini)

    def _calculate_entropy(self, y_labels: np.ndarray) -> float:
        """Calculate entropy for a set of labels."""
        if len(y_labels) == 0:
            return 0.0

        _, counts = np.unique(y_labels, return_counts=True)
        probabilities = counts / len(y_labels)
        # Filter out zero probabilities to avoid log(0)
        probabilities = probabilities[probabilities > 0]
        entropy = -np.sum(probabilities * np.log2(probabilities))
        return float(entropy)

    def _calculate_impurity(self, y_labels: np.ndarray, criterion: str) -> float:
        """Calculate impurity based on specified criterion."""
        if criterion == "entropy":
            return self._calculate_entropy(y_labels)
        else:  # default to gini
            return self._calculate_gini(y_labels)

    def _get_class_distribution(self, y_labels: np.ndarray, class_names: List[str]) -> tuple[Dict[str, int], Dict[str, float]]:
        """Get class distribution counts and probabilities."""
        if len(y_labels) == 0:
            return {}, {}

        label_counts = Counter(y_labels.tolist())
        total = len(y_labels)

        class_distribution = {}
        class_probabilities = {}

        for idx, class_name in enumerate(class_names):
            count = label_counts.get(idx, 0)
            class_distribution[class_name] = count
            class_probabilities[class_name] = count / total if total > 0 else 0.0

        return class_distribution, class_probabilities

    def _create_node_statistics(self, y_labels: np.ndarray, class_names: List[str], criterion: str) -> NodeStatistics:
        """Create statistics object for a node."""
        samples = len(y_labels)
        impurity = self._calculate_impurity(y_labels, criterion)
        class_dist, class_probs = self._get_class_distribution(y_labels, class_names)

        return NodeStatistics(
            samples=samples,
            impurity=impurity,
            class_distribution=class_dist,
            class_probabilities=class_probs
        )

    def _create_histogram_data(self,
                               X_values: np.ndarray,
                               y_labels: np.ndarray,
                               threshold: float,
                               feature_idx: int,
                               num_bins: int = 10,
                               thresholds: List[float] | None = None) -> HistogramData:
        """Generate histogram data for visualization."""
        if len(X_values) == 0:
            return HistogramData(
                feature_values=[],
                class_labels=[],
                bins=[],
                counts_by_class={},
                threshold=threshold,
                total_samples=0
            )

        # Create bins for histogram
        min_val, max_val = X_values.min(), X_values.max()
        
        if min_val == max_val:
            bins = [min_val - 0.1, min_val + 0.1]
        elif thresholds is not None and len(thresholds) > 0:
            # Create bins that align with threshold values
            # This makes each bar represent data between consecutive split points
            unique_thresholds = sorted(set(thresholds))
            
            # Filter thresholds to only those within the data range
            valid_thresholds = [t for t in unique_thresholds if min_val < t < max_val]
            
            # Create bin edges: [min, threshold1, threshold2, ..., max]
            bins = [min_val] + valid_thresholds + [max_val]
            
            # Ensure bins are unique and sorted
            bins = sorted(set(bins))
        else:
            bins = np.linspace(min_val, max_val, min(num_bins, len(X_values)) + 1)

        # Count samples per bin per class
        unique_classes = np.unique(y_labels)
        counts_by_class = {}

        for class_label in unique_classes:
            class_mask = y_labels == class_label
            class_values = X_values[class_mask]
            counts, _ = np.histogram(class_values, bins=bins)
            counts_by_class[str(int(class_label))] = counts.tolist()

        return HistogramData(
            feature_values=X_values.tolist(),
            class_labels=y_labels.tolist(),
            bins=bins.tolist() if isinstance(bins, np.ndarray) else bins,
            counts_by_class=counts_by_class,
            threshold=threshold,
            total_samples=len(X_values)
        )

    async def calculate_node_statistics(self, request: ManualNodeStatsRequest) -> ManualNodeStatsResponse:
        """Calculate statistics for a potential node split."""

        # Load dataset
        dataset_info = await self._load_dataset(request.dataset)
        X = dataset_info["X"]
        y = dataset_info["y"]
        feature_names = dataset_info["feature_names"]
        class_names = dataset_info["class_names"]

        # Get feature index
        try:
            feature_idx = feature_names.index(request.feature)
        except ValueError:
            raise ValueError(f"Feature '{request.feature}' not found in dataset")

        # Determine which samples are at this node
        if request.parent_samples_mask is None:
            # Root node - use all samples
            samples_mask = np.arange(len(X))
        else:
            samples_mask = np.array(request.parent_samples_mask)

        # Get data for current node
        X_node = X[samples_mask]
        y_node = y[samples_mask]

        # Calculate parent statistics (before split)
        parent_stats = self._create_node_statistics(y_node, class_names, request.criterion)

        # Split based on threshold
        feature_values = X_node[:, feature_idx]
        left_mask = feature_values <= request.threshold
        right_mask = ~left_mask

        # Get indices for left and right children
        left_samples_mask = samples_mask[left_mask].tolist()
        right_samples_mask = samples_mask[right_mask].tolist()

        # Calculate statistics for children
        y_left = y_node[left_mask]
        y_right = y_node[right_mask]

        left_stats = self._create_node_statistics(y_left, class_names, request.criterion)
        right_stats = self._create_node_statistics(y_right, class_names, request.criterion)

        # Calculate weighted impurity and information gain
        n_samples = len(y_node)
        n_left = len(y_left)
        n_right = len(y_right)

        if n_samples == 0:
            weighted_impurity = 0.0
            information_gain = 0.0
        else:
            weighted_impurity = (
                (n_left / n_samples) * left_stats.impurity +
                (n_right / n_samples) * right_stats.impurity
            )
            information_gain = parent_stats.impurity - weighted_impurity

        split_stats = SplitStatistics(
            parent_stats=parent_stats,
            left_stats=left_stats,
            right_stats=right_stats,
            information_gain=information_gain,
            weighted_impurity=weighted_impurity
        )

        # Create histogram data
        histogram_data = self._create_histogram_data(
            feature_values,
            y_node,
            request.threshold,
            feature_idx
            # Don't pass thresholds parameter - use default num_bins for granular visualization
        )

        return ManualNodeStatsResponse(
            feature=request.feature,
            feature_index=feature_idx,
            threshold=request.threshold,
            split_stats=split_stats,
            histogram_data=histogram_data,
            left_samples_mask=left_samples_mask,
            right_samples_mask=right_samples_mask,
            available_features=feature_names,
            class_names=class_names
        )

    async def calculate_feature_statistics(self, request: ManualFeatureStatsRequest) -> ManualFeatureStatsResponse:
        """Calculate statistics for all possible thresholds of a feature."""

        # Load dataset
        dataset_info = await self._load_dataset(request.dataset)
        X = dataset_info["X"]
        y = dataset_info["y"]
        feature_names = dataset_info["feature_names"]
        class_names = dataset_info["class_names"]

        # Get feature index
        try:
            feature_idx = feature_names.index(request.feature)
        except ValueError:
            raise ValueError(f"Feature '{request.feature}' not found in dataset")

        # Determine which samples are at this node
        if request.parent_samples_mask is None:
            samples_mask = np.arange(len(X))
        else:
            samples_mask = np.array(request.parent_samples_mask)

        # Get data for current node
        X_node = X[samples_mask]
        y_node = y[samples_mask]
        feature_values = X_node[:, feature_idx]

        # Calculate parent statistics (used for all splits)
        parent_stats = self._create_node_statistics(y_node, class_names, request.criterion)

        # Get unique values and calculate split points
        unique_values = np.unique(feature_values)
        total_unique = len(unique_values)

        # Calculate split points (midpoints between consecutive unique values)
        if len(unique_values) < 2:
            # Can't split if only one unique value
            raise ValueError(f"Feature '{request.feature}' has only one unique value, cannot split")

        split_points = []
        for i in range(len(unique_values) - 1):
            midpoint = (unique_values[i] + unique_values[i + 1]) / 2
            split_points.append(midpoint)

        # Apply threshold cap if needed
        if len(split_points) > request.max_thresholds:
            # Intelligent sampling: use percentiles
            percentiles = np.linspace(0, 100, request.max_thresholds, endpoint=True)
            split_points = np.percentile(split_points, percentiles).tolist()
            # Remove duplicates that may arise from percentile calculation
            split_points = sorted(list(set(split_points)))

        # Calculate statistics for each threshold
        threshold_stats_list = []
        for threshold in split_points:
            # Split based on threshold
            left_mask = feature_values <= threshold
            right_mask = ~left_mask

            # Get indices for children
            left_samples_mask = samples_mask[left_mask]
            right_samples_mask = samples_mask[right_mask]

            # Calculate statistics for children
            y_left = y_node[left_mask]
            y_right = y_node[right_mask]

            left_stats = self._create_node_statistics(y_left, class_names, request.criterion)
            right_stats = self._create_node_statistics(y_right, class_names, request.criterion)

            # Calculate weighted impurity and information gain
            n_samples = len(y_node)
            n_left = len(y_left)
            n_right = len(y_right)

            weighted_impurity = (
                (n_left / n_samples) * left_stats.impurity +
                (n_right / n_samples) * right_stats.impurity
            )
            information_gain = parent_stats.impurity - weighted_impurity

            split_stats = SplitStatistics(
                parent_stats=parent_stats,
                left_stats=left_stats,
                right_stats=right_stats,
                information_gain=information_gain,
                weighted_impurity=weighted_impurity
            )

            threshold_stats_list.append(ThresholdStatistics(
                threshold=float(threshold),
                information_gain=information_gain,
                split_stats=split_stats,
                left_samples_mask=left_samples_mask.tolist(),
                right_samples_mask=right_samples_mask.tolist()
            ))

        # Find best threshold (highest information gain)
        best_idx = max(range(len(threshold_stats_list)),
                       key=lambda i: threshold_stats_list[i].information_gain)
        best_threshold = threshold_stats_list[best_idx].threshold

        # Create overall histogram data (using best threshold for visualization)
        # Use number of thresholds as bin count for better granularity
        histogram_data = self._create_histogram_data(
            feature_values,
            y_node,
            best_threshold,
            feature_idx,
            num_bins=len(threshold_stats_list),
            thresholds=split_points
        )

        # Get feature range
        feature_range = [float(feature_values.min()), float(feature_values.max())]

        return ManualFeatureStatsResponse(
            feature=request.feature,
            feature_index=feature_idx,
            thresholds=threshold_stats_list,
            best_threshold=best_threshold,
            best_threshold_index=best_idx,
            feature_range=feature_range,
            histogram_data=histogram_data,
            total_unique_values=total_unique,
            returned_threshold_count=len(threshold_stats_list),
            available_features=feature_names,
            class_names=class_names
        )


# Singleton instance
manual_tree_service = ManualTreeService()
