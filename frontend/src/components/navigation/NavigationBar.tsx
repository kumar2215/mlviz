import { Route } from "lucide-react";
import PathwayGraph from "./PathwayGraph";
export default function NavigationBar() {
    return (
        <div className="flex min-h-0 w-full flex-1 flex-col gap-3 p-3">
            <div className="flex shrink-0 items-center gap-2 text-base font-semibold text-slate-800"><Route className="size-4 text-blue-600" />Pathway</div>
            <PathwayGraph />
        </div>
    );
}
