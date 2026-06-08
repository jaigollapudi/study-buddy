"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Markdown } from "@/components/markdown";
import { generateFlashcards } from "@/lib/client";
import { useStudyStore } from "@/lib/store";
import type { Flashcard } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyHint, FeatureShell, useFeatureMessages } from "./feature-shell";

export function FlashcardsPanel() {
  const { effectiveDocIds } = useStudyStore();
  const buildMessages = useFeatureMessages();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());

  async function generate() {
    const messages = buildMessages(topic);
    if (!messages) return;
    setLoading(true);
    setCards([]);
    setFlipped(new Set());
    try {
      const result = await generateFlashcards({ messages, docIds: effectiveDocIds() });
      setCards(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate flashcards");
    } finally {
      setLoading(false);
    }
  }

  function toggle(i: number) {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <FeatureShell
      icon="🎯"
      title="Flashcards"
      description="Auto-generate Q&A cards from your notes or chat. Click a card to flip it."
      topic={topic}
      setTopic={setTopic}
      placeholder="Optional: a topic to focus on (leave blank to use your chat)"
      onGenerate={generate}
      loading={loading}
      ctaLabel="Generate flashcards"
    >
      {cards.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cards.map((card, i) => (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={cn("flip-card h-44 text-left", flipped.has(i) && "is-flipped")}
            >
              <div className="flip-inner relative size-full">
                <div className="flip-face absolute inset-0 flex flex-col rounded-xl border bg-card p-4">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-primary">
                    Question {i + 1}
                  </span>
                  <div className="mt-2 flex-1 overflow-auto text-sm">{card.question}</div>
                  <span className="text-[11px] text-muted-foreground">Click to reveal answer</span>
                </div>
                <div className="flip-face flip-back absolute inset-0 flex flex-col rounded-xl border border-primary/40 bg-primary/5 p-4">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-primary">
                    Answer
                  </span>
                  <div className="mt-2 flex-1 overflow-auto">
                    <Markdown>{card.answer}</Markdown>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Building your flashcards…
        </div>
      )}
      {!loading && cards.length === 0 && (
        <EmptyHint icon={<Sparkles className="size-5" />} text="Your generated flashcards will appear here." />
      )}
    </FeatureShell>
  );
}
