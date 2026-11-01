export type TourAction = "parameters" | "train" | "node" | "feature" | "threshold" | "split" | "place" | "centroids" | "run-step" | "resolve-step" | "line";
export type TourSetup = "data" | "node" | "feature" | "placing" | "centroids";
export interface TourStep {
    target: string;
    title: string;
    content: string;
    action?: TourAction;
    setup?: TourSetup;
    hud?: string;
}
export interface VisualisationTour { id: string; steps: TourStep[] }

const parameters: TourStep = { target: "parameters", title: "Prepare the plot", content: "Choose your parameters, then select Apply Parameters. Once the plot is ready, we can explore it.", action: "parameters", setup: "data" };
const line: TourStep = { target: "line-controls", title: "Control the line", content: "The intercept moves the line up or down. The slope dial rotates it. The equation and score update as you explore.", hud: "line-controls" };
const loss: TourStep = { target: "loss-map", title: "Explore the loss landscape", content: "Each position represents a slope and intercept. The marker locates your current line; lower loss means a closer fit to the points.", hud: "loss-map" };
const proposal: TourStep = { target: "step-proposal", title: "Inspect the proposal", content: "Compare the proposed update with the current model. Accept applies it; Reject keeps the current model. Choose either to continue.", action: "resolve-step", hud: "step-controls" };

export const visualisationTours: Record<string, VisualisationTour> = {
    "traditional_ml/decision_tree/Decision Tree": { id: "decision-tree", steps: [
        { target: "tree-canvas", title: "Start with a node", content: "Select a tree node to reveal its split controls. You can click a node, or focus it and press Enter.", action: "node", setup: "node" },
        { target: "tree-feature", title: "Choose a question", content: "Choose a feature for this node. Its values and possible split thresholds will load in the panel.", action: "feature", setup: "feature", hud: "tree-split" },
        { target: "tree-threshold", title: "Compare the branches", content: "Move the threshold slider to choose a split. The distribution shows how the examples divide. Set a threshold to continue.", action: "threshold", hud: "tree-split" },
        { target: "tree-split", title: "Make the split", content: "Choose a threshold if you have not already, then select Split Node. The tree will add the two branches after the split succeeds.", action: "split", hud: "tree-split" },
        { target: "tree-canvas", title: "Follow the branches", content: "Your split is now part of the tree. Select another node to keep building, or inspect the results. Your changes stay when you close this tour." },
    ] },
    "traditional_ml/kmeans/K-Means Step": { id: "kmeans", steps: [
        parameters,
        { target: "step-controls", title: "Choose starting centres", content: "Select Start Placing or Adjust Centroids to enter selection mode. If a proposal is already open, choose Keep or Adjust to return to selection.", action: "place", setup: "placing", hud: "step-controls" },
        { target: "centroid-canvas", title: "Place centroids", content: "Click data points to select or deselect starting centres. You can also focus a point and press Enter. Select at least one to continue.", action: "centroids", setup: "centroids" },
        { target: "step-controls", title: "Run one iteration", content: "Select Run Step to calculate new assignments and proposed centres. If a proposal is already open, choose Keep or Adjust first, then run a new step.", action: "run-step", hud: "step-controls" },
        { target: "step-proposal", title: "Choose the next centres", content: "Inspect the proposed centres on the plot. Keep continues with your existing centres; Adjust adopts the suggested centres so you can adjust them. Choose either to continue.", action: "resolve-step", hud: "step-controls" },
        { target: "centroid-canvas", title: "Keep exploring", content: "Repeat the select, run, and review cycle to see how the clusters evolve. Your selected centres stay when the tour ends." },
    ] },
    "traditional_ml/linear_regression/Linear Regression Step": { id: "linear-step", steps: [
        parameters, line, loss,
        { target: "step-controls", title: "Try gradient descent", content: "Choose a learning rate, then select Run Step. This proposes one update without applying it yet. If a proposal is already open, accept or reject it first.", action: "run-step", hud: "step-controls" },
        proposal,
        { target: "line-controls", title: "Continue experimenting", content: "Run more steps or change the line yourself to explore how the learning rate and starting point affect the fit.", hud: "line-controls" },
    ] },
    "traditional_ml/linear_regression/Linear Regression Train": { id: "linear-train", steps: [
        { target: "parameters", title: "Fit a line", content: "Choose your parameters and select Train Model. We will inspect the successfully trained model next.", action: "train" },
        { target: "training-results", title: "Inspect the fitted model", content: "Compare the fitted line with its training and test scores. These results describe the model you just trained." },
        { ...line, content: "Change the intercept or slope to compare your own line with the fitted result. The plot updates as you move the controls.", action: "line" },
        loss,
        { target: "line-controls", title: "Compare and repeat", content: "Manual changes let you explore other lines. Train Model fits a line again with your chosen parameters. The tour leaves your current line in place.", hud: "line-controls" },
    ] },
    "traditional_ml/svm/SVM Step": { id: "svm-step", steps: [
        parameters,
        { target: "step-controls", title: "Control the boundary", content: "The slope, intercept, width, and flip controls change the separating boundary. The learning rate controls the size of a subgradient update.", hud: "step-controls" },
        { target: "loss-map", title: "Inspect hinge loss", content: "The loss landscape locates the current boundary in parameter space. Use it to compare the current and proposed boundary.", hud: "loss-map" },
        { target: "step-controls", title: "Propose an update", content: "Select Run Step to calculate one subgradient update. It will be shown as a proposal before you commit to it. If a proposal is already open, accept or reject it first.", action: "run-step", hud: "step-controls" },
        proposal,
        { target: "step-controls", title: "Explore the margin", content: "Keep stepping or adjust the boundary to investigate the margin and classification errors.", hud: "step-controls" },
    ] },
};

export function findTour(mode: string, category: string | undefined, visualisation: string | undefined, page: string | undefined): VisualisationTour | undefined {
    return mode === "visualisation" ? visualisationTours[`${category}/${visualisation}/${page}`] : undefined;
}
