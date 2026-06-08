import { config } from "@/lib/config";

/**
 * Split text into overlapping chunks. We try to break on paragraph and
 * sentence boundaries so chunks stay semantically coherent, then fall back to
 * hard character splits for very long runs.
 */
export function chunkText(
  raw: string,
  size = config.rag.chunkSize,
  overlap = config.rag.chunkOverlap,
): string[] {
  const text = raw.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return [];
  if (text.length <= size) return [text];

  // Prefer paragraph boundaries, then sentences, then whitespace.
  const segments = text.split(/\n\n+/);
  const pieces: string[] = [];
  for (const seg of segments) {
    if (seg.length <= size) {
      pieces.push(seg);
    } else {
      const sentences = seg.match(/[^.!?\n]+[.!?]?\s*/g) ?? [seg];
      let buf = "";
      for (const s of sentences) {
        if ((buf + s).length > size && buf) {
          pieces.push(buf.trim());
          buf = "";
        }
        buf += s;
        while (buf.length > size) {
          pieces.push(buf.slice(0, size).trim());
          buf = buf.slice(size);
        }
      }
      if (buf.trim()) pieces.push(buf.trim());
    }
  }

  // Merge small pieces up to `size` and add overlap between final chunks.
  const merged: string[] = [];
  let current = "";
  for (const p of pieces) {
    if ((current + "\n\n" + p).trim().length > size && current) {
      merged.push(current.trim());
      const tail = overlap > 0 ? current.slice(-overlap) : "";
      current = tail ? tail + "\n\n" + p : p;
    } else {
      current = current ? current + "\n\n" + p : p;
    }
  }
  if (current.trim()) merged.push(current.trim());

  return merged.filter(Boolean);
}
