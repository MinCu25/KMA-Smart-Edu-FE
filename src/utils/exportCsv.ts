import { announce } from "./notifications";
export function exportCsv(filename: string, rows: (string | number)[][]) {
  try {
    const quote = (value: string | number) => {
      let text = String(value);
      if (/^[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((row) => row.map(quote).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    announce(`Đã tạo tệp ${filename} và bắt đầu tải xuống.`);
  } catch (error) {
    announce(
      error instanceof Error
        ? `Xuất tệp thất bại: ${error.message}`
        : "Không thể xuất tệp.",
      "error",
    );
  }
}
