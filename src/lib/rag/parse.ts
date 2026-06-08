import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export interface ParsedPage {
  /** 1-based page number (null for non-paged formats). */
  page: number | null;
  text: string;
}

export interface ParsedDocument {
  pages: ParsedPage[];
  type: string;
  pageCount: number | null;
}

function ext(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

/**
 * Extract text from an uploaded file, preserving page boundaries for PDFs so we
 * can cite page numbers. Supports txt, md, pdf, docx.
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
    case "text":
      return {
        pages: [{ page: null, text: new TextDecoder().decode(bytes) }],
        type,
        pageCount: null,
      };

    case "pdf": {
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const { totalPages, text } = await extractText(pdf, { mergePages: false });
      const pageTexts = Array.isArray(text) ? text : [text];
      return {
        pages: pageTexts.map((t, i) => ({ page: i + 1, text: t ?? "" })),
        type,
        pageCount: totalPages,
      };
    }

    case "docx": {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      return { pages: [{ page: null, text: result.value }], type, pageCount: null };
    }

    default:
      throw new Error(
        `Unsupported file type ".${type}". Upload a .txt, .md, .pdf or .docx file.`,
      );
  }
}
