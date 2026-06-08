import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/** Renders Markdown with compact, theme-aware styling (no typography plugin). */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: (props) => <p className="my-2" {...props} />,
          ul: (props) => <ul className="my-2 list-disc space-y-1 pl-5" {...props} />,
          ol: (props) => <ol className="my-2 list-decimal space-y-1 pl-5" {...props} />,
          li: (props) => <li className="marker:text-muted-foreground" {...props} />,
          h1: (props) => <h1 className="mb-2 mt-3 text-lg font-semibold" {...props} />,
          h2: (props) => <h2 className="mb-2 mt-3 text-base font-semibold" {...props} />,
          h3: (props) => <h3 className="mb-1 mt-2 text-sm font-semibold" {...props} />,
          strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
          a: (props) => (
            <a className="text-primary underline underline-offset-2" target="_blank" rel="noreferrer" {...props} />
          ),
          code: ({ className: c, children, ...rest }) => {
            const isBlock = /language-/.test(c ?? "");
            return isBlock ? (
              <code className="block overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs" {...rest}>
                {children}
              </code>
            ) : (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8em]" {...rest}>
                {children}
              </code>
            );
          },
          pre: (props) => <pre className="my-2" {...props} />,
          blockquote: (props) => (
            <blockquote className="my-2 border-l-2 border-primary/50 pl-3 text-muted-foreground" {...props} />
          ),
          table: (props) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-xs" {...props} />
            </div>
          ),
          th: (props) => <th className="border border-border bg-muted px-2 py-1 text-left font-medium" {...props} />,
          td: (props) => <td className="border border-border px-2 py-1" {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
