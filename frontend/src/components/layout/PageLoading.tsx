export default function PageLoading({ label = "Loading page…" }: { label?: string }) {
    return <div role="status" aria-live="polite" className="flex h-full min-h-0 w-full items-center justify-center p-4 text-center">
        <span className="font-mono text-2xl text-sky-600 motion-safe:animate-pulse">{label}</span>
    </div>;
}
