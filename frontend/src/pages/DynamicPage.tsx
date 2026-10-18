import { useConfig } from "@/store/useConfig";
import { useDataset } from "@/store/useDataset";
import type { DynamicPageProps, IndexPageProps } from "@/types/page";
import PageLoading from "@/components/layout/PageLoading";
import React, {
    useEffect,
    lazy,
    Suspense,
    type ComponentType,
    type LazyExoticComponent,
} from "react";

type LazyPageModule = {
    default: ComponentType<IndexPageProps>;
};

const pageLoaders = import.meta.glob<LazyPageModule>("./*/*/index.tsx");
const pageComponents = Object.fromEntries(
    Object.entries(pageLoaders).map(([path, loader]) => [path, lazy(loader)]),
) as Record<string, LazyExoticComponent<ComponentType<IndexPageProps>>>;

const DynamicPage: React.FC<DynamicPageProps> = ({ page, category, visualisation, subpageIndex, replayKey, onSubpageReady }) => {
    const setDataset = useDataset(state => state.setDataset);
    const config = useConfig(state => state.config);

    if (!category || !visualisation) {
        throw new Error("Category and/or visualisation not provided for dynamic page");
    }

    // Resolve dataset if it's a reference
    const resolvedDataset =
        page.dataset?.type === "reference"
            ? config?.datasets?.[page.dataset.name]
            : page.dataset;

    useEffect(() => {
        setDataset(resolvedDataset ?? null);
    }, [resolvedDataset, setDataset]);

    const modulePath = `./${category}/${visualisation}/index.tsx`;
    const LazyComponent = pageComponents[modulePath];

    if (!LazyComponent) {
        return <div>Unknown page: {modulePath}</div>;
    }

    return (
        <div className="h-full min-h-0 w-full overflow-hidden bg-page">
        <Suspense fallback={<PageLoading label="Loading visualisation…" />}>
            <LazyComponent
                name={page.name}
                parameters={page.parameters}
                subpageIndex={subpageIndex}
                replayKey={replayKey}
                onSubpageReady={onSubpageReady}
                completionButtonId={page.completion_button_id}
            />
        </Suspense>
        </div>
    );
};

export default DynamicPage;
