/**
 * Shared CSV helpers used by both server-side exports (the employees API route)
 * and client-side chart exports. Kept free of `server-only` so either runtime
 * can import it; the browser-only `downloadCsv` touches `document`/`Blob` inside
 * its body, so importing this module on the server is safe as long as that
 * function isn't called there.
 */

/** Escape one CSV field per RFC 4180 — quote when it holds a comma, quote, or newline. */
export function escapeCsvField(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Serialize a 2D array of cells to an RFC-4180 CSV string. Uses CRLF line
 * endings for maximum spreadsheet compatibility. The first row is conventionally
 * the header.
 */
export function rowsToCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
}

/** Trigger a browser download of `content` as a file. Client-only. */
export function downloadFile(
  filename: string,
  content: BlobPart,
  mimeType = "text/plain;charset=utf-8;",
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Build a CSV from `rows` (first row = header) and download it. Client-only. */
export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const name = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  downloadFile(name, rowsToCsv(rows), "text/csv;charset=utf-8;");
}
