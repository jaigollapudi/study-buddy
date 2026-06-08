"use client";

import {
  FileText,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SetupBanner } from "@/components/setup-banner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  deleteDocument,
  listDocuments,
  uploadDocument,
} from "@/lib/client";
import { useStudyStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const ACCEPT = ".txt,.md,.markdown,.pdf,.docx";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NotesSidebar() {
  const {
    buddyName,
    setBuddyName,
    documents,
    setDocuments,
    addDocument,
    removeDocument,
    selectedDocIds,
    toggleDocSelection,
  } = useStudyStore();

  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      .catch(() => {
        /* surfaced via setup banner */
      });
  }, [setDocuments]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const doc = await uploadDocument(file);
        addDocument(doc);
        toast.success(`Added “${doc.name}” (${doc.chunkCount} chunks)`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(id: string, name: string) {
    removeDocument(id);
    try {
      await deleteDocument(id);
      toast.success(`Removed “${name}”`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const usingAll = selectedDocIds.length === 0;

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-base">📚</span>
          </div>
          <div className="font-semibold leading-tight">
            Study Buddy
            <div className="text-xs font-normal text-muted-foreground">local & private</div>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <SetupBanner />

      <div>
        <Label htmlFor="buddy-name" className="text-xs text-muted-foreground">
          Buddy&apos;s name
        </Label>
        <Input
          id="buddy-name"
          value={buddyName}
          onChange={(e) => setBuddyName(e.target.value)}
          placeholder="e.g. Nova, Max, Zara…"
          className="mt-1 h-8"
        />
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Study materials</span>
        <span className="text-xs text-muted-foreground">{documents.length} file{documents.length === 1 ? "" : "s"}</span>
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
          "flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-3 py-5 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
        )}
      >
        {uploading ? (
          <Loader2 className="size-5 animate-spin text-primary" />
        ) : (
          <Upload className="size-5 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">
          {uploading ? "Processing…" : "Drop notes or click to upload"}
        </span>
        <span className="text-[11px] text-muted-foreground">TXT · MD · PDF · DOCX</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </button>

      {documents.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {usingAll
            ? "Using all documents as context. Tap to focus on specific ones."
            : `Focusing on ${selectedDocIds.length} selected document${selectedDocIds.length === 1 ? "" : "s"}.`}
        </p>
      )}

      <ScrollArea className="-mx-1 flex-1 px-1">
        <div className="space-y-1.5">
          {documents.map((doc) => {
            const active = usingAll || selectedDocIds.includes(doc.id);
            return (
              <div
                key={doc.id}
                className={cn(
                  "group flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors",
                  active ? "border-primary/40 bg-primary/5" : "border-border opacity-60",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleDocSelection(doc.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  title={usingAll ? "Click to focus on this document" : "Toggle as context"}
                >
                  <FileText className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{doc.name}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {formatSize(doc.size)} · {doc.chunkCount} chunks
                    </span>
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100"
                  onClick={() => handleDelete(doc.id, doc.name)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
