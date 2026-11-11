import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";

interface SuccessAlertProps {
    title?: string;
    description: string;
}

export const SuccessAlert: React.FC<SuccessAlertProps> = ({
    title,
    description,
}) => {
    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <Alert className="bg-success-strong   backdrop-blur-sm border border-success-border rounded-lg p-4 shadow-xl">
                <CheckCircle2 className="!text-on-success h-4 w-4" />
                <AlertTitle className="font-bold text-on-success">
                    {title ? title : "Success!"}
                </AlertTitle>
                <AlertDescription className="text-primary-foreground">
                    {description}
                </AlertDescription>
            </Alert>
        </div>
    );
};
