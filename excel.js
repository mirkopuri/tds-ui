// TDS shared Excel style kit - THE way every downloadable .xlsx in a TDS app is built (see EXCEL.md).
//
// ExcelJS is passed in by the caller (no dependency here), so it works in Node (Next.js route handlers) and
// in the browser:   import ExcelJS from "exceljs";   const wb = createWorkbook(ExcelJS);
//
// Look: coloured group band + header row, gold = required column, freeze panes + autofilter, header hover
// notes, zebra rows, drop-down / number / date validation (warning style: never blocks the user), text format
// for barcodes, "Instructions" and "Example" sheets for import templates, real dates and number formats.

export const XL_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Brand palette (hex without #) - same values as tokens.css.
export const XL = {
  navy: "2E4E8C",
  navyLight: "3F61A3",
  gold: "BF8F00",
  cream: "FFF2CC",
  bluePale: "EAF0F7",
  slate: "44546A",
  green: "2E7D6B",
  grey: "9AA5B1",
  border: "DDE1E6",
  text: "1F2430",
  muted: "6B7280",
  white: "FFFFFF",
  font: "Calibri",
};

const argb = (hex) => `FF${hex}`;
const thin = { style: "thin", color: { argb: argb(XL.border) } };
const box = { top: thin, left: thin, bottom: thin, right: thin };

/** Mix a colour with white (t = share of the colour, 0..1) -> hex. */
export function tint(hex, t) {
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => Math.round(255 - (255 - v) * t).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

const solid = (hex) => ({ type: "pattern", pattern: "solid", fgColor: { argb: argb(hex) } });

// Default number formats by column kind.
const KIND_FMT = { int: "#,##0", decimal: "#,##0.00", money: "#,##0.00", percent: "0.0", date: "yyyy-mm-dd" };

function toDate(v) {
  if (v instanceof Date) return v;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ""));
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
}

/**
 * @param {any} ExcelJS the exceljs module
 * @param {{creator?: string}} [opts]
 */
export function createWorkbook(ExcelJS, opts = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = opts.creator || "Terre di Semia International";
  wb.created = new Date();
  return wb;
}

/** Serialise to a Node Buffer (route handlers). */
export async function toBuffer(wb) {
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** A ready download Response for a Next.js route handler. */
export function xlsxResponse(buffer, filename) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": XL_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/**
 * Add one styled sheet.
 *
 * spec.columns[]  { header, width?, group?, required?, kind?: "text"|"int"|"decimal"|"money"|"percent"|"date",
 *                   numFmt?, text? (force text: barcodes), note? (hover help), list? (string[] | name in spec.lists),
 *                   warnList? (list is a suggestion: warn instead of block) }
 * spec.groups     { [key]: { label, color } }  -> coloured band row above the headers (headers then on row 2).
 *                 Omit for a plain single header row (row 1) - keep it that way for files meant to be re-imported
 *                 by older importers; TDS importers find the header row themselves.
 * spec.rows       array of arrays (same order as columns)
 * spec.emptyRows  number of pre-formatted, validated empty rows (import templates)
 * spec.sample     true = rows are examples (muted italic) - such sheets must never be imported
 * spec.lists      { name: string[] } drop-down sources kept on a hidden "Lists" sheet
 * spec.tab        tab colour (hex) ; spec.freezeCols (default 1)
 */
export function addSheet(wb, spec) {
  const { name, columns, rows = [], groups = null, emptyRows = 0, sample = false, lists = {}, tab = XL.navy, freezeCols = 1 } = spec;
  const hasBand = !!groups;
  const headerRow = hasBand ? 2 : 1;
  const ws = wb.addWorksheet(name, {
    properties: { tabColor: { argb: argb(tab) } },
    views: [{ state: "frozen", xSplit: freezeCols, ySplit: headerRow, showGridLines: false }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  // widths: explicit, else from content
  columns.forEach((c, i) => {
    const longest = rows.reduce((m, r) => Math.max(m, String(r[i] ?? "").length), 0);
    ws.getColumn(i + 1).width = c.width || Math.min(46, Math.max(11, Math.ceil(c.header.length * 0.9), longest + 2));
  });

  // band row
  if (hasBand) {
    let start = 1;
    while (start <= columns.length) {
      let end = start;
      while (end < columns.length && columns[end].group === columns[start - 1].group) end++;
      const g = groups[columns[start - 1].group] || { label: "", color: XL.navy };
      if (end > start) ws.mergeCells(1, start, 1, end);
      const cell = ws.getCell(1, start);
      cell.value = g.label;
      cell.font = { name: XL.font, bold: true, size: 10, color: { argb: argb(XL.white) } };
      cell.fill = solid(g.color);
      cell.alignment = { vertical: "middle", horizontal: "center" };
      for (let k = start; k <= end; k++) ws.getCell(1, k).border = { left: { style: "thin", color: { argb: argb(XL.white) } }, right: { style: "thin", color: { argb: argb(XL.white) } } };
      start = end + 1;
    }
    ws.getRow(1).height = 20;
  }

  // header row
  columns.forEach((c, i) => {
    const color = (hasBand && groups[c.group]?.color) || tab;
    const cell = ws.getCell(headerRow, i + 1);
    cell.value = c.header;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    if (hasBand) {
      cell.font = { name: XL.font, bold: true, size: 10, color: { argb: argb(c.required ? XL.white : XL.text) } };
      cell.fill = solid(c.required ? XL.gold : tint(color, 0.18));
      cell.border = { bottom: { style: "medium", color: { argb: argb(c.required ? XL.gold : color) } }, left: thin, right: thin };
    } else {
      cell.font = { name: XL.font, bold: true, size: 10, color: { argb: argb(XL.white) } };
      cell.fill = solid(c.required ? XL.gold : color);
      cell.border = { left: { style: "thin", color: { argb: argb(XL.white) } }, right: { style: "thin", color: { argb: argb(XL.white) } } };
    }
    if (c.note) cell.note = { texts: [{ text: c.note, font: { name: XL.font, size: 9 } }] };
  });
  ws.getRow(headerRow).height = hasBand ? 36 : 34;
  ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: columns.length } };

  // hidden Lists sheet for named drop-down sources. The list -> column mapping lives on the Lists sheet itself
  // (header row), so several sheets can share / reuse lists in any order without overwriting each other.
  const listRef = (listName) => {
    const values = lists[listName] || [];
    const sheet = wb.getWorksheet("Lists") || wb.addWorksheet("Lists", { state: "veryHidden" });
    let col = 1;
    while (sheet.getCell(1, col).value && sheet.getCell(1, col).value !== listName) col++;
    if (sheet.getCell(1, col).value !== listName) {
      sheet.getCell(1, col).value = listName;
      values.forEach((v, r) => (sheet.getCell(r + 2, col).value = v));
    }
    const letter = String.fromCharCode(64 + col);
    return `Lists!$${letter}$2:$${letter}$${Math.max(2, values.length + 1)}`;
  };

  // body rows (data) then validated empty rows (templates)
  const total = rows.length + (sample ? 0 : emptyRows);
  for (let r = 0; r < total; r++) {
    const rowNo = headerRow + 1 + r;
    const data = rows[r];
    columns.forEach((c, i) => {
      const cell = ws.getCell(rowNo, i + 1);
      let v = data ? data[i] : undefined;
      if (v !== undefined && v !== null && v !== "") {
        if (c.kind === "date") v = toDate(v) ?? v;
        else if ((c.kind === "int" || c.kind === "decimal" || c.kind === "money" || c.kind === "percent") && typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) v = Number(v);
        cell.value = v;
      }
      cell.font = { name: XL.font, size: 10, color: { argb: argb(sample ? XL.muted : XL.text) }, italic: sample };
      const numeric = c.kind === "int" || c.kind === "decimal" || c.kind === "money" || c.kind === "percent";
      cell.alignment = { vertical: "middle", horizontal: numeric ? "right" : "left" };
      if (c.text) cell.numFmt = "@";
      else if (c.numFmt || KIND_FMT[c.kind]) cell.numFmt = c.numFmt || KIND_FMT[c.kind];
      if (emptyRows || sample) cell.border = box;
      else {
        cell.border = { bottom: thin };
        if (r % 2) cell.fill = solid("F7F9FC");
      }
      if (sample || data) return;
      // validation on the empty template rows
      if (c.list) {
        const named = typeof c.list === "string";
        cell.dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [named ? listRef(c.list) : `"${c.list.join(",")}"`],
          showErrorMessage: true,
          errorStyle: c.warnList || named ? "warning" : "stop",
          errorTitle: c.header,
          error: c.warnList || named ? `This value is not in the list. Keep it anyway?` : `Please choose one of: ${c.list.join(", ")}.`,
        };
      } else if (c.kind === "int") {
        cell.dataValidation = { type: "whole", operator: "greaterThanOrEqual", allowBlank: true, formulae: [0], showErrorMessage: true, errorStyle: "warning", errorTitle: c.header, error: "Expected a whole number (0 or more)." };
      } else if (c.kind === "decimal" || c.kind === "money" || c.kind === "percent") {
        cell.dataValidation = { type: "decimal", operator: "greaterThanOrEqual", allowBlank: true, formulae: [0], showErrorMessage: true, errorStyle: "warning", errorTitle: c.header, error: "Expected a number (0 or more)." };
      } else if (c.kind === "date") {
        cell.dataValidation = { type: "date", operator: "greaterThan", allowBlank: true, formulae: [new Date(Date.UTC(2000, 0, 1))], showErrorMessage: true, errorStyle: "warning", errorTitle: c.header, error: "Expected a date, e.g. 2026-09-24." };
      }
    });
    if (sample) ws.getRow(rowNo).height = 18;
  }
  return ws;
}

/**
 * "Instructions" sheet for import templates.
 * spec: { title, steps: string[] (last one may be a muted footnote), legend: [colorHex, label, description][],
 *         fields: [column, sheet, required(bool), description, example][] }
 */
export function addInstructions(wb, spec) {
  const ws = wb.addWorksheet(spec.sheetName || "Instructions", {
    properties: { tabColor: { argb: argb(XL.gold) } },
    views: [{ showGridLines: false }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  [22, 20, 12, 78, 38].forEach((w, i) => (ws.getColumn(i + 1).width = w));

  ws.mergeCells("A1:E1");
  const title = ws.getCell("A1");
  title.value = spec.title;
  title.font = { name: XL.font, bold: true, size: 18, color: { argb: argb(XL.white) } };
  title.fill = solid(XL.navy);
  title.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(1).height = 36;

  const steps = spec.steps || [];
  steps.forEach((t, i) => {
    const r = i + 3;
    ws.mergeCells(r, 1, r, 5);
    const c = ws.getCell(r, 1);
    const foot = spec.lastStepIsNote && i === steps.length - 1;
    c.value = t;
    c.font = { name: XL.font, size: 11, italic: foot, color: { argb: argb(foot ? XL.muted : XL.text) } };
    c.alignment = { vertical: "middle", wrapText: true, indent: 1 };
    ws.getRow(r).height = 24;
  });

  let r = steps.length + 4;
  if (spec.legend?.length) {
    ws.getCell(r, 1).value = "Colour legend";
    ws.getCell(r, 1).font = { name: XL.font, bold: true, size: 12, color: { argb: argb(XL.navy) } };
    r++;
    spec.legend.forEach(([color, label, desc]) => {
      const chip = ws.getCell(r, 1);
      chip.value = label;
      chip.font = { name: XL.font, bold: true, size: 10, color: { argb: argb(XL.white) } };
      chip.fill = solid(color);
      chip.alignment = { horizontal: "center", vertical: "middle" };
      ws.mergeCells(r, 2, r, 5);
      ws.getCell(r, 2).value = desc;
      ws.getCell(r, 2).font = { name: XL.font, size: 10, color: { argb: argb(XL.text) } };
      ws.getCell(r, 2).alignment = { vertical: "middle", indent: 1 };
      ws.getRow(r).height = 20;
      r++;
    });
  }

  if (spec.fields?.length) {
    r += 1;
    ["Column", "Sheet", "Required", "What to enter", "Example"].forEach((h, i) => {
      const c = ws.getCell(r, i + 1);
      c.value = h;
      c.font = { name: XL.font, bold: true, size: 10, color: { argb: argb(XL.white) } };
      c.fill = solid(XL.navy);
      c.alignment = { vertical: "middle", horizontal: i === 2 ? "center" : "left", indent: i === 2 ? 0 : 1 };
    });
    ws.getRow(r).height = 22;
    spec.fields.forEach((row, idx) => {
      r++;
      row.forEach((v, i) => {
        const c = ws.getCell(r, i + 1);
        c.value = i === 2 ? (v ? "Yes" : "") : v;
        c.font = { name: XL.font, size: 10, bold: i === 0 || (i === 2 && !!v), color: { argb: argb(i === 2 && v ? XL.gold : i === 4 ? XL.muted : XL.text) } };
        c.alignment = { vertical: "top", wrapText: true, horizontal: i === 2 ? "center" : "left", indent: i === 2 ? 0 : 1 };
        c.fill = solid(idx % 2 ? XL.white : XL.bluePale);
        c.border = { bottom: thin };
      });
    });
  }
  return ws;
}
