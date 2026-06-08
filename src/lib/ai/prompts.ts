import { truncateForContext } from "@/lib/rag/format";
import type { QueryIntent } from "@/lib/rag/intent";
import type { RetrievedChunk } from "@/lib/types";

/**
 * Core persona + grounding rules shared across all prompt types.
 * Key behaviour: tiered confidence, no invention.
 */
const BASE = `You are Study Buddy, a patient and accurate AI tutor for school students.

GROUNDING RULES — follow these strictly:
1. CONTEXT FIRST: Base your answer on the CONTEXT passages provided below.
   Cite sources inline as (Source N) when you use them.
2. HONEST GAPS: If the context does not contain enough information, say so
   clearly: "The uploaded materials don't cover this in detail."
   Then, only if you are confident, add a brief note from general knowledge
   prefixed with "General knowledge (not from your textbook):".
3. NO INVENTION: Never fabricate facts, definitions, or page references.
4. STUDENT TONE: Use clear, simple language suitable for a Class 9 student.`;

/** Renders retrieved chunks into a context block for the system prompt. */
export function buildContextBlock(
  chunks: RetrievedChunk[],
  opts: { intent?: QueryIntent } = {},
): string {
  if (!chunks.length) {
    return "\n\nCONTEXT: No matching passages were found in the uploaded materials.";
  }

  const body = chunks
    .map((c, i) => {
      const loc = c.page
        ? `${c.documentName}, p.${c.page}`
        : c.documentName;
      const text = truncateForContext(c.content, 900);
      return `[Source ${i + 1} — ${loc}]\n${text}`;
    })
    .join("\n\n");

  const hint =
    opts.intent === "catalog"
      ? "\nNote: STRUCTURE question. Each Source is ONE uploaded chapter file. " +
        "The chapter title is the short heading at the START of each source " +
        "(usually page 1) — NOT sentences from the middle of the passage. " +
        "Ignore cross-references to other grades/subjects (e.g. 'Grade 7 Curiosity')."
      : "";

  return (
    `\n\nCONTEXT — ${chunks.length} passages retrieved from uploaded materials:` +
    hint +
    `\n--- START ---\n${body}\n--- END ---`
  );
}

export const prompts = {
  /**
   * Main chat prompt. Adaptive style:
   * - "catalog" queries (chapter list, topic coverage): answer completely in one reply.
   * - "tutor" queries (concept explanation): thorough, well-structured reply.
   */
  chat(context: string, intent: QueryIntent = "tutor") {
    const style =
      intent === "catalog"
        ? `The student wants a chapter/topic list from their textbook materials.

Rules:
- Read EVERY source — each source is one chapter PDF.
- For each source, extract the chapter TITLE from the first heading line only
  (e.g. "Exploration: Entering the World of Secondary Science"), not body text.
- Number the list in chapter order (Source order).
- Do NOT use filenames (iesc101, iesc102) as titles.
- Do NOT paste opening paragraph sentences as titles.
- Do NOT list cross-references to other books found inside the text.
- ONE numbered list only. No duplicates. No second list.`
        : `Give a clear, complete answer. Use the context passages to answer accurately.
Structure your reply with short paragraphs or bullet points as appropriate.
Avoid vague statements. If the question has multiple parts, address each one.`;

    return `${BASE}${context}

${style}
Use light Markdown for readability.`;
  },

  podcast(context: string) {
    return `${BASE}${context}

Write a short, friendly podcast-style monologue in English that summarises and
teaches the key ideas from the context. Write ONLY natural spoken words ready
for text-to-speech: no markdown, no symbols, no stage directions, no headings.
Use short, clear sentences and a warm, conversational tone.`;
  },

  flashcards(context: string, count = 10, excludeTopics: string[] = []) {
    const exclusion =
      excludeTopics.length
        ? `\nDo NOT repeat or closely paraphrase any of these already-covered questions:\n${excludeTopics.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
        : "";
    return `${BASE}${context}

Generate EXACTLY ${count} study flashcards from the context passages above.
IMPORTANT: Output ONLY raw JSON — no prose, no markdown fences, no explanation before or after.
Output format (strict):
{"cards":[{"question":"short question","answer":"concise answer"}]}
Rules:
- Every card must be directly answerable from the passages.
- Keep answers under 60 words. Use plain text only — no markdown, no quotes inside the answer.
- Focus on definitions, facts, processes, and key examples.
- Do NOT generate generic questions like "What is this chapter about?"${exclusion}`;
  },

  quiz(context: string, count = 10, excludeTopics: string[] = []) {
    const exclusion =
      excludeTopics.length
        ? `\nDo NOT repeat or closely paraphrase any of these already-covered questions:\n${excludeTopics.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
        : "";
    return `${BASE}${context}

Generate EXACTLY ${count} multiple-choice questions from the context passages above.
IMPORTANT: Output ONLY raw JSON — no prose, no markdown fences, no explanation before or after.
Output format (strict):
{"questions":[{"question":"...","options":["opt1","opt2","opt3","opt4"],"answerIndex":0,"explanation":"..."}]}
Rules:
- Exactly 4 options per question. answerIndex is 0-based.
- Every question must be grounded in the passages.
- Keep option text under 20 words each. Plain text only — no markdown inside strings.
- explanation must be one sentence citing the source.${exclusion}`;
  },

} as const;
