import { describeError, jsonError } from "@/lib/api";
import { listMessages } from "@/lib/db/sessions";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return Response.json({ messages: await listMessages(id) });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}
