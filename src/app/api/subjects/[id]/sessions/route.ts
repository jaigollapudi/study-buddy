import { describeError, jsonError } from "@/lib/api";
import { createSession, listSessions } from "@/lib/db/sessions";
import { getSubject } from "@/lib/db/subjects";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return Response.json({ sessions: await listSessions(id) });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const subject = await getSubject(id);
    if (!subject) return jsonError("Subject not found.", 404);
    const session = await createSession({ subjectId: id });
    return Response.json({ session }, { status: 201 });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}
