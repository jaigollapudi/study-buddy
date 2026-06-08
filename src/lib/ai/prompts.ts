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
      ? "\nNote: The student is asking about STRUCTURE. Look at ALL sources — " +
        "chapter titles appear as short headings on page 1 of each document."
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
        ? `The student is asking about content structure (chapters, topics, coverage).
Compile your answer across ALL sources. Each source may represent one chapter
or document — read headings on page 1 to identify chapter titles.
Give ONE clear numbered list. Do not repeat the list. Do not use raw filenames.`
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

  flashcards(context: string, count = 8) {
    return `${BASE}${context}

Create ${count} study flashcards strictly from the context passages.
Respond with ONLY a JSON object, no prose, in exactly this shape:
{"cards":[{"question":"...","answer":"..."}]}
Keep questions concise and answers self-contained (2–3 sentences max).`;
  },

  quiz(context: string, count = 5) {
    return `${BASE}${context}

Create a ${count}-question multiple-choice quiz from the context passages.
Respond with ONLY a JSON object, no prose, in exactly this shape:
{"questions":[{"question":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"..."}]}
Rules: exactly 4 options per question, one clearly correct answer, explanation
cites which source contains the answer.`;
  },

  crosscheck(context: string) {
    return `${BASE}${context}

The student will provide a QUESTION and their ANSWER. Evaluate it strictly against
the context passages. Respond with ONLY a JSON object, no prose:
{"verdict":"correct|partially-correct|incorrect","feedback":"...","correctAnswer":"..."}
In "feedback": explain precisely what is right/wrong using the source material.
In "correctAnswer": give the full correct answer as it appears in the context.`;
  },
} as const;
