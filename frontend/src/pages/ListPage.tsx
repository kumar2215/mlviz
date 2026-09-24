import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export type ListItem = {
    display_name: string;
    path: string;
    icon?: string;
};

export default function ListPage({ listItems }: { listItems: ListItem[]; }) {
    return (
        <div className="h-screen w-screen overflow-hidden flex flex-col bg-gradient-to-br from-blue-50 to-fuchsia-50">
            <div className="flex flex-col justify-self-center text-center mb-4 shrink-0">
                <h1 className="w-fit mx-auto font-extrabold tracking-tighter font-width-expanded pt-8 px-3 rounded-md bg-gradient-to-r from-fuchsia-600 to-blue-400 bg-clip-text text-transparent font-bold !text-7xl hover:opacity-80 transition-opacity">
                    mlviz
                </h1>
                <p className="w-fit mx-auto font-mono text-xs tracking-tightest bg-gradient-to-r from-fuchsia-900 to-blue-700 bg-clip-text text-transparent">
                    machine learning visualisations
                </p>
            </div>

            <div className="flex-1 mx-4 grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 p-4 overflow-y-auto content-start">
                {listItems.map((l) => (
                    <Link
                        key={l.display_name}
                        to={l.path}
                    >   
                        <Button className="group w-full flex flex-row justify-start items-center gap-5 text-wrap bg-gradient-to-r from-gray-50 to-white text-gray-800 hover:from-red-500 hover:to-fuchsia-600 hover:text-white transition-all duration-100 hover:shadow-lg font-light hover:font-medium rounded-3xl py-16 px-8 scroll-auto">
                            {/* {l.icon && <img src={`icons/${l.icon}`} alt={l.display_name} className="w-12 h-12" />} */}
                            <span className="font-mono text-left tracking-tighter text-2xl text-wrap bg-gradient-to-r from-fuchsia-500 to-blue-600 bg-clip-text text-transparent group-hover:from-fuchsia-50 group-hover:to-blue-50 group-hover:font-bold">
                                {l.display_name}
                            </span>
                        </Button>
                    </Link>
                ))}
            </div>

            <footer className="mt-auto shrink-0 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-sm tracking-tight">
                <Link
                    className="px-3 py-1.5 rounded-md bg-gradient-to-r from-fuchsia-600 to-cyan-600 bg-clip-text text-transparent font-bold font-mono hover:opacity-80 transition-opacity hover:underline"
                    to={"https://github.com/local-minima-lab"}
                >
                    a project by Local Minima Lab
                </Link>
                <Link
                    className="px-3 py-1.5 rounded-md bg-gradient-to-r from-fuchsia-600 to-cyan-600 bg-clip-text text-transparent font-mono hover:opacity-80 transition-opacity hover:underline"
                    to={"https://github.com/zaidansani"}
                >
                    @zaidansani
                </Link>
            </footer>
        </div>
    );
};
