/**
 * Best-effort extraction of a JSON value from a model's text output.
 * Local models often wrap JSON in prose or ```json fences, and may produce
 * trailing commas, unescaped special characters, or truncated output.
 * This extractor strips fences, repairs common issues, then falls back to a
 * balanced-bracket scan.
 */
export function extractJson<T>(text: string): T {
  const cleaned = text
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();

  const repaired = repairJson(cleaned);

  // Fast path: the whole response is valid JSON after cleanup.
  try {
    return JSON.parse(repaired) as T;
  } catch {
    /* fall through to bracket scan */
  }

  // Locate the first { or [ and find its matching close bracket.
  const start = repaired.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in model output.");

  const open = repaired[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (let i = start; i < repaired.length; i++) {
    const ch = repaired[i];
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) {
    // Model may have been cut off mid-JSON — try closing open structures.
    const partial = repaired.slice(start);
    const recovered = closeJson(partial);
    try {
      return JSON.parse(repairJson(recovered)) as T;
    } catch {
      throw new Error("Could not parse JSON from model output.");
    }
  }

  const slice = repaired.slice(start, end + 1);
  try {
    return JSON.parse(slice) as T;
  } catch {
    // Last-ditch: repair the extracted slice too.
    return JSON.parse(repairJson(slice)) as T;
  }
}

/** Fix common JSON issues produced by local LLMs. */
function repairJson(s: string): string {
  let r = s;
  // Remove trailing commas before } or ]
  r = r.replace(/,(\s*[}\]])/g, "$1");
  // Replace unescaped control characters inside strings with a space.
  // This regex replaces literal newlines/tabs inside JSON string values.
  r = r.replace(/"((?:[^"\\]|\\.)*)"/g, (_match, inner: string) => {
    const fixed = inner
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
    return `"${fixed}"`;
  });
  return r;
}

/** Attempt to close an incomplete JSON string produced by a truncated model. */
function closeJson(partial: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (const ch of partial) {
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  return partial + (inString ? '"' : "") + stack.reverse().join("");
}
