"use client";

import { ArrowUp, Loader2, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Citations } from "@/components/citations";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { useStudyStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="sb-dot size-1.5 rounded-full bg-muted-foreground"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

const QUICK_STARTS = [
  "Explain the key ideas in this chapter",
  "Teach me this topic step by step",
  "Give me a simple summary",
  "What are the most important points?",
];

export function ChatPanel() {
  const {
    messages,
    messagesLoading,
    buddyName,
    isStreaming,
    sendMessage,
    stopStreaming,
    activeSubject,
  } = useStudyStore();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevMsgCountRef = useRef(0);
  const subject = activeSubject();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Jump instantly when loading history; smooth-scroll only for new messages.
    const isInitialLoad = prevMsgCountRef.current === 0 && messages.length > 0;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: isInitialLoad ? "instant" : "smooth",
    });
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  // Reset counter when the session changes so the next load is treated as initial.
  const activeSessionId = useStudyStore((s) => s.activeSessionId);
  useEffect(() => {
    prevMsgCountRef.current = 0;
  }, [activeSessionId]);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  function submit() {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    requestAnimationFrame(autoGrow);
    void sendMessage(text);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          {messagesLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading conversation…
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-accent text-3xl">
                💬
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Ask {buddyName} about {subject?.name ?? "your subject"}
                </h2>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Answers are grounded in your {subject?.name ?? "subject"} textbook, with page
                  citations so you can check the source.
                </p>
              </div>
              <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                {QUICK_STARTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput("");
                      void sendMessage(q);
                    }}
                    className="rounded-xl border bg-card px-4 py-3 text-left text-sm transition-colors hover:border-primary/50 hover:bg-accent"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((m, i) => (
                <div
                  key={m.id ?? i}
                  className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  {m.role === "assistant" && (
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-sm">
                      🤖
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border bg-card",
                    )}
                  >
                    {m.role === "assistant" && m.content === "" ? (
                      <TypingDots />
                    ) : m.role === "assistant" ? (
                      <>
                        <Markdown>{m.content}</Markdown>
                        {Array.isArray(m.citations) && m.citations.length > 0 && (
                          <Citations citations={m.citations} />
                        )}
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t bg-background/80 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 focus-within:border-primary/50">
            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              placeholder={`Ask ${buddyName} anything…`}
              onChange={(e) => {
                setInput(e.target.value);
                autoGrow();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              className="scrollbar-thin max-h-[200px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
            />
            {isStreaming ? (
              <Button size="icon" variant="secondary" onClick={stopStreaming} className="size-9 shrink-0">
                <Square className="size-4" />
              </Button>
            ) : (
              <Button size="icon" onClick={submit} disabled={!input.trim()} className="size-9 shrink-0">
                <ArrowUp className="size-4" />
              </Button>
            )}
          </div>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            Enter to send · Shift+Enter for a new line
          </p>
        </div>
      </div>
    </div>
  );
}
