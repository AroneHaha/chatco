export type ReportFormat = "pdf" | "excel" | "word";

interface ExportReportOptions {
  title: string;
  fileName: string;
  headers: string[];
  rows: Array<Array<string | number | null | undefined>>;
  format: ReportFormat;
}

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function reportHtml(title: string, headers: string[], rows: ExportReportOptions["rows"]): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
  <style>body{font:12px Arial,sans-serif;color:#111;padding:24px}h1{font-size:20px;margin:0 0 6px}
  p{color:#555;margin:0 0 18px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:6px;text-align:left}
  th{background:#eaf2fb}@media print{body{padding:0}@page{size:landscape;margin:12mm}}</style></head><body>
  <h1>${escapeHtml(title)}</h1><p>Generated ${escapeHtml(new Date().toLocaleString("en-PH"))}</p>
  <table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
  <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>
  </body></html>`;
}

export function exportReport({ title, fileName, headers, rows, format }: ExportReportOptions): void {
  const html = reportHtml(title, headers, rows);

  if (format === "pdf") {
    const printWindow = window.open("", "_blank");
    if (!printWindow) throw new Error("Allow pop-ups to export this report as PDF.");
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.addEventListener("load", () => {
      printWindow.focus();
      printWindow.print();
    });
    return;
  }

  const isExcel = format === "excel";
  const blob = new Blob(["\uFEFF", html], {
    type: isExcel ? "application/vnd.ms-excel" : "application/msword",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.${isExcel ? "xls" : "doc"}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
