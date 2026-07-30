export type ReportFormat = "pdf" | "excel" | "word";

interface ExportReportOptions {
  title: string;
  fileName: string;
  headers: string[];
  rows: Array<Array<string | number | null | undefined>>;
  format: ReportFormat;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toCellText(value: string | number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

async function exportPdf(title: string, fileName: string, headers: string[], rows: ExportReportOptions["rows"]): Promise<void> {
  const [{ default: JsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new JsPDF({ orientation: rows.length && headers.length > 6 ? "landscape" : "portrait" });
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString("en-PH")}`, 14, 21);

  autoTable(doc, {
    startY: 26,
    head: [headers],
    body: rows.map((row) => row.map(toCellText)),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [98, 160, 234] },
    theme: "grid",
  });

  doc.save(`${fileName}.pdf`);
}

async function exportExcel(title: string, fileName: string, headers: string[], rows: ExportReportOptions["rows"]): Promise<void> {
  const XLSX = await import("xlsx");

  const sheetData = [headers, ...rows.map((row) => row.map(toCellText))];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  worksheet["!cols"] = headers.map((header, i) => ({
    wch: Math.max(header.length, ...rows.map((row) => toCellText(row[i]).length)) + 2,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, title.slice(0, 31) || "Report");

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${fileName}.xlsx`
  );
}

async function exportWord(title: string, fileName: string, headers: string[], rows: ExportReportOptions["rows"]): Promise<void> {
  const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, HeadingLevel } = await import("docx");

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (header) =>
        new TableCell({
          width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
          shading: { fill: "62A0EA" },
          children: [new Paragraph({ children: [new TextRun({ text: header, bold: true, color: "FFFFFF" })] })],
        })
    ),
  });

  const bodyRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
              children: [new Paragraph(toCellText(cell))],
            })
        ),
      })
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: `Generated ${new Date().toLocaleString("en-PH")}`, spacing: { after: 200 } }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...bodyRows] }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${fileName}.docx`);
}

/** Generates a genuine PDF (jsPDF), Excel (.xlsx via SheetJS), or Word (.docx via `docx`) file — not an HTML masquerade. */
export async function exportReport({ title, fileName, headers, rows, format }: ExportReportOptions): Promise<void> {
  if (format === "pdf") return exportPdf(title, fileName, headers, rows);
  if (format === "excel") return exportExcel(title, fileName, headers, rows);
  return exportWord(title, fileName, headers, rows);
}
