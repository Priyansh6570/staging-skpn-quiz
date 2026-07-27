// xlsx-populate ships no types. Only the surface lib/admin/export.ts uses is declared.
declare module "xlsx-populate" {
  interface Cell {
    value(v: string | number): Cell;
    style(s: Record<string, unknown>): Cell;
  }
  interface Sheet {
    name(n: string): Sheet;
    cell(row: number, column: number): Cell;
    freezePanes(columns: number, rows: number): Sheet;
  }
  interface Workbook {
    sheet(index: number): Sheet;
    addSheet(name: string): Sheet;
    outputAsync(options?: { password?: string }): Promise<Buffer>;
  }
  const XlsxPopulate: { fromBlankAsync(): Promise<Workbook> };
  export default XlsxPopulate;
}
