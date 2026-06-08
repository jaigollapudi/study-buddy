"use client";

import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchHealth, type HealthResponse } from "@/lib/client";
import { cn } from "@/lib/utils";

export function SetupBanner() {
  const [status, setStatus] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await fetchHealth());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check();
  }, [check]);

  const ready = status?.ok && status.chatReady && status.embedReady;

  if (loading && !status) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Checking local AI…
      </div>
    );
  }

  if (ready) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-3.5" />
        <span>Local AI ready · {status?.expected.chatModel}</span>
        <Button variant="ghost" size="icon" className="ml-auto size-6" onClick={check}>
          <RefreshCw className="size-3" />
        </Button>
      </div>
    );
  }

  const missing: string[] = [];
  if (status && !status.chatReady) missing.push(status.expected.chatModel);
  if (status && !status.embedReady) missing.push(status.expected.embedModel);

  return (
    <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs">
      <div className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400">
        <AlertTriangle className="size-3.5" />
        {status?.ok ? "Models not installed" : "Ollama not reachable"}
        <Button variant="ghost" size="icon" className={cn("ml-auto size-6")} onClick={check}>
          <RefreshCw className={cn("size-3", loading && "animate-spin")} />
        </Button>
      </div>
      <div className="space-y-1.5 text-muted-foreground">
        {!status?.ok ? (
          <>
            <p>Start the local model server, then refresh:</p>
            <pre className="rounded bg-background/60 p-2 font-mono text-[11px]">ollama serve</pre>
            <p className="text-[11px]">
              Don&apos;t have it? Install from{" "}
              <a className="text-primary underline" href="https://ollama.com/download" target="_blank" rel="noreferrer">
                ollama.com
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <p>Pull the required model{missing.length > 1 ? "s" : ""}:</p>
            <pre className="rounded bg-background/60 p-2 font-mono text-[11px]">
              {missing.map((m) => `ollama pull ${m}`).join("\n")}
            </pre>
          </>
        )}
      </div>
    </div>
  );
}
