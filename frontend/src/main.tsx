import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import AccountPreviewDialogs from "./components/layout/AccountPreviewDialogs";

if (import.meta.env.VITE_SHOW_DEV_INFO !== "true") {
    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <HashRouter>
            <App />
            <AccountPreviewDialogs />
        </HashRouter>
    </React.StrictMode>,
);
