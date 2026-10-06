import type { PageUnion } from "@/types/page";
import type { Condition } from "@/types/condition";

export interface Transition {
    from: number;
    to: number;
    condition: Condition;
}

export default interface Story {
    name: string;
    display_name: string;
    pages: PageUnion[];
    transitions: Transition[];
}
