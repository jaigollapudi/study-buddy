import { z } from "zod";
import { describeError, jsonError } from "@/lib/api";
import { createSubject, listSubjects } from "@/lib/db/subjects";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const all = new URL(req.url).searchParams.get("all") === "1";
  try {
    return Response.json({ subjects: await listSubjects({ onlyAllowed: !all }) });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  color: z.string().max(20).optional(),
  grade: z.string().max(40).nullable().optional(),
  board: z.string().max(40).nullable().optional(),
});

export async function POST(req: Request) {
  let body;
  try {
    body = createSchema.parse(await req.json());
  } catch {
    return jsonError("Invalid request body.");
  }
  try {
    return Response.json({ subject: await createSubject(body) }, { status: 201 });
  } catch (err) {
    return jsonError(describeError(err), 502);
  }
}
