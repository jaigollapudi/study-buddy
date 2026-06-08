import { config } from "@/lib/config";
import type { ChatMessage } from "@/lib/types";
import type { ChatOptions, HealthStatus, TextProvider } from "./provider";

interface OllamaChatChunk {
  message?: { role: string; content: string };
  done?: boolean;
  error?: string;
}

function toOllamaMessages(system: string | undefined, messages: ChatMessage[]) {
  const out: { role: string; content: string }[] = [];
  if (system && system.trim()) out.push({ role: "system", content: system });
  for (const m of messages) {
    out.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
  }
  return out;
}

/**
 * Local Ollama provider. Talks to the native REST API so we keep full control
 * of streaming and avoid heavy SDK dependencies. Runs entirely offline + free.
 */
export class OllamaProvider implements TextProvider {
  readonly name = "ollama";
  private readonly baseUrl: string;
  private readonly chatModel: string;
  private readonly embedModel: string;

  constructor() {
    this.baseUrl = config.ollama.baseUrl.replace(/\/$/, "");
    this.chatModel = config.ollama.chatModel;
    this.embedModel = config.ollama.embedModel;
  }

  async *chatStream(opts: ChatOptions): AsyncIterable<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: opts.model || this.chatModel,
        messages: toOllamaMessages(opts.system, opts.messages),
        stream: true,
        options: { temperature: opts.temperature ?? 0.6 },
      }),
      signal: opts.signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(await this.describeError(res));
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl: number;
      // Ollama streams newline-delimited JSON objects.
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        const chunk = JSON.parse(line) as OllamaChatChunk;
        if (chunk.error) throw new Error(chunk.error);
        if (chunk.message?.content) yield chunk.message.content;
      }
    }

    const tail = buffer.trim();
    if (tail) {
      const chunk = JSON.parse(tail) as OllamaChatChunk;
      if (chunk.message?.content) yield chunk.message.content;
    }
  }

  async chat(opts: ChatOptions): Promise<string> {
    let full = "";
    for await (const delta of this.chatStream(opts)) full += delta;
    return full;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await fetch(`${this.baseUrl}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.embedModel, input: texts }),
    });
    if (!res.ok) throw new Error(await this.describeError(res));
    const data = (await res.json()) as { embeddings?: number[][] };
    if (!data.embeddings || data.embeddings.length !== texts.length) {
      throw new Error("Ollama returned an unexpected embedding response.");
    }
    return data.embeddings;
  }

  async health(): Promise<HealthStatus> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) {
        return { ok: false, provider: this.name, baseUrl: this.baseUrl, error: `HTTP ${res.status}` };
      }
      const data = (await res.json()) as { models?: { name: string }[] };
      return {
        ok: true,
        provider: this.name,
        baseUrl: this.baseUrl,
        models: (data.models ?? []).map((m) => m.name),
      };
    } catch (err) {
      return {
        ok: false,
        provider: this.name,
        baseUrl: this.baseUrl,
        error: err instanceof Error ? err.message : "Cannot reach Ollama.",
      };
    }
  }

  private async describeError(res: Response): Promise<string> {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    if (res.status === 404) {
      return `Model not found. Pull it first: \`ollama pull ${this.chatModel}\`. ${detail}`.trim();
    }
    return `Ollama request failed (HTTP ${res.status}). ${detail}`.trim();
  }
}
