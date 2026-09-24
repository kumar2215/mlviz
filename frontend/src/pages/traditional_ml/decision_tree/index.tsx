import DecisionTree from "./DecisionTreePage";
import { DecisionTreeProvider } from "./DecisionTreeContext";
import type { IndexPageProps } from "@/types/page";

export default function IndexPage({ name }: IndexPageProps) {
    let page = null;

    switch (name) {
        case "DecisionTree":
            page = <DecisionTree />;
            break;
        default:
            break;
    }

    if (!page) {
        page = <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-fuchsia-50">Unknown page: {name}</div>;
    }

    return (
        <DecisionTreeProvider>
            {page}
        </DecisionTreeProvider>
    );
};
