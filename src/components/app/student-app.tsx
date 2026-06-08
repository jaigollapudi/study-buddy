"use client";

import {
  BookOpen,
  GraduationCap,
  Headphones,
  ListChecks,
  MessageSquare,
  PanelLeft,
  SquareStack,
} from "lucide-react";
import { useState } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { CrosscheckPanel } from "@/components/crosscheck-panel";
import { FlashcardsPanel } from "@/components/flashcards-panel";
import { PodcastPanel } from "@/components/podcast-panel";
import { QuizPanel } from "@/components/quiz-panel";
import { SubjectSidebar } from "@/components/app/subject-sidebar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

export function StudentApp() {
  const { activeMode, setActiveMode, activeSessionId, activeSubject } = useStudyStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const subject = activeSubject();

  return (
    <div className="grid h-dvh grid-cols-1 md:grid-cols-[300px_1fr]">
      <aside className="hidden border-r md:block">
        <SubjectSidebar />
      </aside>

      <main className="flex min-w-0 flex-col bg-background">
        <header className="flex items-center gap-2 border-b px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <PanelLeft className="size-4" />
          </Button>
          <Dialog open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <DialogContent className="max-w-xs p-0" showCloseButton>
              <DialogTitle className="sr-only">Subjects</DialogTitle>
              <SubjectSidebar />
            </DialogContent>
          </Dialog>

          {activeSessionId && subject && (
            <>
              <span
                className="ml-1 size-2.5 rounded-full"
                style={{ backgroundColor: subject.color }}
              />
              <span className="mr-2 hidden text-sm font-medium sm:inline">{subject.name}</span>
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
            </>
          )}
        </header>

        <div className="min-h-0 flex-1">
          {!activeSessionId ? (
            <Welcome />
          ) : (
            <>
              {activeMode === "chat" && <ChatPanel />}
              {activeMode === "flashcards" && <FlashcardsPanel />}
              {activeMode === "quiz" && <QuizPanel />}
              {activeMode === "crosscheck" && <CrosscheckPanel />}
              {activeMode === "podcast" && <PodcastPanel />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Welcome() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-accent text-3xl">
        <GraduationCap className="size-8 text-primary" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to Study Buddy</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Pick a subject from the left, then open a past chat or start a new one. Every answer
          is grounded in your textbooks — with page citations you can verify.
        </p>
      </div>
    </div>
  );
}
