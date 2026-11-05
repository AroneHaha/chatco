export type ReportFormat = "pdf" | "excel" | "word";

type Cell = string | number | null | undefined;

interface ExportReportOptions {
  title: string;
  fileName: string;
  headers: string[];
  rows: Array<Array<Cell>>;
  format: ReportFormat;
}

/** A PNG made in the browser (e.g. a chart drawn on a canvas). */
export interface ExportImage {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * One block of a multi-section export. A chart is an image in PDF and Word;
 * SheetJS cannot write images, so Excel gets the chart's numbers (`fallback`).
 */
export type ExportSection =
  | { kind: "table"; title: string; headers: string[]; rows: Array<Array<Cell>> }
  | { kind: "chart"; title: string; image: ExportImage; fallback: { headers: string[]; rows: Array<Array<Cell>> } };

interface ExportSectionsOptions {
  title: string;
  /** Shown under the title, e.g. the date range. */
  subtitle?: string;
  fileName: string;
  format: ReportFormat;
  sections: ExportSection[];
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

function toCellText(value: Cell): string {
  return value === null || value === undefined ? "" : String(value);
}

const generatedLine = () => `Generated ${new Date().toLocaleString("en-PH")}`;

async function loadPdf() {
  const [{ default: JsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return { JsPDF, autoTable: autoTableModule.default };
}

const PDF_TABLE_STYLE = {
  styles: { fontSize: 8, cellPadding: 3 },
  headStyles: { fillColor: [98, 160, 234] as [number, number, number] },
  theme: "grid" as const,
};

async function exportPdf(title: string, fileName: string, headers: string[], rows: ExportReportOptions["rows"]): Promise<void> {
  const { JsPDF, autoTable } = await loadPdf();

  const doc = new JsPDF({ orientation: rows.length && headers.length > 6 ? "landscape" : "portrait" });
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(generatedLine(), 14, 21);

  autoTable(doc, {
    startY: 26,
    head: [headers],
    body: rows.map((row) => row.map(toCellText)),
    ...PDF_TABLE_STYLE,
  });

  doc.save(`${fileName}.pdf`);
}

/** A worksheet with columns sized to their longest value. */
async function buildSheet(headers: string[], rows: ExportReportOptions["rows"]) {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows.map((row) => row.map(toCellText))]);
  worksheet["!cols"] = headers.map((header, i) => ({
    wch: Math.max(header.length, ...rows.map((row) => toCellText(row[i]).length)) + 2,
  }));
  return worksheet;
}

/** Excel sheet names: at most 31 characters, none of : \ / ? * [ ]. */
const sheetName = (title: string) => title.replace(/[:\\/?*[\]]/g, " ").slice(0, 31).trim() || "Report";

async function downloadWorkbook(sheets: { name: string; worksheet: Awaited<ReturnType<typeof buildSheet>> }[], fileName: string) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const used = new Set<string>();
  for (const { name, worksheet } of sheets) {
    let unique = name;
    for (let n = 2; used.has(unique); n++) unique = `${name.slice(0, 28)} ${n}`;
    used.add(unique);
    XLSX.utils.book_append_sheet(workbook, worksheet, unique);
  }
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${fileName}.xlsx`
  );
}

async function exportExcel(title: string, fileName: string, headers: string[], rows: ExportReportOptions["rows"]): Promise<void> {
  await downloadWorkbook([{ name: sheetName(title), worksheet: await buildSheet(headers, rows) }], fileName);
}

async function wordTable(headers: string[], rows: ExportReportOptions["rows"]) {
  const { Paragraph, Table, TableCell, TableRow, TextRun, WidthType } = await import("docx");

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

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...bodyRows] });
}

async function exportWord(title: string, fileName: string, headers: string[], rows: ExportReportOptions["rows"]): Promise<void> {
  const { Document, Packer, Paragraph, HeadingLevel } = await import("docx");

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: generatedLine(), spacing: { after: 200 } }),
          await wordTable(headers, rows),
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

// ─── Multi-section export (e.g. the Analytics Overview) ───────────────

async function exportSectionsPdf({ title, subtitle, fileName, sections }: ExportSectionsOptions): Promise<void> {
  const { JsPDF, autoTable } = await loadPdf();
  const doc = new JsPDF({ orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  doc.setFontSize(14);
  doc.text(title, margin, 15);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text([subtitle, generatedLine()].filter(Boolean).join("  ·  "), margin, 21);

  let y = 32;
  const sectionTitle = (text: string, blockHeight: number) => {
    // Keep a heading with (at least the start of) what follows it.
    if (y + 8 + Math.min(blockHeight, 30) > pageHeight - margin) {
      doc.addPage();
      y = margin + 4;
    }
    doc.setFontSize(11);
    doc.setTextColor(20);
    doc.text(text, margin, y);
    y += 4;
  };

  for (const section of sections) {
    if (section.kind === "table") {
      sectionTitle(section.title, 30);
      autoTable(doc, {
        startY: y,
        head: [section.headers],
        body: section.rows.map((row) => row.map(toCellText)),
        margin: { left: margin, right: margin },
        ...PDF_TABLE_STYLE,
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    } else {
      const width = pageWidth - margin * 2;
      const height = (width * section.image.height) / section.image.width;
      sectionTitle(section.title, height);
      if (y + height > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.addImage(section.image.dataUrl, "PNG", margin, y, width, height);
      y += height + 10;
    }
  }

  doc.save(`${fileName}.pdf`);
}

async function exportSectionsExcel({ fileName, sections }: ExportSectionsOptions): Promise<void> {
  const sheets = await Promise.all(sections.map(async (section) => {
    const table = section.kind === "table" ? section : section.fallback;
    return { name: sheetName(section.title), worksheet: await buildSheet(table.headers, table.rows) };
  }));
  await downloadWorkbook(sheets, fileName);
}

function dataUrlBytes(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function exportSectionsWord({ title, subtitle, fileName, sections }: ExportSectionsOptions): Promise<void> {
  const { Document, Packer, Paragraph, HeadingLevel, ImageRun } = await import("docx");
  const children: Array<InstanceType<typeof Paragraph> | Awaited<ReturnType<typeof wordTable>>> = [
    new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: [subtitle, generatedLine()].filter(Boolean).join("  ·  "), spacing: { after: 200 } }),
  ];

  for (const section of sections) {
    children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } }));
    if (section.kind === "table") {
      children.push(await wordTable(section.headers, section.rows));
    } else {
      // ~6 inches wide (96 px per inch), keeping the chart's aspect ratio.
      const width = 576;
      children.push(new Paragraph({
        children: [new ImageRun({
          type: "png",
          data: dataUrlBytes(section.image.dataUrl),
          transformation: { width, height: Math.round((width * section.image.height) / section.image.width) },
        })],
      }));
    }
  }

  const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
  downloadBlob(blob, `${fileName}.docx`);
}

/** Several titled tables (and charts) in one PDF, Excel workbook (one sheet each) or Word file. */
export async function exportSections(options: ExportSectionsOptions): Promise<void> {
  if (options.format === "pdf") return exportSectionsPdf(options);
  if (options.format === "excel") return exportSectionsExcel(options);
  return exportSectionsWord(options);
}
