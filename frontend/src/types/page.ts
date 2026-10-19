import type { ActiveDataset, DatasetReference } from "@/types/dataset";

export type Parameters = Record<string, any>;

interface BasePage {
    page_type: "static" | "dynamic" | "mixed" | "reference";
    dataset?: ActiveDataset | DatasetReference | null;
    note?: string;
}

export interface StaticPageParameters {
    text: string;
    path: string;
}

interface StaticPage extends BasePage, StaticPageParameters {
    page_type: "static";
}

interface DynamicPage extends BasePage {
    name: string;
    page_type: "dynamic";
    parameters: Parameters;
    subpages?: string[];
    category?: string;
    path?: string;
}

interface MixedPage extends BasePage {
    page_type: "mixed";
    static_page: StaticPage;
    dynamic_page: DynamicPage | ReferencePage;
}

interface ReferencePage extends BasePage {
    page_type: "reference";
    reference_type: "visualisation" | "story";
    path: string;
    pages: number[];
}

export type PageUnion = StaticPage | DynamicPage | MixedPage | ReferencePage;

export interface DynamicPageProps {
    page: DynamicPage;
    category: string;
    visualisation: string;
    subpageIndex?: number;
    replayKey?: number;
    onSubpageReady?: () => void;
    onComplete: () => void;
}

export interface IndexPageProps {
    name: string;
    parameters: Parameters;
    subpageIndex?: number;
    replayKey?: number;
    onSubpageReady?: () => void;
    onComplete: () => void;
}
