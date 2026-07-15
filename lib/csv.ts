/**
 * Converts an array of flat objects to a CSV string and triggers a
 * browser download. No server round-trip needed — the data is already
 * loaded client-side on every page that uses this.
 */
export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) {
    alert('Nothing to export yet.');
    return;
  }

  const headers = Object.keys(rows[0]);

  function escapeCell(value: string | number): string {
    const str = String(value ?? '');
    // Quote any cell containing a comma, quote, or newline — and escape
    // internal quotes by doubling them, per standard CSV rules.
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(',')),
  ];

  // Leading BOM so Excel opens UTF-8 (₦, names with accents, etc.)
  // correctly instead of mangling it.
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}