import { z } from "zod";
import { describeError, jsonError } from "@/lib/api";
import { deleteSession, renameSession } from "@/lib/db/sessions";

export const runtime = "nodejs";

const patchSchema = z.object({ title: z.string().min(1).max(120) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body;
  try {
    body = patchSchema.parse(await req.json());
  } catch {
    return jsonError("Invalid request body.");
  }
  try {
    await renameSession(id, body.title);
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteSession(id);
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}
