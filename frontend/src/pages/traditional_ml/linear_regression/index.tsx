import LinearRegressionStep from "./step/LinearRegressionStepPage";
import LinearRegressionTrain from "./train/LinearRegressionTrainPage";
import type { IndexPageProps } from "@/types/page";

export default function IndexPage({ name, parameters }: IndexPageProps) {
    let page = null;

    switch (name) {
        case "Linear Regression Step":
            page = <LinearRegressionStep parameters={parameters} />;
            break;
        case "Linear Regression Train":
            page = <LinearRegressionTrain parameters={parameters} />;
            break;
        default:
            break;
    }

    if (!page) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-sky-50">
                {`Unknown page: ${name}`}
            </div>
        );
    }

    return page;
};
