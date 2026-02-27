---
title: System Architecture
---

# System Architecture

MLviz is built with a decoupled architecture to ensure scalability, ease of maintenance, and flexibility in visualization.

## Component Overview

The system consists of three primary components:

1.  **React Frontend**: A dynamic visualization engine that renders ML models and "Stories" (guided tours of ML concepts).
2.  **FastAPI Backend**: A high-performance Python backend that handles dataset management, model training (via Scikit-Learn), and prediction logic.
3.  **Streamlit Config Builder**: A developer utility used to generate the JSON configurations that define the "Stories" viewed in the frontend.

## Data Flow

![System Architecture Diagram](placeholder_architecture_diagram.png)

### 1. Story Configuration
The **Streamlit Config Builder** is used by developers/educators to create a story. It outputs a JSON file containing nodes (steps) and edges (transitions). These JSONs are placed in the frontend's `public/config` directory.

### 2. Frontend Initialization
When a user opens the **React Frontend**, it loads the specified `config.json`. The frontend parses the graph structure and initializes the `StoryContext`.

### 3. Backend Interaction
As the user progresses through a story or interacts with a visualization:
- The frontend sends requests (e.g., training parameters, prediction points) to the **FastAPI Backend**.
- The backend executes the ML logic and returns structured data (e.g., decision boundaries, tree structures, clustering results).
- The frontend updates the visualization in real-time.

## Design Choices

### Decoupled Logic
The backend does not "know" about the visualization state. It only processes mathematical transformations. This allows us to swap the frontend (e.g., from Recharts to D3 or React Three Fiber) without changing the backend logic.

### Graph-Based Stories
Stories are modeled as a **Directed Acyclic Graph (DAG)**. This allows for branching paths in educational content, where a user's choice or data input can lead to different learning modules.
