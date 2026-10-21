import type { ActiveDataset } from "@/types/dataset";

interface Category {
    name: string;
    description: string;
    icon: string;
    config_path: string;
    files: string[];
}

export default interface Config {
    xp_per_level?: number;
    datasets: Record<string, ActiveDataset>;
    categories: Category[];
    stories: string[];
}
