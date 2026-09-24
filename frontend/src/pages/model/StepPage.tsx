import ModelOptionsForm from "@/components/input/ModelOptionsForm";
import useStep from "@/hooks/useStep";
import type { Parameters } from "@/types/page";

type StepPageProps = {
    useModel: () => any;
    parameters: Parameters;
    StepVisualizationComponent: React.FC;
}

export default function StepPage({ useModel, parameters, StepVisualizationComponent } : StepPageProps) {
    return (
        <div className="grid grid-cols-10 mx-auto w-full h-full relative">
            {/* Standard Parameters Sidebar */}
            <div className="col-span-2 shadow-lg justify-between overflow-auto p-4 bg-gradient-to-br from-blue-50 to-purple-50 min-h-0">
                <ModelOptionsForm
                    {...useStep(useModel, parameters)}
                    buttonLabel="Apply Parameters"
                />
            </div>

            {/* Main Interactive Step Area */}
            <div className="col-span-8 shadow-lg overflow-hidden relative bg-white min-h-0">
                <StepVisualizationComponent />
            </div>
        </div>
    );
};
