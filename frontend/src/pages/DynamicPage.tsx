import { useConfig } from "@/store/useConfig";
import { useDataset } from "@/store/useDataset";
import type { DynamicPageProps, IndexPageProps } from "@/types/page";
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

const DynamicPage: React.FC<DynamicPageProps> = ({ page, category, visualisation }) => {
    const { setDataset } = useDataset();
    const { config } = useConfig();

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

    const loading = (
        <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-fuchsia-50">
            <div className="animate-pulse text-2xl font-mono text-fuchsia-600">
                Loading visualisation...
            </div>
        </div>
    );

    return (
        <Suspense fallback={loading}>
            <LazyComponent
                name={page.name}
                parameters={page.parameters}
            />
        </Suspense>
    );
};

export default DynamicPage;
