// ============================================================
// EDUMO — Excel Sanitizer
// Defense against spreadsheet formula injection on import AND export
// ============================================================

/**
 * Characters that can trigger formula execution in Excel.
 * Cells starting with these are neutralised by prepending a single quote.
 */
const FORMULA_TRIGGER_CHARS = ['=', '+', '-', '@', '\t', '\r', '\n'];

/**
 * Sanitise a cell value for safe Excel export.
 * Neutralises formula injection by prepending a single quote to dangerous values.
 */
export function sanitizeCellForExport(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (value.length === 0) return value;

  const firstChar = value.charAt(0);
  if (FORMULA_TRIGGER_CHARS.includes(firstChar)) {
    // Prepend single quote — Excel will display it as text
    return `'${value}`;
  }

  return value;
}

/**
 * Sanitise a cell value from an imported spreadsheet.
 * Strips potential formula injection characters.
 */
export function sanitizeCellFromImport(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (value.length === 0) return value;

  let cleaned = value;

  // Remove leading formula trigger characters
  while (
    cleaned.length > 0 &&
    FORMULA_TRIGGER_CHARS.includes(cleaned.charAt(0))
  ) {
    cleaned = cleaned.substring(1);
  }

  // Remove leading single quote (used as escape in Excel)
  if (cleaned.startsWith("'")) {
    cleaned = cleaned.substring(1);
  }

  return cleaned.trim();
}

/**
 * Sanitise an entire row object from import.
 */
export function sanitizeImportRow(
  row: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    sanitized[key] = sanitizeCellFromImport(value);
  }
  return sanitized;
}

/**
 * Sanitise rich text / HTML content to prevent XSS.
 * Strips dangerous tags and attributes.
 */
export function sanitizeRichText(html: string): string {
  if (!html) return '';

  // Remove script tags and their contents
  let clean = html.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ''
  );

  // Remove event handlers
  clean = clean.replace(/\bon\w+\s*=\s*(['"])[^'"]*\1/gi, '');
  clean = clean.replace(/\bon\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: URLs
  clean = clean.replace(/javascript\s*:/gi, '');

  // Remove data: URLs (potential XSS vector)
  clean = clean.replace(/data\s*:[^;]*;base64/gi, '');

  // Remove iframe, object, embed, applet tags
  clean = clean.replace(
    /<(iframe|object|embed|applet|form|input)\b[^>]*>/gi,
    ''
  );
  clean = clean.replace(/<\/(iframe|object|embed|applet|form|input)>/gi, '');

  return clean;
}
