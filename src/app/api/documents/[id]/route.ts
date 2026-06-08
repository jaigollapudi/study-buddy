import { describeError, jsonError } from "@/lib/api";
import { deleteDocument } from "@/lib/db/documents";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return jsonError("Missing document id.");
  try {
    await deleteDocument(id);
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}
