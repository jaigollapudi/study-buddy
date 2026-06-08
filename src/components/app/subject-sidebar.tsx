"use client";

import {
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Headphones,
  ListChecks,
  MessageSquare,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  SquareStack,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStudyStore } from "@/lib/store";
import type { ArtifactMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const ARTIFACT_META: Record<ArtifactMode, { label: string; icon: React.ReactNode }> = {
  flashcards: { label: "Flashcards", icon: <SquareStack className="size-3.5" /> },
  quiz: { label: "Quiz", icon: <ListChecks className="size-3.5" /> },
  podcast: { label: "Podcast", icon: <Headphones className="size-3.5" /> },
};

export function SubjectSidebar() {
  const {
    subjects,
    subjectsLoaded,
    loadSubjects,
    expandedSubjectIds,
    toggleSubject,
    sessionsBySubject,
    artifactsBySubject,
    sidebarSearch,
    setSidebarSearch,
    activeSessionId,
    activeArtifactId,
    selectSession,
    selectArtifact,
    newSession,
    renameSession,
    deleteSession,
    deleteArtifact,
  } = useStudyStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!subjectsLoaded) void loadSubjects();
  }, [subjectsLoaded, loadSubjects]);

  useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  async function commitRename(subjectId: string, sessionId: string) {
    const title = draft.trim();
    setEditingId(null);
    if (title) await renameSession(subjectId, sessionId, title);
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="size-4.5" />
          </div>
          <span className="font-semibold tracking-tight">Study Buddy</span>
        </Link>
        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <Button
            render={<Link href="/admin" />}
            nativeButton={false}
            variant="ghost"
            size="icon"
            aria-label="Admin"
          >
            <Settings className="size-4" />
          </Button>
        </div>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            placeholder="Search chats, quizzes, podcasts…"
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60"
          />
        </div>
      </div>

      <div className="px-4 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Subjects
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-0.5 pb-4">
          {subjectsLoaded && subjects.length === 0 && (
            <div className="mx-1 mt-2 rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
              No subjects yet.
              <Button
                render={<Link href="/admin" />}
                nativeButton={false}
                variant="link"
                className="h-auto p-0 text-primary"
              >
                Add one in Admin →
              </Button>
            </div>
          )}

          {subjects.map((subject) => {
            const expanded = expandedSubjectIds.includes(subject.id);
            const sessions = sessionsBySubject[subject.id] ?? [];
            const artifacts = artifactsBySubject[subject.id] ?? [];
            const q = sidebarSearch.trim().toLowerCase();
            const rows = [
              ...sessions.map((session) => ({
                id: session.id,
                type: "chat" as const,
                label: "Chat",
                title: session.title,
                updatedAt: session.updatedAt,
                icon: <MessageSquare className="size-3.5" />,
              })),
              ...artifacts.map((artifact) => ({
                id: artifact.id,
                type: "artifact" as const,
                mode: artifact.mode,
                label: ARTIFACT_META[artifact.mode].label,
                title: artifact.title,
                updatedAt: artifact.updatedAt,
                icon: ARTIFACT_META[artifact.mode].icon,
              })),
            ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
            const filteredRows = q
              ? rows.filter((row) =>
                  `${row.label} ${row.title}`.toLowerCase().includes(q),
                )
              : rows;
            const subjectMatches = subject.name.toLowerCase().includes(q);
            if (q && !subjectMatches && filteredRows.length === 0) return null;

            return (
              <div key={subject.id}>
                <button
                  onClick={() => toggleSubject(subject.id)}
                  className="group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium transition-colors hover:bg-accent"
                >
                  {expanded ? (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: subject.color }}
                  />
                  <span className="min-w-0 flex-1 truncate">{subject.name}</span>
                  <span className="shrink-0 text-[11px] font-normal text-muted-foreground">
                    {subject.documentCount ?? 0} bk
                  </span>
                </button>

                {expanded && (
                  <div className="ml-3 space-y-0.5 border-l pl-2">
                    <button
                      onClick={() => newSession(subject.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-primary transition-colors hover:bg-accent"
                    >
                      <MessageSquarePlus className="size-4" /> New chat
                    </button>

                    {filteredRows.length === 0 && (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">
                        {q ? "No matching history." : "No history yet."}
                      </p>
                    )}

                    {filteredRows.map((row) => {
                      const active =
                        row.type === "chat"
                          ? row.id === activeSessionId
                          : row.id === activeArtifactId;
                      const editing = row.type === "chat" && editingId === row.id;
                      return (
                        <div
                          key={`${row.type}-${row.id}`}
                          className={cn(
                            "group flex items-center gap-1 rounded-lg pr-1 transition-colors",
                            active ? "bg-accent" : "hover:bg-accent/60",
                          )}
                        >
                          {editing ? (
                            <input
                              ref={editRef}
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onBlur={() => commitRename(subject.id, row.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitRename(subject.id, row.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="m-0.5 w-full rounded-md border bg-background px-2 py-1 text-sm outline-none"
                            />
                          ) : (
                            <button
                              onClick={() => {
                                if (row.type === "chat") selectSession(subject.id, row.id);
                                else selectArtifact(subject.id, row.id);
                              }}
                              className={cn(
                                "flex min-w-0 flex-1 items-center gap-1.5 truncate px-2 py-1.5 text-left text-sm",
                                active ? "text-foreground" : "text-muted-foreground",
                              )}
                            >
                              <span className="shrink-0 text-primary">{row.icon}</span>
                              <span className="shrink-0 text-[11px] font-medium">
                                {row.label}:
                              </span>
                              <span className="min-w-0 truncate">{row.title}</span>
                            </button>
                          )}

                          {!editing && (
                            <DropdownMenu>
                              <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground opacity-0 hover:bg-background group-hover:opacity-100">
                                <MoreHorizontal className="size-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem
                                  disabled={row.type !== "chat"}
                                  onClick={() => {
                                    if (row.type !== "chat") return;
                                    setDraft(row.title);
                                    setEditingId(row.id);
                                  }}
                                >
                                  <Pencil className="size-3.5" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={async () => {
                                    if (row.type === "chat") {
                                      await deleteSession(subject.id, row.id);
                                      toast.success("Chat deleted");
                                    } else {
                                      await deleteArtifact(subject.id, row.id);
                                      toast.success(`${row.label} deleted`);
                                    }
                                  }}
                                >
                                  <Trash2 className="size-3.5" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t p-3">
        <Button
          render={<Link href="/admin" />}
          nativeButton={false}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Plus className="size-4" /> Manage subjects & textbooks
        </Button>
      </div>
    </div>
  );
}
