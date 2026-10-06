import SVMPredict from "./predict/SVMPredictPage";
import SVMStep from "./step/SVMStepPage";
import SVMTrain from "./train/SVMTrainPage";

import type { IndexPageProps } from "@/types/page";

export default function IndexPage({ name, parameters }: IndexPageProps) {
    let page = null;

    switch (name) {
        case "SVMStep":
            page = <SVMStep parameters={parameters} />;
            break;
        case "SVMTrain":
            page = <SVMTrain parameters={parameters} />;
            break
        case "SVMPredict":
            page = <SVMPredict parameters={parameters} />;
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
