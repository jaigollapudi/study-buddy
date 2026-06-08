import { getTextProvider } from "@/lib/ai";
import { extractJson } from "@/lib/ai/json";
import { prompts } from "@/lib/ai/prompts";
import {
  chatBodySchema,
  describeError,
  getContextBlock,
  jsonError,
  latestUserQuery,
} from "@/lib/api";
import type { Flashcard } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body;
  try {
    body = chatBodySchema.parse(await req.json());
  } catch {
    return jsonError("Invalid request body.");
  }

  try {
    const { block } = await getContextBlock(
      latestUserQuery(body.messages),
      body.docIds,
    );
    const raw = await getTextProvider().chat({
      system: prompts.flashcards(block),
      messages: body.messages,
      temperature: 0.5,
    });

    const parsed = extractJson<{ cards: Flashcard[] }>(raw);
    const cards = (parsed.cards ?? [])
      .filter((c) => c.question && c.answer)
      .map((c) => ({ question: String(c.question), answer: String(c.answer) }));

    if (!cards.length) return jsonError("The model returned no flashcards. Try again.", 502);
    return Response.json({ cards });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}
