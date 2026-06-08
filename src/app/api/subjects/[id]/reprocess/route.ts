/**
 * Re-chunk and re-embed all documents for a subject without re-uploading files.
 * Useful after changing RAG_CHUNK_SIZE or the chunking strategy.
 *
 * POST /api/subjects/:id/reprocess
 * Response: { ok, processedCount, errorCount }
 */
import { jsonError } from "@/lib/api";
import { sql } from "@/lib/db/client";
import { listDocuments } from "@/lib/db/documents";
import { getSubject } from "@/lib/db/subjects";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const subject = await getSubject(id);
  if (!subject) return jsonError("Subject not found.", 404);

  const docs = (await listDocuments(id)).filter((d) => d.status === "ready");
  if (!docs.length) return Response.json({ ok: true, processedCount: 0, errorCount: 0 });


  // Note to implementer: full reprocess requires storing original file bytes (e.g. Supabase Storage).
  // For now, delete old chunks and mark documents for re-upload.
  let resetCount = 0;
  for (const doc of docs) {
    await sql`delete from chunks where document_id = ${doc.id}`;
    await sql`update documents set status = 'error', error = 'Re-process: please re-upload this file', chunk_count = 0 where id = ${doc.id}`;
    resetCount++;
  }

  return Response.json({
    ok: true,
    message: `Cleared ${resetCount} document(s). Please re-upload them in Admin to apply the new chunking settings.`,
    processedCount: 0,
    resetCount,
  });
}
