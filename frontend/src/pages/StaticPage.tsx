import MarkdownWrapper from "@/components/markdown/MarkdownWrapper";
import type { StaticPageParameters } from "@/types/story";
import React, { useEffect, useState } from "react";

const StaticPage: React.FC<StaticPageParameters> = ({ text, link }) => {
    const [content, setContent] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // If raw text is provided, use it directly
        if (text) {
            setContent(text);
            return;
        }

        // If link is provided, fetch the markdown file
        if (link) {
            setLoading(true);
            setError(null);

            fetch(link)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(
                            `Failed to load markdown file: ${response.statusText}`,
                        );
                    }
                    return response.text();
                })
                .then((markdownText) => {
                    setContent(markdownText);
                    setLoading(false);
                })
                .catch((err) => {
                    setError(err.message);
                    setLoading(false);
                });
        }
    }, [text, link]);

    return (
        <div className="flex justify-center h-full w-full overflow-y-auto bg-gradient-to-br from-blue-50 to-purple-50">
            <div className="w-7/10 py-6 px-6">
                {loading && (
                    <div className="text-center text-gray-600">
                        Loading markdown...
                    </div>
                )}
                {error && (
                    <div className="text-center text-red-600">
                        Error: {error}
                    </div>
                )}
                {!loading && !error && content && (
                    <MarkdownWrapper>{content}</MarkdownWrapper>
                )}
                {!loading && !error && !content && (
                    <div className="text-center text-gray-500">
                        No content provided
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaticPage;
