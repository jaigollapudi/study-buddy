"use client";

import {
  ChevronDown,
  ChevronRight,
  GraduationCap,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SetupBanner } from "@/components/setup-banner";
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
import { cn } from "@/lib/utils";

export function SubjectSidebar() {
  const {
    subjects,
    subjectsLoaded,
    loadSubjects,
    expandedSubjectIds,
    toggleSubject,
    sessionsBySubject,
    activeSessionId,
    selectSession,
    newSession,
    renameSession,
    deleteSession,
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
        <SetupBanner />
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

                    {sessions.length === 0 && (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">No chats yet.</p>
                    )}

                    {sessions.map((session) => {
                      const active = session.id === activeSessionId;
                      const editing = editingId === session.id;
                      return (
                        <div
                          key={session.id}
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
                              onBlur={() => commitRename(subject.id, session.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitRename(subject.id, session.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="m-0.5 w-full rounded-md border bg-background px-2 py-1 text-sm outline-none"
                            />
                          ) : (
                            <button
                              onClick={() => selectSession(subject.id, session.id)}
                              className={cn(
                                "min-w-0 flex-1 truncate px-2 py-1.5 text-left text-sm",
                                active ? "text-foreground" : "text-muted-foreground",
                              )}
                            >
                              {session.title}
                            </button>
                          )}

                          {!editing && (
                            <DropdownMenu>
                              <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground opacity-0 hover:bg-background group-hover:opacity-100">
                                <MoreHorizontal className="size-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setDraft(session.title);
                                    setEditingId(session.id);
                                  }}
                                >
                                  <Pencil className="size-3.5" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={async () => {
                                    await deleteSession(subject.id, session.id);
                                    toast.success("Chat deleted");
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
