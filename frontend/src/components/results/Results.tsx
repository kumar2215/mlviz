import ClassifierResults from "@/components/results/ClassifierResults";
import RegressionResults from "@/components/results/RegressionResults";
import type { ClassifierResultData, RegressionResultData } from "@/types/model";

type ResultsProps =
    | { problem_type: "classifier"; data: ClassifierResultData | null }
    | {
          problem_type: "regression" | "prediction";
          data: RegressionResultData | null;
      }
    | { problem_type: "clustering"; data: any | null };

export const Results = ({ problem_type, data }: ResultsProps) => {
    console.log("[Results] ", data);
    if (data == null) {
        return <></>;
    }
    if (problem_type === "classifier") {
        return (
            <ClassifierResults
                metrics={data.metrics}
                metadata={data.metadata}
            />
        );
    }
    if (problem_type === "regression" || problem_type === "prediction") {
        return (
            <RegressionResults
                metrics={data.metrics}
                metadata={data.metadata}
            />
        );
    }
    return <></>;
};
