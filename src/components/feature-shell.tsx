"use client";

import { Loader2, Wand2 } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStudyStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";

/**
 * Returns a builder that turns an optional topic into the message list to send.
 * Falls back to the current chat history; warns if there's nothing to work with.
 */
export function useFeatureMessages() {
  return useCallback((topic: string): ChatMessage[] | null => {
    const trimmed = topic.trim();
    if (trimmed) return [{ role: "user", content: trimmed }];

    const messages = useStudyStore
      .getState()
      .messages.map((m) => ({ role: m.role, content: m.content }))
      .filter((m) => m.content.trim());
    if (messages.length === 0) {
      toast.error("Enter a topic, or start a chat first.");
      return null;
    }
    return messages;
  }, []);
}

interface FeatureShellProps {
  icon: string;
  title: string;
  description: string;
  topic: string;
  setTopic: (v: string) => void;
  placeholder: string;
  onGenerate: () => void;
  loading: boolean;
  ctaLabel: string;
  children: React.ReactNode;
}

export function FeatureShell({
  icon,
  title,
  description,
  topic,
  setTopic,
  placeholder,
  onGenerate,
  loading,
  ctaLabel,
  children,
}: FeatureShellProps) {
  return (
    <div className="scrollbar-thin h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6">
        <header className="space-y-1">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <span className="text-2xl">{icon}</span> {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </header>

        <div className="space-y-2 rounded-2xl border bg-card p-3">
          <Textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={placeholder}
            rows={2}
            className="resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
          />
          <Button onClick={onGenerate} disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wand2 className="size-4" />
            )}
            {ctaLabel}
          </Button>
        </div>

        {children}
      </div>
    </div>
  );
}

export function EmptyHint({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
      <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-primary">
        {icon}
      </div>
      {text}
    </div>
  );
}
