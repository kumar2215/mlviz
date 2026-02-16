import MarkdownWrapper from "@/components/markdown/MarkdownWrapper";
import { StickyNote } from "lucide-react";

interface SidenoteProps {
    note: string;
}

export const Sidenote: React.FC<SidenoteProps> = ({ note }) => {
    return (
        <div className="p-4 w-full">
            <div className="w-full bg-gradient-to-br from-gray-100 to-slate-100 py-4 items-center flex flex-col rounded-xl">
                <p className="text-xl text-slate-500 flex items-center gap-2 mb-4">
                    <StickyNote className="w-4 h-4" /> Note
                </p>
                <div className="px-4 text-left max-h-48 overflow-y-auto">
                    <MarkdownWrapper variant="small">{note}</MarkdownWrapper>
                </div>
            </div>
        </div>
    );
};
