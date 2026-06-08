"use client";

import {
  BookOpen,
  Headphones,
  MessageSquare,
  PanelLeft,
  SquareStack,
  Trash2,
  ListChecks,
} from "lucide-react";
import { useState } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { CrosscheckPanel } from "@/components/crosscheck-panel";
import { FlashcardsPanel } from "@/components/flashcards-panel";
import { NotesSidebar } from "@/components/notes-sidebar";
import { PodcastPanel } from "@/components/podcast-panel";
import { QuizPanel } from "@/components/quiz-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStudyStore } from "@/lib/store";
import type { StudyMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: { id: StudyMode; label: string; icon: React.ReactNode }[] = [
  { id: "chat", label: "Chat", icon: <MessageSquare className="size-4" /> },
  { id: "flashcards", label: "Flashcards", icon: <SquareStack className="size-4" /> },
  { id: "quiz", label: "Quiz", icon: <ListChecks className="size-4" /> },
  { id: "crosscheck", label: "Cross-check", icon: <BookOpen className="size-4" /> },
  { id: "podcast", label: "Podcast", icon: <Headphones className="size-4" /> },
];

export function StudyBuddy() {
  const { activeMode, setActiveMode, clearChat, messages } = useStudyStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="grid h-dvh grid-cols-1 md:grid-cols-[320px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r bg-sidebar md:block">
        <NotesSidebar />
      </aside>

      <main className="flex min-w-0 flex-col">
        <header className="flex items-center gap-2 border-b px-3 py-2">
          {/* Mobile sidebar trigger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <PanelLeft className="size-4" />
          </Button>
          <Dialog open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <DialogContent className="max-w-sm p-0" showCloseButton>
              <DialogTitle className="sr-only">Study materials</DialogTitle>
              <NotesSidebar />
            </DialogContent>
          </Dialog>

          <nav className="scrollbar-thin flex flex-1 items-center gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMode(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  activeMode === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>

          {activeMode === "chat" && messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-muted-foreground"
            >
              <Trash2 className="size-4" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </header>

        <div className="min-h-0 flex-1">
          {activeMode === "chat" && <ChatPanel />}
          {activeMode === "flashcards" && <FlashcardsPanel />}
          {activeMode === "quiz" && <QuizPanel />}
          {activeMode === "crosscheck" && <CrosscheckPanel />}
          {activeMode === "podcast" && <PodcastPanel />}
        </div>
      </main>
    </div>
  );
}
