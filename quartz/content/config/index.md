---
title: Config Builder
---

# Config Builder (Streamlit)

The **Config Builder** is a standalone utility built with Streamlit that allows developers and educators to create the configuration JSONs required by the MLviz frontend without manual JSON editing.

## Purpose

MLviz stories and pages are driven by a centralized configuration. The Config Builder provides a GUI for:
-   Defining datasets.
-   Creating individual visualization pages.
-   Structuring "Stories" as graphs of nodes and edges.
-   Exporting the finalized configuration to a JSON format.

## How to Run

1.  Navigate to the `config` directory:
    ```bash
    cd config
    ```
2.  Install dependencies (if using `uv` or `pip`):
    ```bash
    uv pip install -r requirements.txt
    ```
3.  Run the Streamlit app:
    ```bash
    streamlit run app.py
    ```

## Workflow

### 1. Adding Pages
Before creating a story, you must define the pages that will be shown. Pages can be:
-   **Static**: Simple markdown/HTML content.
-   **Model**: Specific machine learning visualization pages (e.g., KNN, Decision Tree).

### 2. Building Stories
A story is a sequence of pages connected by logic.
-   **Nodes**: Each node represents a page in the story.
-   **Edges**: Edges represent the transition between pages.

### 3. Exporting
Once the configuration is complete, use the **Export** tab to get the raw JSON. This JSON should be saved into the frontend's `public/config/` directory to be loaded by the application.
