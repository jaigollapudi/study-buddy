import { describeError, jsonError } from "@/lib/api";
import { deleteArtifact } from "@/lib/db/artifacts";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteArtifact(id);
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}
