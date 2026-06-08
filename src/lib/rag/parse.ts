import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export interface ParsedDocument {
  text: string;
  type: string;
}

function ext(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

/**
 * Extract plain text from an uploaded file. Supports txt, md, pdf and docx.
 * Throws a friendly error for unsupported types.
 */
export async function parseDocument(
  filename: string,
  bytes: ArrayBuffer,
): Promise<ParsedDocument> {
  const type = ext(filename);

  switch (type) {
    case "txt":
    case "md":
    case "markdown":
    case "text": {
      return { text: new TextDecoder().decode(bytes), type };
    }
    case "pdf": {
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const { text } = await extractText(pdf, { mergePages: true });
      return { text: Array.isArray(text) ? text.join("\n") : text, type };
    }
    case "docx": {
      const result = await mammoth.extractRawText({
        buffer: Buffer.from(bytes),
      });
      return { text: result.value, type };
    }
    default:
      throw new Error(
        `Unsupported file type ".${type}". Upload a .txt, .md, .pdf or .docx file.`,
      );
  }
}
