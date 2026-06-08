import { z } from "zod";
import { describeError, jsonError } from "@/lib/api";
import { getTtsProvider } from "@/lib/tts";

export const runtime = "nodejs";

const bodySchema = z.object({ text: z.string().min(1).max(8000) });

export async function POST(req: Request) {
  let body;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return jsonError("Invalid request body.");
  }

  const provider = getTtsProvider();
  if (!provider) {
    // Browser mode: the client synthesises speech with the Web Speech API.
    return jsonError("Server TTS is disabled; use the browser voice.", 409);
  }

  try {
    const { audioBase64, mimeType } = await provider.synthesize(body.text);
    return Response.json({ audioBase64, mimeType });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}
