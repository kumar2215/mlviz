import type { ActiveDataset, DatasetReference } from "@/types/dataset";

export type Parameters = Record<string, any>;

interface BasePage {
    page_type: "static" | "dynamic" | "reference";
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
    category?: string;
    path?: string;
}

interface ReferencePage extends BasePage {
    page_type: "reference";
    reference_type: "visualisation" | "story";
    path: string;
    pages: number[];
}

export type PageUnion = StaticPage | DynamicPage | ReferencePage;

export interface DynamicPageProps {
    page: DynamicPage;
    category: string;
    visualisation: string;
}

export interface IndexPageProps {
    name: string;
    parameters: Parameters;
}
