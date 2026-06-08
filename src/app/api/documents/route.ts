import { config } from "@/lib/config";
import { describeError, jsonError } from "@/lib/api";
import { ingestDocument, listDocuments } from "@/lib/rag";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json({ documents: await listDocuments() });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Expected multipart form data.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("No file provided.");
  }
  if (file.size === 0) {
    return jsonError("File is empty.");
  }
  if (file.size > config.rag.maxUploadBytes) {
    const mb = (config.rag.maxUploadBytes / (1024 * 1024)).toFixed(0);
    return jsonError(`File too large. Max ${mb}MB.`, 413);
  }

  try {
    const bytes = await file.arrayBuffer();
    const doc = await ingestDocument(file.name, bytes);
    return Response.json({ document: doc }, { status: 201 });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}
