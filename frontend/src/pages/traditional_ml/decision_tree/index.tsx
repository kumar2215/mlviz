import DecisionTree from "./DecisionTreePage";
import LessonPage from "./lesson/LessonPage";
import type { IndexPageProps } from "@/types/page";

export default function IndexPage(props: IndexPageProps) {
    const { name } = props;
    let page = null;

    switch (name) {
        case "Decision Tree":
            page = <DecisionTree {...props} />;
            break;
        case "Follow Questions":
        case "Name Tree Parts":
        case "Compare Iris Splits":
        case "Trace Training":
        case "Final Prediction":
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
