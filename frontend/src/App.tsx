// src/App.tsx
import { ConfigProvider } from "@/contexts/ConfigContext";
import { DatasetProvider } from "@/contexts/DatasetContext";
import { StoryProvider } from "@/contexts/StoryContext";
import StoryPageWrapper from "@/pages/StoryPageWrapper";
import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import IndexPage from "./pages/IndexPage";

type BlockReason = "mobile" | "narrow" | null;

const isMobileBrowser = /android|iphone|ipad|ipod|blackberry|windows phone/i.test(
    navigator.userAgent,
);

function getBlockReason(): BlockReason {
    if (isMobileBrowser) return "mobile";
    if (window.innerWidth < 768) return "narrow";
    return null;
}

function MobileBlockScreen({ reason }: { reason: BlockReason }) {
    const isMobile = reason === "mobile";
    return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-white px-8 text-center gap-6">
            <div className="text-4xl">{isMobile ? "📱" : "↔️"}</div>
            <h1 className="text-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent font-semibold font-mono tracking-tight">
                {isMobile ? "Desktop Only" : "Window Too Narrow"}
            </h1>
            <p className="text-gray-500 max-w-sm">
                {isMobile
                    ? "This application is designed for desktop use. Please open it on a larger screen."
                    : "Please resize your browser window wider to use this application."}
            </p>
        </div>
    );
}

function App() {
    const [blockReason, setBlockReason] = useState<BlockReason>(getBlockReason);

    useEffect(() => {
        if (isMobileBrowser) return;
        const handler = () => setBlockReason(getBlockReason());
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);

    if (blockReason) {
        return <MobileBlockScreen reason={blockReason} />;
    }

    return (
        <div className="w-screen h-screen overflow-hidden">
            <ConfigProvider>
                <DatasetProvider>
                    <StoryProvider>
                        <Routes>
                            <Route
                                path="/"
                                element={<IndexPage />}
                            />
                            <Route
                                path="/story/:storyName"
                                element={<StoryPageWrapper />}
                            />
                        </Routes>
                    </StoryProvider>
                </DatasetProvider>
            </ConfigProvider>
        </div>
    );
}

export default App;
