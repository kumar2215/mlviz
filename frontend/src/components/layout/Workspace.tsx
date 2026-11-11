import { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import App from "@/App";

const StyleGuidePage = import.meta.env.DEV ? lazy(() => import("@/pages/StyleGuidePage")) : null;

export default function Workspace() {
    const { pathname } = useLocation();
    if (StyleGuidePage && pathname === "/style-guide") return <Suspense fallback={null}><StyleGuidePage /></Suspense>;
    return <App />;
}
