import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

export default function Latex({ children }) {
    const rendered = useMemo(() => {
        if (!children || typeof children !== "string") return children || "";

        const parts = children.split(/(\$[^$]+\$)/g);

        return parts
            .map((part, i) => {
                if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
                    const tex = part.slice(1, -1);
                    try {
                        const html = katex.renderToString(tex, {
                            throwOnError: false,
                            displayMode: false,
                        });
                        return `<span key="${i}" class="katex-inline">${html}</span>`;
                    } catch {
                        return part;
                    }
                }
                const escaped = part
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
                return escaped;
            })
            .join("");
    }, [children]);

    return <span dangerouslySetInnerHTML={{ __html: rendered }} />;
}
