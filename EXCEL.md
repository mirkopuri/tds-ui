# TDS Excel style - standing rule

**Every Excel file a TDS app lets the user download (exports, backups, import templates, reports) MUST be built with
`tds-ui/excel.js`.** Never hand-roll an .xlsx (no bare `XLSX.utils.json_to_sheet`, no custom ZIP writers) and never ship
an unstyled sheet. This keeps every file recognisably TDS and every new app consistent from day one.

Applies to all hub apps (hub, order, price, database/data, accounting, and any app added later).

## Look (what the kit gives you)

- Coloured **group band** above the headers (optional) + header row; **gold header = required column**.
- Freeze panes (header + first column), autofilter, sensible column widths, landscape / fit-to-width print setup.
- Zebra rows, thin borders, Calibri 10; real **number / percent / date formats** (never numbers-as-text).
- Barcodes / EAN / HS codes forced to **text** so Excel never turns them into 8.0E+12.
- Import templates: **Instructions** sheet (steps, colour legend, column table), **Example** sheet(s) that are never
  imported, header hover notes, drop-downs (lists), number/date validation in *warning* style (never blocks the user),
  pre-formatted empty rows.
- Palette = brand tokens: navy `#2E4E8C`, slate `#44546A`, gold `#BF8F00` (required), green `#2E7D6B`.

## Usage (server side, Next.js route handler)

```ts
import ExcelJS from "exceljs";                       // add "exceljs" to the app's dependencies
import { createWorkbook, addSheet, toBuffer, xlsxResponse, XL } from "tds-ui/excel.js";

export async function GET() {
  const wb = createWorkbook(ExcelJS);
  addSheet(wb, {
    name: "Orders",
    tab: XL.navy,
    columns: [
      { header: "PO Number", width: 16 },
      { header: "Order date", kind: "date" },
      { header: "Total amount", kind: "money" },
      { header: "EAN code", text: true },
    ],
    rows: [["SM-260637", "2026-06-30", 1234.5, "8006830390238"]],
  });
  return xlsxResponse(await toBuffer(wb), `orders-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
```

* Import **templates**: pass `groups` (band), `emptyRows`, `lists`, per-column `required`, `note`, `list`, `kind`, plus
  `addInstructions(...)` and `addSheet({... sample: true ...})` for the Example sheet. Reference implementation:
  `data-webapp/src/lib/excel.ts`.
* Exports that users may re-import: use a plain single header row (no `groups`) and keep the header TEXT identical to
  the import template.
* Browser-only apps (no server): send `{ name, columns, rows }` to a small authenticated API route that calls the kit
  (Order App does this: `POST /api/export/xlsx`).

## Checklist when adding a new download

1. Uses `tds-ui/excel.js` (no other xlsx writer).
2. Columns have a `kind` (`int`, `money`, `percent`, `date`) or `text`; dates are real dates.
3. Required columns marked (`required: true`) in templates; hover `note` on non-obvious columns.
4. File name: `<what>-YYYY-MM-DD.xlsx`.
5. Verified by reading the file back (ExcelJS) and, for templates, through the importer.

## Propagating changes to the apps (important)

Each app pins tds-ui to a git commit in its lockfile, but Vercel restores a cached `node_modules` and npm treats a
git dependency with the same `version` as up to date. **So every change to tds-ui must bump `version` in
`tds-ui/package.json`** (0.2.0 -> 0.2.1 ...), then in each consuming app run `npm install github:mirkopuri/tds-ui`
and commit `package-lock.json`. Without the bump a Vercel build can silently keep the old copy
("Module not found: tds-ui/excel.js").
