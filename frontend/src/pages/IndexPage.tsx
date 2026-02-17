import { Button } from "@/components/ui/button";
import { useConfig } from "@/contexts/ConfigContext";
import { Link } from "react-router-dom";

const IndexPage = () => {
    const { config: storyConfig, loading, error } = useConfig();

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-fuchsia-50">
                <div className="animate-pulse text-2xl font-mono text-fuchsia-600">
                    Loading configurations...
                </div>
            </div>
        );
    }

    if (error || !storyConfig) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-fuchsia-50">
                <div className="text-4xl font-bold font-mono text-red-600 mb-4">
                    Error loading config
                </div>
                <div className="text-sm font-mono text-gray-600 mb-8">
                    {error || "Config not found"}
                </div>
                <Button
                    onClick={() => {
                        window.location.href = window.location.pathname;
                    }}
                    className="bg-white text-gray-800 hover:bg-gray-100 border border-gray-200 rounded-full px-6"
                >
                    Reset to Default Config
                </Button>
            </div>
        );
    }

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

            <div className="flex-1 mx-10 grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 p-4 overflow-y-auto">
                {Object.entries(storyConfig.stories).map(([name, s]) => (
                    <Link
                        key={s.name}
                        to={`/story/${name}`}
                    >
                        <Button className="group w-full flex flex-col items-start justify-center text-wrap bg-gradient-to-r from-gray-50 to-white text-gray-800 hover:from-red-500 hover:to-fuchsia-600 hover:text-white transition-all duration-100 hover:shadow-lg font-light hover:font-medium rounded-3xl py-16 px-8 scroll-auto">
                            <span className="font-mono text-left tracking-tighter text-2xl text-wrap bg-gradient-to-r from-fuchsia-500 to-blue-600 bg-clip-text text-transparent group-hover:from-fuchsia-50 group-hover:to-blue-50 group-hover:font-bold">
                                {s.name}
                            </span>
                            <span className="text-sm tracking-tight text-left text-wrap mt-2">
                                {s.description}
                            </span>
                        </Button>
                    </Link>
                ))}
            </div>

            <footer className="shrink-0 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-sm tracking-tight">
                <Link
                    className="px-3 py-1.5 rounded-md bg-gradient-to-r from-fuchsia-400 to-cyan-500 bg-clip-text text-transparent font-bold font-mono hover:opacity-80 transition-opacity"
                    to={"https://github.com/local-minima-lab"}
                >
                    a project by Local Minima Lab
                </Link>
                <Link
                    className="px-3 py-1.5 rounded-md bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent font-mono hover:opacity-80 transition-opacity"
                    to={"https://github.com/zaidansani"}
                >
                    @zaidansani
                </Link>
            </footer>
        </div>
    );
};

export default IndexPage;
