import KNNPredict from "./predict/KNNPredictPage";
import KNNTrain from "./train/KNNTrainPage";
import type { IndexPageProps } from "@/types/page";

export default function IndexPage({ name, parameters }: IndexPageProps) {
    let page = null;

    switch (name) {
        case "KNNPredict":
            page = <KNNPredict parameters={parameters} />;
            break;
        case "KNNTrain":
            page = <KNNTrain parameters={parameters} />;
            break
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
