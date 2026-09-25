import Papa from "papaparse";
import * as XLSX from "xlsx";

type Cell = string | number;

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(headers: string[], rows: Cell[][], filename: string) {
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n") + "\n";
  saveBlob(new Blob([csv], { type: "text/csv" }), filename);
}

export function downloadXlsx(headers: string[], rows: Cell[][], sheetName: string, filename: string) {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName);
  XLSX.writeFile(book, filename);
}

/** Reads a .csv or .xlsx file into rows keyed by the header row. */
export async function readSpreadsheet(file: File): Promise<Record<string, Cell>[]> {
  if (/\.xlsx?$/i.test(file.name)) {
    const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
    return XLSX.utils.sheet_to_json<Record<string, Cell>>(book.Sheets[book.SheetNames[0]]);
  }
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true, complete: (parsed) => resolve(parsed.data) });
  });
}
