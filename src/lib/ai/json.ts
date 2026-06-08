/**
 * Best-effort extraction of a JSON value from a model's text output.
 * Local models often wrap JSON in prose or ```json fences, so we strip those
 * and fall back to locating the first balanced object/array.
 */
export function extractJson<T>(text: string): T {
  const cleaned = text
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    /* fall through to bracket scan */
  }

  const start = cleaned.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in model output.");

  const open = cleaned[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        const slice = cleaned.slice(start, i + 1);
        return JSON.parse(slice) as T;
      }
    }
  }

  throw new Error("Could not parse JSON from model output.");
}
