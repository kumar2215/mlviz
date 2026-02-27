---
title: JSON Configuration Structure
---

# JSON Configuration Structure

The frontend is driven by a `config.json` file. This document details the schema of that configuration.

## Root Object

The root of the configuration contains three main sections:

```json
{
  "datasets": {},
  "stories": {},
  "pages": {}
}
```

## 1. Datasets
Defines custom datasets available to the application.

```json
"datasets": {
  "my_custom_data": {
    "name": "My Custom Data",
    "features": ["feature_1", "feature_2"],
    "target": "label",
    "data": [
      [1.2, 3.4, 0],
      [5.6, 7.8, 1]
    ]
  }
}
```

## 2. Pages
Each page represents a visualization or content slide.

```json
"pages": {
  "page_id": {
    "type": "model",
    "model_type": "knn",
    "title": "KNN Visualization",
    "description": "Learn about K-Nearest Neighbors",
    "dataset": "iris",
    "parameters": {
      "k": 5,
      "distance_metric": "euclidean"
    }
  }
}
```

### Page Types
- `static`: Markdown/Text content.
- `model`: Interactive ML visualization.
- `comparison`: Side-by-side model comparison.

## 3. Stories
A story is a graph that connects pages.

```json
"stories": {
  "story_id": {
    "title": "Introduction to Clustering",
    "start_node": "node_1",
    "nodes": {
      "node_1": {
        "page_id": "page_id_1"
      }
    },
    "edges": [
      {
        "from": "node_1",
        "to": "node_2",
        "label": "Next"
      }
    ]
  }
}
```

## Design Choices

### Graph-Based Navigation
By using a node-edge structure for stories, we allow for non-linear learning paths. Developers can create complex workflows where the sequence of pages depends on user input or branching logic.

### Centralized Definitions
Defining pages separately from stories allows for **reusability**. A single "intro" page can be used across multiple different stories.
