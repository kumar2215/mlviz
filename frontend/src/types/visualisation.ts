import type { Condition } from "@/types/condition";
import type { PageUnion } from "@/types/page";

export interface Transition {
    from: number;
    to: number;
    condition: Condition;
}

export default interface Visualisation {
    category: string;
    name: string;
    path: string;
    pages: PageUnion[];
    transitions: Transition[];
}
