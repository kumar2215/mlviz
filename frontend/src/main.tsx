import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import AccountDialogs from "./components/layout/AccountDialogs";
import { authSession } from "./store/useAuthSession";
import { startLearningProgress } from "./store/useProgress";
import { RewardNotice } from "./components/layout/LearningProgress";

const stopAuth = authSession.getState().start();
const stopProgress = startLearningProgress();
if (import.meta.hot) import.meta.hot.dispose(() => { stopAuth(); stopProgress(); });

if (import.meta.env.VITE_SHOW_DEV_INFO !== "true") {
    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <HashRouter>
            <App />
            <AccountDialogs />
            <RewardNotice />
        </HashRouter>
    </React.StrictMode>,
);
