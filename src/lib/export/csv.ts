export type ExportResult = {
  headers: string[];
  rows: (string | number | null)[][];
  filename: string;
  totalRows: number;
};

// Converter para CSV com BOM UTF-8 para Excel
export function toCSV(result: ExportResult): string {
  const escapeCell = (cell: string | number | null) => {
    const str = String(cell ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    result.headers.map(escapeCell).join(","),
    ...result.rows.map((row) => row.map(escapeCell).join(",")),
  ];

  return "\uFEFF" + lines.join("\n");
}

// Download de CSV no browser
export function downloadCSV(result: ExportResult) {
  const csv = toCSV(result);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${result.filename}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
