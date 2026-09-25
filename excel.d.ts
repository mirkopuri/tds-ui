export const XL_CONTENT_TYPE: string;
export const XL: {
  navy: string; navyLight: string; gold: string; cream: string; bluePale: string; slate: string;
  green: string; grey: string; border: string; text: string; muted: string; white: string; font: string;
};
export function tint(hex: string, t: number): string;

export type XlKind = "text" | "int" | "decimal" | "money" | "percent" | "date";
export type XlColumn = {
  header: string;
  width?: number;
  group?: string;
  required?: boolean;
  kind?: XlKind;
  numFmt?: string;
  text?: boolean;
  note?: string;
  list?: string[] | string;
  warnList?: boolean;
};
export type XlSheetSpec = {
  name: string;
  columns: XlColumn[];
  rows?: unknown[][];
  groups?: Record<string, { label: string; color: string }>;
  emptyRows?: number;
  sample?: boolean;
  lists?: Record<string, string[]>;
  tab?: string;
  freezeCols?: number;
};
export type XlInstructionsSpec = {
  sheetName?: string;
  title: string;
  steps?: string[];
  lastStepIsNote?: boolean;
  legend?: [string, string, string][];
  fields?: [string, string, boolean, string, string][];
};

// `ExcelJS` is the exceljs module (typed loosely on purpose: this package has no dependency on it).
export function createWorkbook(ExcelJS: any, opts?: { creator?: string }): any;
export function addSheet(wb: any, spec: XlSheetSpec): any;
export function addInstructions(wb: any, spec: XlInstructionsSpec): any;
export function toBuffer(wb: any): Promise<Buffer>;
export function xlsxResponse(buffer: Buffer, filename: string): Response;
