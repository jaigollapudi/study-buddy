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
import type { QuizQuestion } from "@/lib/types";

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
    const raw = await getTextProvider().chat({
      system: prompts.quiz(block),
      messages: body.messages,
      temperature: 0.5,
    });

    const parsed = extractJson<{ questions: QuizQuestion[] }>(raw);
    const questions = (parsed.questions ?? [])
      .filter((q) => q.question && Array.isArray(q.options) && q.options.length >= 2)
      .map((q) => {
        const options = q.options.map(String);
        const answerIndex = Math.min(
          Math.max(Number(q.answerIndex) || 0, 0),
          options.length - 1,
        );
        return {
          question: String(q.question),
          options,
          answerIndex,
          explanation: q.explanation ? String(q.explanation) : undefined,
        };
      });

    if (!questions.length) return jsonError("The model returned no quiz questions. Try again.", 502);
    return Response.json({ questions });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}
