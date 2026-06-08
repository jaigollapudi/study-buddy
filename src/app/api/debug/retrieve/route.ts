/**
 * Retrieval debugger — POST a question and get back every retrieved chunk with
 * scores so you can audit whether the answer exists in what was sent to the LLM.
 *
 * POST /api/debug/retrieve
 * { "query": "what is osmosis?", "subjectId": "<uuid>", "topK": 20 }
 */
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { retrieveContext } from "@/lib/rag";
import { getLastRetrievalDebug } from "@/lib/rag/retrieve";

export const runtime = "nodejs";

const bodySchema = z.object({
  query: z.string().min(1),
  subjectId: z.string().uuid().optional().nullable(),
  topK: z.number().int().min(1).max(50).optional(),
});

export async function POST(req: Request) {
  let body;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return jsonError("body must be { query, subjectId?, topK? }");
  }

  try {
    const chunks = await retrieveContext(body.query, {
      subjectId: body.subjectId ?? null,
      topK: body.topK,
    });
    const debug = getLastRetrievalDebug();

    return Response.json({
      query: body.query,
      strategy: debug?.strategy ?? "unknown",
      breadth: debug?.breadth ?? "unknown",
      finalCount: chunks.length,
      minScore: chunks.length ? Math.min(...chunks.map((c) => c.score)) : null,
      maxScore: chunks.length ? Math.max(...chunks.map((c) => c.score)) : null,
      chunks: chunks.map((c, i) => ({
        rank: i + 1,
        id: c.id,
        documentName: c.documentName,
        page: c.page,
        score: Math.round(c.score * 10000) / 10000,
        // Full content so you can manually verify the answer is in here.
        content: c.content,
      })),
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Retrieval failed.", 502);
  }
}
