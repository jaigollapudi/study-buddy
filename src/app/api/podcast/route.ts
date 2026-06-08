import { getTextProvider } from "@/lib/ai";
import { prompts } from "@/lib/ai/prompts";
import { config } from "@/lib/config";
import {
  describeError,
  getContextBlock,
  jsonError,
  latestUserQuery,
  toolBodySchema,
} from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body;
  try {
    body = toolBodySchema.parse(await req.json());
  } catch {
    return jsonError("Invalid request body.");
  }

  try {
    const { block } = await getContextBlock(
      latestUserQuery(body.messages),
      body.subjectId,
    );
    const script = await getTextProvider().chat({
      system: prompts.podcast(block),
      messages: body.messages,
      temperature: 0.7,
    });

    return Response.json({
      script: script.trim(),
      // Tells the client whether to use the free browser voice or fetch audio.
      ttsProvider: config.tts.provider,
    });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}
