"use client";

import { Check, HelpCircle, Loader2, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateQuiz } from "@/lib/client";
import { useStudyStore } from "@/lib/store";
import type { QuizQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyHint, FeatureShell, useFeatureMessages } from "./feature-shell";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function QuizPanel() {
  const subjectId = useStudyStore((s) => s.activeSubjectId);
  const buildMessages = useFeatureMessages();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  async function generate() {
    const messages = buildMessages(topic);
    if (!messages) return;
    setLoading(true);
    reset();
    setQuestions([]);
    try {
      setQuestions(await generateQuiz({ messages, subjectId }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setAnswers({});
    setSubmitted(false);
  }

  const score = questions.reduce(
    (acc, q, i) => acc + (answers[i] === q.answerIndex ? 1 : 0),
    0,
  );
  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;

  return (
    <FeatureShell
      icon="❓"
      title="Quiz"
      description="Test yourself with multiple-choice questions drawn from your material."
      topic={topic}
      setTopic={setTopic}
      placeholder="Optional: a topic to be quizzed on (leave blank to use your chat)"
      onGenerate={generate}
      loading={loading}
      ctaLabel="Generate quiz"
    >
      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Writing your quiz…
        </div>
      )}

      {!loading && questions.length === 0 && (
        <EmptyHint icon={<HelpCircle className="size-5" />} text="Your quiz questions will appear here." />
      )}

      {questions.length > 0 && (
        <div className="space-y-4">
          {submitted && (
            <div className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
              <div>
                <span className="text-sm text-muted-foreground">Your score</span>
                <div className="text-2xl font-bold">
                  {score}
                  <span className="text-base font-normal text-muted-foreground">/{questions.length}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="size-3.5" /> Try again
              </Button>
            </div>
          )}

          {questions.map((q, qi) => (
            <div key={qi} className="rounded-xl border bg-card p-4">
              <p className="mb-3 text-sm font-medium">
                {qi + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const selected = answers[qi] === oi;
                  const isCorrect = oi === q.answerIndex;
                  const showState = submitted && (selected || isCorrect);
                  return (
                    <button
                      key={oi}
                      disabled={submitted}
                      onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        !submitted && selected && "border-primary bg-primary/10",
                        !submitted && !selected && "hover:bg-accent",
                        showState && isCorrect && "border-emerald-500/50 bg-emerald-500/10",
                        showState && selected && !isCorrect && "border-red-500/50 bg-red-500/10",
                        submitted && !showState && "opacity-60",
                      )}
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-medium">
                        {LETTERS[oi]}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {showState && isCorrect && <Check className="size-4 text-emerald-500" />}
                      {showState && selected && !isCorrect && <X className="size-4 text-red-500" />}
                    </button>
                  );
                })}
              </div>
              {submitted && q.explanation && (
                <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {q.explanation}
                </p>
              )}
            </div>
          ))}

          {!submitted && (
            <Button onClick={() => setSubmitted(true)} disabled={!allAnswered} className="w-full">
              Submit answers
            </Button>
          )}
        </div>
      )}
    </FeatureShell>
  );
}
