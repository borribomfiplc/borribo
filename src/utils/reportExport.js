const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export const exportCsv = ({ filename, columns, rows }) => {
  const header = columns.map((column) => csvCell(column.label)).join(",");
  const body = rows.map((row) => columns.map((column) => csvCell(
    typeof column.value === "function" ? column.value(row) : row[column.value],
  )).join(","));
  const blob = new Blob([`\uFEFF${[header, ...body].join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const printReport = () => window.print();
