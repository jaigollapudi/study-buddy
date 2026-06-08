"use client";

import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createSubject,
  deleteDocument,
  deleteSubject,
  listDocuments,
  listSubjects,
  updateSubject,
  uploadDocument,
} from "@/lib/client";
import type { SourceDocument, Subject } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACCEPT = ".txt,.md,.markdown,.pdf,.docx";
const COLORS = ["#006BFF", "#0AE8F0", "#00C853", "#8247F5", "#FFA600", "#E5484D"];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminApp() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const list = await listSubjects(true);
    setSubjects(list);
    setActiveId((cur) => cur ?? list[0]?.id ?? null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    reload().catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"));
  }, [reload]);

  const active = subjects.find((s) => s.id === activeId) ?? null;

  return (
    <div className="grid h-dvh grid-cols-1 md:grid-cols-[320px_1fr]">
      <aside className="flex h-full flex-col border-r bg-sidebar">
        <div className="flex items-center justify-between px-4 py-3.5">
          <Button render={<Link href="/" />} nativeButton={false} variant="ghost" size="sm" className="px-2">
            <ArrowLeft className="size-4" /> Back to app
          </Button>
          <ThemeToggle />
        </div>

        <div className="flex items-center justify-between px-4 pb-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Subjects
          </span>
          <CreateSubjectDialog onCreated={reload} />
        </div>

        <div className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-2 pb-4">
          {subjects.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              No subjects yet. Create your first one.
            </p>
          )}
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                s.id === activeId ? "bg-accent text-foreground" : "hover:bg-accent/60",
              )}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
              {!s.isAllowed && (
                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  hidden
                </span>
              )}
            </button>
          ))}
        </div>
      </aside>

      <main className="min-h-0 overflow-y-auto bg-background">
        {active ? (
          <SubjectDetail key={active.id} subject={active} onChanged={reload} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select or create a subject to manage its textbooks.
          </div>
        )}
      </main>
    </div>
  );
}

function CreateSubjectDialog({ onCreated }: { onCreated: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [board, setBoard] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createSubject({ name, grade: grade || null, board: board || null, color });
      await onCreated();
      setOpen(false);
      setName("");
      setGrade("");
      setBoard("");
      toast.success("Subject created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Plus className="size-4" /> New
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New subject</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Class 9 Chemistry" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Grade (optional)</Label>
              <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Class 9" />
            </div>
            <div className="space-y-1.5">
              <Label>Board (optional)</Label>
              <Input value={board} onChange={(e) => setBoard(e.target.value)} placeholder="CBSE" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Colour</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-7 rounded-full ring-offset-2 ring-offset-background transition",
                    color === c && "ring-2 ring-foreground",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create subject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubjectDetail({ subject, onChanged }: { subject: Subject; onChanged: () => Promise<void> }) {
  const [docs, setDocs] = useState<SourceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      setDocs(await listDocuments(subject.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load textbooks");
    } finally {
      setLoading(false);
    }
  }, [subject.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    void loadDocs();
  }, [loadDocs]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const toastId = toast.loading(`Processing “${file.name}” — embedding pages…`);
      try {
        await uploadDocument(subject.id, file);
        toast.success(`Added “${file.name}”`, { id: toastId });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed", { id: toastId });
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    await loadDocs();
    await onChanged();
  }

  async function toggleAllowed() {
    try {
      await updateSubject(subject.id, { isAllowed: !subject.isAllowed });
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  }

  async function removeSubject() {
    if (!confirm(`Delete “${subject.name}” and all its textbooks & chats?`)) return;
    try {
      await deleteSubject(subject.id);
      await onChanged();
      toast.success("Subject deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  async function removeDoc(id: string, name: string) {
    setDocs((d) => d.filter((x) => x.id !== id));
    try {
      await deleteDocument(id);
      toast.success(`Removed “${name}”`);
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
      await loadDocs();
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="size-4 rounded-full" style={{ backgroundColor: subject.color }} />
          <div>
            <h1 className="text-xl font-semibold">{subject.name}</h1>
            <p className="text-sm text-muted-foreground">
              {[subject.board, subject.grade].filter(Boolean).join(" · ") || "Textbook library"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={subject.isAllowed ? "secondary" : "outline"}
            size="sm"
            onClick={toggleAllowed}
          >
            {subject.isAllowed ? "Visible to student" : "Hidden"}
          </Button>
          <Button variant="ghost" size="icon" onClick={removeSubject} className="text-destructive">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
        )}
      >
        {uploading ? (
          <Loader2 className="size-6 animate-spin text-primary" />
        ) : (
          <Upload className="size-6 text-muted-foreground" />
        )}
        <span className="font-medium">
          {uploading ? "Processing… this can take a while for big PDFs" : "Upload textbook"}
        </span>
        <span className="text-xs text-muted-foreground">
          Drop a file or click · PDF · DOCX · TXT · MD
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </button>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BookOpen className="size-4 text-primary" /> Textbooks
          <span className="text-xs font-normal text-muted-foreground">({docs.length})</span>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : docs.length === 0 ? (
          <p className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
            No textbooks yet. Upload one above.
          </p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5">
                <FileText className="size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{doc.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatSize(doc.size)}
                    {doc.pageCount ? ` · ${doc.pageCount} pages` : ""} · {doc.chunkCount} chunks
                  </div>
                </div>
                <StatusBadge status={doc.status} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  onClick={() => removeDoc(doc.id, doc.name)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SourceDocument["status"] }) {
  if (status === "ready")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-3.5" /> Ready
      </span>
    );
  if (status === "error")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive">
        <XCircle className="size-3.5" /> Error
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin" /> Processing
    </span>
  );
}
