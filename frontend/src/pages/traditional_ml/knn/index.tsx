import KNNPredict from "./predict/KNNPredictPage";
import KNNTrain from "./train/KNNTrainPage";
import type { IndexPageProps } from "@/types/page";

export default function IndexPage({ name, parameters }: IndexPageProps) {
    let page = null;

    switch (name) {
        case "KNN Predict":
            page = <KNNPredict parameters={parameters} />;
            break;
        case "KNN Train":
            page = <KNNTrain parameters={parameters} />;
            break
        default:
            break;
    }

    if (!page) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-page  ">
                {`Unknown page: ${name}`}
            </div>
        );
    }

    return page;
};
