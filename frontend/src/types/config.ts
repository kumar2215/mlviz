import type { ActiveDataset } from "@/types/dataset";

interface Category {
    name: string;
    description: string;
    icon: string;
    config_path: string;
    files: string[];
}

export default interface Config {
    datasets: Record<string, ActiveDataset>;
    categories: Category[];
    stories: string[];
}
