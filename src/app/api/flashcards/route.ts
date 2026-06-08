import { z } from "zod";
import { getTextProvider } from "@/lib/ai";
import { extractJson } from "@/lib/ai/json";
import { prompts } from "@/lib/ai/prompts";
import {
  describeError,
  getContextBlock,
  jsonError,
  latestUserQuery,
  toolBodySchema,
} from "@/lib/api";
import type { Flashcard } from "@/lib/types";

export const runtime = "nodejs";

const bodySchema = toolBodySchema.extend({
  excludeTopics: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  let body;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return jsonError("Invalid request body.");
  }

  try {
    const { block } = await getContextBlock(
      latestUserQuery(body.messages),
      body.subjectId,
    );
    const raw = await getTextProvider().chat({
      system: prompts.flashcards(block, 10, body.excludeTopics ?? []),
      messages: body.messages,
      temperature: 0.2,
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
