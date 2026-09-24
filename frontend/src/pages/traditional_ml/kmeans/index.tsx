import KMeansStep from "./KMeansStepPage";
import type { IndexPageProps } from "@/types/page";

export default function IndexPage({ name, parameters }: IndexPageProps) {
    let page = null;

    switch (name) {
        case "KMeansStep":
            page = <KMeansStep parameters={parameters} />;
            break;
        default:
            break;
    }

    if (!page) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-fuchsia-50">
                {`Unknown page: ${name}`}
            </div>
        );
    }

    return page;
};
