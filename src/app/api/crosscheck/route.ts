import { getTextProvider } from "@/lib/ai";
import { extractJson } from "@/lib/ai/json";
import { prompts } from "@/lib/ai/prompts";
import {
  crosscheckBodySchema,
  describeError,
  getContextBlock,
  jsonError,
} from "@/lib/api";
import type { CrosscheckResult } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body;
  try {
    body = crosscheckBodySchema.parse(await req.json());
  } catch {
    return jsonError("Invalid request body.");
  }

  try {
    const { block } = await getContextBlock(body.question, body.docIds);
    const raw = await getTextProvider().chat({
      system: prompts.crosscheck(block),
      messages: [
        {
          role: "user",
          content: `QUESTION:\n${body.question}\n\nMY ANSWER:\n${body.answer}`,
        },
      ],
      temperature: 0.3,
    });

    const parsed = extractJson<CrosscheckResult>(raw);
    const validVerdicts = ["correct", "partially-correct", "incorrect"];
    const result: CrosscheckResult = {
      verdict: validVerdicts.includes(parsed.verdict)
        ? parsed.verdict
        : "partially-correct",
      feedback: String(parsed.feedback ?? "").trim(),
      correctAnswer: String(parsed.correctAnswer ?? "").trim(),
    };

    if (!result.feedback) return jsonError("The model returned no feedback. Try again.", 502);
    return Response.json(result);
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}
