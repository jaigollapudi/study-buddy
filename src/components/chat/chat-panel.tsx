"use client";

import { ArrowUp, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { streamChat } from "@/lib/client";
import { useStudyStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const QUICK_STARTS = [
  "Explain the key concepts in my notes",
  "Teach me this topic step by step",
  "Give me a quick summary",
  "What should I focus on first?",
];

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

export function ChatPanel() {
  const {
    messages,
    buddyName,
    addMessage,
    appendToLastAssistant,
    replaceLastAssistant,
    isStreaming,
    setStreaming,
    effectiveDocIds,
  } = useStudyStore();

  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || isStreaming) return;

    setInput("");
    requestAnimationFrame(autoGrow);

    addMessage({ role: "user", content });
    addMessage({ role: "assistant", content: "" });
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const history = [...useStudyStore.getState().messages].filter(
      (m, i, arr) => !(i === arr.length - 1 && m.role === "assistant"),
    );

    try {
      let received = false;
      await streamChat(
        { messages: history, docIds: effectiveDocIds(), signal: controller.signal },
        (delta) => {
          received = true;
          appendToLastAssistant(delta);
        },
      );
      if (!received) {
        replaceLastAssistant("_(No response — is the model running?)_");
      }
    } catch (err) {
      if (controller.signal.aborted) {
        appendToLastAssistant("\n\n_(stopped)_");
      } else {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        replaceLastAssistant(`⚠️ ${msg}`);
        toast.error(msg);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
                👋
              </div>
              <div>
                <h2 className="text-xl font-semibold">Hey! I&apos;m {buddyName}</h2>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Upload your notes on the left, then ask me anything. I&apos;ll teach you
                  step by step, quiz you, or summarise — all running locally on your machine.
                </p>
              </div>
              <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                {QUICK_STARTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
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
                  key={i}
                  className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  {m.role === "assistant" && (
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-sm">
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
                      <Markdown>{m.content}</Markdown>
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
                  void send(input);
                }
              }}
              className="scrollbar-thin max-h-[200px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
            />
            {isStreaming ? (
              <Button size="icon" variant="secondary" onClick={stop} className="size-9 shrink-0">
                <Square className="size-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={() => send(input)}
                disabled={!input.trim()}
                className="size-9 shrink-0"
              >
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
