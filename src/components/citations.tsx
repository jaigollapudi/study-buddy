import { FileText } from "lucide-react";
import type { Citation } from "@/lib/types";

/** Compact source chips shown under an assistant message. */
export function Citations({ citations }: { citations: Citation[] }) {
  if (!Array.isArray(citations) || !citations.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {citations.map((c, i) => (
        <span
          key={`${c.documentId}-${c.page ?? c.chunkIndex}-${i}`}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground"
          title={c.documentName}
        >
          <FileText className="size-3 text-primary" />
          <span className="max-w-[160px] truncate">{prettyName(c.documentName)}</span>
          {c.page != null && <span className="text-primary">p.{c.page}</span>}
        </span>
      ))}
    </div>
  );
}

function prettyName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
}
