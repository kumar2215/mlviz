import { ArrowRight, BookOpen, BrainCircuit, ChevronLeft, FlaskConical, MessageSquareText, Network } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import AppHeader from "@/components/layout/AppHeader";
import { useConfig } from "@/store/useConfig";
import { useAuthSession } from "@/store/useAuthSession";

export type ListItem = {
    display_name: string;
    path: string;
    icon?: string;
    description?: string;
    pageCount?: number;
};

export default function ListPage({ listItems }: { listItems: ListItem[] }) {
    const { pathname } = useLocation();
    const categories = useConfig(state => state.config?.categories);
    const signedIn = useAuthSession(state => state.user !== null);
    const storyMode = pathname === "/stories";
    const category = categories?.find(entry => pathname === `/category/${entry.config_path}`);
    const title = storyMode ? "Every discovery starts with a story." : category ? category.name : "Make machine learning click.";

    return (
        <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50">
            <AppHeader />
            <main className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
                    {category && <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"><ChevronLeft className="size-4" />All visualisations</Link>}
                    <div className="mb-9 max-w-3xl">
                        <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-blue-600">{storyMode ? <BookOpen className="size-4" /> : <FlaskConical className="size-4" />}{storyMode ? "Guided discoveries" : "The learning lab"}</p>
                        <h1 className="!text-4xl font-bold leading-tight tracking-tight text-slate-900 lg:!text-5xl">{title}</h1>
                        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">{storyMode ? "Follow a story, try an idea, and discover how the pieces fit together. Choose your next journey below." : category ? category.description : "Explore interactive experiments at your own pace, or switch to Stories for a guided journey through the ideas."}</p>
                    </div>
                    {storyMode && !signedIn && <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900"><strong>Exploring as a guest</strong> · All stories are available. Story progress and XP are not saved to an account yet.</div>}
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                        {listItems.map(item => {
                            const Icon = storyMode ? BookOpen : item.path.includes("neural_networks") ? BrainCircuit : item.path.includes("nlp") ? MessageSquareText : item.path.startsWith("/category/") ? Network : FlaskConical;
                            const unavailable = item.pageCount === 0;
                            return (
                                <Link key={item.path} to={item.path} className="group flex min-h-52 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 motion-reduce:transform-none">
                                    <div className="mb-5 flex items-center justify-between"><span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon className="size-5" /></span><span className="text-xs font-medium text-slate-500">{unavailable ? "Coming soon" : storyMode ? "Guided story" : category ? "Interactive lab" : "Learning area"}</span></div>
                                    <h2 className="!text-xl font-semibold tracking-tight text-slate-900 group-hover:text-blue-700">{item.display_name}</h2>
                                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{item.description || (storyMode ? `Explore ${item.display_name.toLowerCase()} through explanations and hands-on challenges.` : unavailable ? "This visualisation is being built. Take a look at the other labs while you wait." : "Experiment, explore, and see the ideas in action.")}</p>
                                    <span className="mt-5 flex items-center gap-2 text-sm font-semibold text-blue-700">{unavailable ? "View preview" : storyMode ? "Start story" : category ? "Open lab" : "Explore area"}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" /></span>
                                </Link>
                            );
                        })}
                    </div>
                    {listItems.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">No activities have been configured here yet.</p>}
                </div>
            </main>
            <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-6 py-3 text-xs text-slate-500"><a href="https://github.com/local-minima-lab" className="hover:text-blue-700">A project by Local Minima Lab</a><a href="https://github.com/kumar2215" className="hover:text-blue-700">@kumar</a></footer>
        </div>
    );
}
