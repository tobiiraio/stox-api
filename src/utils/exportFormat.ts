import type { Response } from "express";
import ExcelJS from "exceljs";

export type ExportFormat = "csv" | "xlsx";

export type ExportColumn = {
  header: string;
  key: string;
  width?: number;
};

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  const s = typeof v === "string" ? v : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function todayYmd(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export function buildFilename(shopId: string, resource: string, format: ExportFormat): string {
  const safeShop = shopId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `stox-${safeShop}-${resource}-${todayYmd()}.${format}`;
}

function setDownloadHeaders(res: Response, filename: string, contentType: string): void {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");
}

export async function streamCsv(
  res: Response,
  filename: string,
  columns: ExportColumn[],
  rows: AsyncIterable<Record<string, unknown>>
): Promise<void> {
  setDownloadHeaders(res, filename, "text/csv; charset=utf-8");
  res.write("﻿"); // BOM so Excel opens UTF-8 correctly
  res.write(columns.map((c) => csvEscape(c.header)).join(",") + "\r\n");
  for await (const row of rows) {
    const line = columns.map((c) => csvEscape(row[c.key])).join(",");
    res.write(line + "\r\n");
  }
  res.end();
}

export async function streamXlsx(
  res: Response,
  filename: string,
  sheetName: string,
  columns: ExportColumn[],
  rows: AsyncIterable<Record<string, unknown>>
): Promise<void> {
  setDownloadHeaders(
    res,
    filename,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: res,
    useStyles: true,
  });
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? Math.max(12, c.header.length + 2),
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).commit();
  for await (const row of rows) {
    sheet.addRow(row).commit();
  }
  await sheet.commit();
  await workbook.commit();
}

export async function streamExport(
  res: Response,
  format: ExportFormat,
  shopId: string,
  resource: string,
  columns: ExportColumn[],
  rows: AsyncIterable<Record<string, unknown>>
): Promise<void> {
  const filename = buildFilename(shopId, resource, format);
  if (format === "csv") {
    return streamCsv(res, filename, columns, rows);
  }
  return streamXlsx(res, filename, resource, columns, rows);
}
