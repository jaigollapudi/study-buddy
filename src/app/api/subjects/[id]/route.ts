import { z } from "zod";
import { describeError, jsonError } from "@/lib/api";
import { deleteSubject, getSubject, updateSubject } from "@/lib/db/subjects";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  color: z.string().max(20).optional(),
  grade: z.string().max(40).nullable().optional(),
  board: z.string().max(40).nullable().optional(),
  isAllowed: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const subject = await getSubject(id);
    if (!subject) return jsonError("Subject not found.", 404);
    return Response.json({ subject });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body;
  try {
    body = patchSchema.parse(await req.json());
  } catch {
    return jsonError("Invalid request body.");
  }
  try {
    const subject = await updateSubject(id, body);
    if (!subject) return jsonError("Subject not found.", 404);
    return Response.json({ subject });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteSubject(id);
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}
