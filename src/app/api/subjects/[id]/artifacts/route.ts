import { z } from "zod";
import { describeError, jsonError } from "@/lib/api";
import { createArtifact, listArtifacts } from "@/lib/db/artifacts";
import { getSubject } from "@/lib/db/subjects";

export const runtime = "nodejs";

const artifactSchema = z.object({
  mode: z.enum(["flashcards", "quiz", "podcast"]),
  title: z.string().min(1).max(140),
  topic: z.string().max(300).nullable().optional(),
  payload: z.unknown(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return Response.json({ artifacts: await listArtifacts(id) });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body;
  try {
    body = artifactSchema.parse(await req.json());
  } catch {
    return jsonError("Invalid artifact body.");
  }

  try {
    const subject = await getSubject(id);
    if (!subject) return jsonError("Subject not found.", 404);
    const artifact = await createArtifact({
      subjectId: id,
      mode: body.mode,
      title: body.title,
      topic: body.topic ?? null,
      payload: body.payload,
    });
    return Response.json({ artifact }, { status: 201 });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}
