/**
 * Type declarations for optional AI file-parsing dependencies.
 * Install these packages for full support:
 * - pdfjs-dist: PDF extraction
 * - mammoth: DOCX extraction
 * - xlsx: Excel extraction
 */

declare module 'pdfjs-dist' {
  export function getDocument(params: { data: ArrayBuffer }): {
    promise: Promise<{
      numPages: number;
      getPage: (num: number) => Promise<{
        getTextContent: () => Promise<{
          items: Array<{ str: string }>;
        }>;
      }>;
    }>;
  };
}

declare module 'mammoth' {
  export function extractRawText(options: {
    arrayBuffer: ArrayBuffer;
  }): Promise<{ value: string }>;
}

declare module 'xlsx' {
  export function read(data: ArrayBuffer): {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  };
  export const utils: {
    sheet_to_csv: (sheet: unknown) => string;
  };
}
