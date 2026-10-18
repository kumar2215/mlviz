import DecisionTree from "./DecisionTreePage";
import LessonPage from "./lesson/LessonPage";
import type { IndexPageProps } from "@/types/page";

export default function IndexPage(props: IndexPageProps) {
    const { name } = props;
    let page = null;

    switch (name) {
        case "DecisionTree":
            page = <DecisionTree />;
            break;
        case "FollowQuestions":
        case "NameTreeParts":
        case "CompareIrisSplits":
        case "TraceTraining":
        case "FinalPrediction":
            page = <LessonPage {...props} />;
            break;
        default:
            break;
    }

    if (!page) {
        page = <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-sky-50">Unknown page: {name}</div>;
    }

    return page;
};
