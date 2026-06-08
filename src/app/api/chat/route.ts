import { getTextProvider } from "@/lib/ai";
import { prompts } from "@/lib/ai/prompts";
import {
  chatBodySchema,
  describeError,
  getContextBlock,
  jsonError,
  latestUserQuery,
} from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body;
  try {
    body = chatBodySchema.parse(await req.json());
  } catch {
    return jsonError("Invalid request body.");
  }

  const query = latestUserQuery(body.messages);
  let block = "";
  try {
    ({ block } = await getContextBlock(query, body.docIds));
  } catch (err) {
    return jsonError(describeError(err), 502);
  }

  const provider = getTextProvider();
  const system = prompts.chat(block);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const delta of provider.chatStream({
          system,
          messages: body.messages,
          signal: req.signal,
        })) {
          controller.enqueue(encoder.encode(delta));
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\n[error] ${describeError(err)}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
