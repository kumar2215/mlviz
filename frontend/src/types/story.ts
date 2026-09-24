import type { PageUnion } from "@/types/page";
import type { Transition } from "@/types/visualisation";

export interface Story {
    name: string;
    display_name: string;
    pages: PageUnion[];
    transitions: Transition[];
}

export interface Stories {
    [key: string]: Story;
}
