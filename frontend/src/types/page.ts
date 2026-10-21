import type { ActiveDataset, DatasetReference } from "@/types/dataset";

export type Parameters = Record<string, any>;

export interface XpTask { id: string; label: string; xp: number; subpage_id?: string }

interface BasePage {
    id?: string;
    xp_tasks?: XpTask[];
    name?: string;
    page_type: "static" | "dynamic" | "mixed" | "reference";
    dataset?: ActiveDataset | DatasetReference | null;
    note?: string;
}

export interface StaticPageParameters {
    text: string;
    path: string;
}

export interface StaticMarkdownDocument {
    content: string;
    loading: boolean;
    error: string | null;
}

export interface ActivityNarrationProps {
    narration?: StaticMarkdownDocument;
}

interface StaticPage extends BasePage, StaticPageParameters {
    page_type: "static";
}

interface DynamicPage extends BasePage {
    name: string;
    page_type: "dynamic";
    parameters: Parameters;
    subpages?: string[];
    subpage_ids?: string[];
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
    onTaskComplete?: (taskId: string) => void;
    completedTasks?: string[];
    page: DynamicPage;
    narration?: StaticPageParameters;
    category: string;
    visualisation: string;
    subpageIndex?: number;
    replayKey?: number;
    onSubpageReady?: () => void;
    onComplete: () => void;
}

export interface IndexPageProps extends ActivityNarrationProps {
    onTaskComplete?: (taskId: string) => void;
    completedTasks?: string[];
    name: string;
    parameters: Parameters;
    subpageIndex?: number;
    replayKey?: number;
    onSubpageReady?: () => void;
    onComplete: () => void;
}
