import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";

// Noto Sans Bengali covers both Bangla and English, and pdfkit's text engine shapes
// Bangla conjuncts and vowel signs correctly with it.
const FONT_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "../assets/fonts/NotoSansBengali.ttf");

const PAGE_MARGIN = 36;
const CELL_PAD_X = 6;
const CELL_PAD_Y = 5;
const FONT_SIZE = 9.5;
const COLORS = {
  ink: "#1f2421",
  muted: "#7a817c",
  headerBg: "#224f43",
  headerText: "#ffffff",
  zebra: "#f2eee6",
  line: "#e6e0d4",
};

// Column widths are fractions of the usable page width (A4 landscape).
const COLUMNS = [
  { key: "index", label: "#", share: 0.05, align: "right" },
  { key: "name", label: "Title", share: 0.3 },
  { key: "author", label: "Author", share: 0.21 },
  { key: "publisher", label: "Publisher", share: 0.19 },
  { key: "genre", label: "Genre", share: 0.13 },
  { key: "added", label: "Added on", share: 0.12 },
];

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * Writes a PDF table of all books to `stream`.
 * @param {object[]} books lean book documents, already sorted
 * @param {import("stream").Writable} stream e.g. the HTTP response
 * @param {{ title: string }} options
 */
export function writeBooksPdf(books, stream, { title }) {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: PAGE_MARGIN,
    bufferPages: true, // needed to write "Page X of Y" once the page count is known
    info: { Title: title, Creator: title },
  });
  doc.pipe(stream);
  doc.registerFont("Body", FONT_PATH);
  doc.font("Body");

  const left = PAGE_MARGIN;
  const usableWidth = doc.page.width - PAGE_MARGIN * 2;
  const footerSpace = 24;
  const bottom = () => doc.page.height - PAGE_MARGIN - footerSpace;
  const columns = COLUMNS.map((c) => ({ ...c, width: c.share * usableWidth }));

  const cellText = (book, key, i) => {
    if (key === "index") return String(i + 1);
    if (key === "added") return book.createdAt ? dateFormat.format(new Date(book.createdAt)) : "—";
    return book[key] || "—";
  };

  const rowHeight = (texts) =>
    Math.max(
      ...texts.map((text, c) => doc.heightOfString(text, { width: columns[c].width - CELL_PAD_X * 2 }))
    ) + CELL_PAD_Y * 2;

  const drawRow = (texts, y, height, { fill, color }) => {
    if (fill) doc.rect(left, y, usableWidth, height).fill(fill);
    let x = left;
    texts.forEach((text, c) => {
      doc.fillColor(color).text(text, x + CELL_PAD_X, y + CELL_PAD_Y, {
        width: columns[c].width - CELL_PAD_X * 2,
        align: columns[c].align ?? "left",
      });
      x += columns[c].width;
    });
    doc.moveTo(left, y + height).lineTo(left + usableWidth, y + height).lineWidth(0.5).strokeColor(COLORS.line).stroke();
    return y + height;
  };

  const drawHeader = (y) => {
    doc.fontSize(FONT_SIZE);
    const labels = columns.map((c) => c.label);
    return drawRow(labels, y, rowHeight(labels), { fill: COLORS.headerBg, color: COLORS.headerText });
  };

  // Title block (first page only)
  doc.fillColor(COLORS.ink).fontSize(18).text(title, left, PAGE_MARGIN);
  doc
    .fillColor(COLORS.muted)
    .fontSize(10)
    .text(
      `${books.length.toLocaleString("en-US")} book${books.length === 1 ? "" : "s"} · Generated on ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date())}`
    );
  let y = drawHeader(doc.y + 10);

  if (books.length === 0) {
    doc.fillColor(COLORS.muted).fontSize(FONT_SIZE).text("No books in the library yet.", left, y + 10);
  }

  doc.fontSize(FONT_SIZE);
  books.forEach((book, i) => {
    const texts = columns.map((c) => cellText(book, c.key, i));
    const height = rowHeight(texts);
    if (y + height > bottom()) {
      doc.addPage();
      y = drawHeader(PAGE_MARGIN);
      doc.fontSize(FONT_SIZE);
    }
    y = drawRow(texts, y, height, { fill: i % 2 === 1 ? COLORS.zebra : null, color: COLORS.ink });
  });

  // Footer with page numbers on every page
  const range = doc.bufferedPageRange();
  for (let p = range.start; p < range.start + range.count; p++) {
    doc.switchToPage(p);
    // Writing inside the bottom margin would make pdfkit start a new page, so lift it.
    doc.page.margins.bottom = 0;
    doc
      .fillColor(COLORS.muted)
      .fontSize(8.5)
      .text(`${title} · Page ${p + 1} of ${range.count}`, left, doc.page.height - PAGE_MARGIN - 10, {
        width: usableWidth,
        align: "center",
        lineBreak: false,
      });
  }

  doc.end();
}
