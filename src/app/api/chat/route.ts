import { z } from "zod";
import { getTextProvider } from "@/lib/ai";
import { prompts } from "@/lib/ai/prompts";
import { config } from "@/lib/config";
import {
  describeError,
  getContextBlock,
  jsonError,
  toCitations,
} from "@/lib/api";
import {
  addMessage,
  getSession,
  listMessages,
  maybeAutoTitle,
} from "@/lib/db/sessions";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().min(1),
});

export async function POST(req: Request) {
  let body;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return jsonError("Invalid request body.");
  }

  const session = await getSession(body.sessionId);
  if (!session) return jsonError("Chat session not found.", 404);

  const prior = await listMessages(body.sessionId);
  const history: ChatMessage[] = prior.map((m) => ({ role: m.role, content: m.content }));
  const limit = config.rag.chatHistoryLimit;
  const trimmed =
    limit > 0 && history.length > limit ? history.slice(-limit) : history;
  const messages: ChatMessage[] = [...trimmed, { role: "user", content: body.content }];

  await addMessage({ sessionId: body.sessionId, role: "user", content: body.content });
  await maybeAutoTitle(body.sessionId, body.content);

  let block = "";
  let citations: ReturnType<typeof toCitations> = [];
  let intent: "catalog" | "tutor" = "tutor";
  try {
    const ctx = await getContextBlock(body.content, session.subjectId);
    block = ctx.block;
    citations = toCitations(ctx.chunks);
    intent = ctx.intent;
  } catch (err) {
    return jsonError(describeError(err), 502);
  }

  const provider = getTextProvider();
  const system = prompts.chat(block, intent);
  const temperature = intent === "catalog" ? 0.2 : 0.5;

  const encoder = new TextEncoder();
  const line = (obj: unknown) => encoder.encode(JSON.stringify(obj) + "\n");

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(line({ type: "meta", citations }));
      let full = "";
      try {
        for await (const delta of provider.chatStream({
          system,
          messages,
          temperature,
          signal: req.signal,
        })) {
          full += delta;
          controller.enqueue(line({ type: "delta", text: delta }));
        }
        await addMessage({
          sessionId: body.sessionId,
          role: "assistant",
          content: full || "(no response)",
          citations: citations.length ? citations : null,
        });
        controller.enqueue(line({ type: "done" }));
      } catch (err) {
        if (full) {
          await addMessage({
            sessionId: body.sessionId,
            role: "assistant",
            content: full,
            citations: citations.length ? citations : null,
          });
        }
        controller.enqueue(line({ type: "error", message: describeError(err) }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
