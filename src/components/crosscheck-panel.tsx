"use client";

import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { crosscheck } from "@/lib/client";
import { useStudyStore } from "@/lib/store";
import type { CrosscheckResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyHint } from "./feature-shell";

const VERDICTS: Record<
  CrosscheckResult["verdict"],
  { label: string; icon: React.ReactNode; cls: string }
> = {
  correct: {
    label: "Correct",
    icon: <CheckCircle2 className="size-4" />,
    cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  "partially-correct": {
    label: "Partially correct",
    icon: <ShieldCheck className="size-4" />,
    cls: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  incorrect: {
    label: "Needs work",
    icon: <XCircle className="size-4" />,
    cls: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
  },
};

export function CrosscheckPanel() {
  const subjectId = useStudyStore((s) => s.activeSubjectId);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CrosscheckResult | null>(null);

  async function review() {
    if (!question.trim() || !answer.trim()) {
      toast.error("Add both a question and your answer.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      setResult(await crosscheck({ question, answer, subjectId }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to review answer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="scrollbar-thin h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6">
        <header className="space-y-1">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <span className="text-2xl">🧪</span> Cross-check
          </h2>
          <p className="text-sm text-muted-foreground">
            Paste a question and your answer — I&apos;ll check it against your notes and
            explain exactly what to fix.
          </p>
        </header>

        <div className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Question</Label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What was the question?"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Your answer</Label>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="What did you write?"
              rows={4}
            />
          </div>
          <Button onClick={review} disabled={loading} className="w-full sm:w-auto">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Review my answer
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Checking your answer…
          </div>
        )}

        {!loading && !result && (
          <EmptyHint icon={<ShieldCheck className="size-5" />} text="Your feedback will appear here." />
        )}

        {result && (
          <div className="space-y-3">
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium",
                VERDICTS[result.verdict].cls,
              )}
            >
              {VERDICTS[result.verdict].icon}
              {VERDICTS[result.verdict].label}
            </div>
            <div className="rounded-xl border bg-card p-4">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Feedback
              </span>
              <div className="mt-1">
                <Markdown>{result.feedback}</Markdown>
              </div>
            </div>
            {result.correctAnswer && (
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
                <span className="text-xs font-medium uppercase tracking-wide text-primary">
                  Correct answer
                </span>
                <div className="mt-1">
                  <Markdown>{result.correctAnswer}</Markdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
