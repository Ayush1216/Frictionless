export async function extractTextFromFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();

  // For text-based files
  if (
    file.type.startsWith('text/') ||
    file.name.endsWith('.csv') ||
    file.name.endsWith('.json')
  ) {
    return new TextDecoder().decode(buffer);
  }

  // For PDFs - try dynamic import
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: { str: string }) => item.str).join(' ') + '\n';
      }
      return text;
    } catch {
      return `[PDF file: ${file.name}, size: ${formatFileSize(file.size)}. PDF parsing library not available. Install pdfjs-dist for full support.]`;
    }
  }

  // For DOCX
  if (file.name.endsWith('.docx')) {
    try {
      // mammoth is an optional dependency - install for DOCX support
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      return result.value;
    } catch {
      return `[DOCX file: ${file.name}, size: ${formatFileSize(file.size)}. Install mammoth for full support.]`;
    }
  }

  // For Excel
  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer);
      return workbook.SheetNames.map((name: string) => {
        const sheet = workbook.Sheets[name];
        return XLSX.utils.sheet_to_csv(sheet);
      }).join('\n\n');
    } catch {
      return `[Excel file: ${file.name}, size: ${formatFileSize(file.size)}. Install xlsx for full support.]`;
    }
  }

  // For images
  if (file.type.startsWith('image/')) {
    return `[Image: ${file.name}, type: ${file.type}, size: ${formatFileSize(file.size)}]`;
  }

  // Fallback: try as text
  try {
    return new TextDecoder().decode(buffer);
  } catch {
    return `[Binary file: ${file.name}, size: ${formatFileSize(file.size)}]`;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}
