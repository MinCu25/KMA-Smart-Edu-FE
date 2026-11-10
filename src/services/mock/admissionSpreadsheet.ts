import readXlsxFile from "read-excel-file/browser";
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import type { AdmissionApplicantResponse } from "../api/backendContract";
import { admissionError } from "./admissionDomain";
import { validateEmail, validatePhone } from "../../utils/profileValidation";
const norm = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const headers = [
  "Mã hồ sơ",
  "CCCD",
  "Họ tên",
  "Điểm đầu vào",
  "Ngày sinh",
  "Giới tính",
  "Email",
  "Số điện thoại",
];
const xml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
export function templateBlob(): Blob {
  const rows = [
    ["Sinh viên trúng tuyển"],
    ["Tên ngành", "Công nghệ thông tin"],
    ["Mã ngành", "CNTT"],
    [],
    headers,
  ];
  const sheet =
    '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="3" width="24" customWidth="1" style="1"/><col min="4" max="4" width="20" customWidth="1"/><col min="5" max="8" width="24" customWidth="1" style="1"/></cols><sheetData>' +
    rows
      .map(
        (r, i) =>
          `<row r="${i + 1}">` +
          r
            .map(
              (v, j) =>
                `<c r="${String.fromCharCode(65 + j)}${i + 1}" t="inlineStr"><is><t>${xml(v)}</t></is></c>`,
            )
            .join("") +
          "</row>",
      )
      .join("") +
    "</sheetData></worksheet>";
  const files: Record<string, string> = {
    "[Content_Types].xml":
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    "_rels/.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml":
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sinh viên trúng tuyển" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    "xl/styles.xml":
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    "xl/worksheets/sheet1.xml": sheet,
  };
  const zip = zipSync(
    Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])),
  );
  return new Blob([new Uint8Array(zip)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
export async function parseApplicants(
  file: File,
  cohortCode: string,
): Promise<AdmissionApplicantResponse[]> {
  if (
    !file?.size ||
    file.size > 20 * 1024 * 1024 ||
    !file.name.toLowerCase().endsWith(".xlsx")
  )
    admissionError("Chọn file .xlsx có dữ liệu, tối đa 20 MB.", 4138, "file");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const archive = unzipSync(bytes);
  const badRows = new Set<number>();
  let cleaned = false;
  for (const [name, content] of Object.entries(archive)) {
    if (!/^xl\/worksheets\/.*\.xml$/.test(name)) continue;
    const doc = new DOMParser().parseFromString(
      strFromU8(content),
      "application/xml",
    );
    for (const cell of Array.from(doc.getElementsByTagName("c"))) {
      if (
        cell.getElementsByTagName("f").length ||
        cell.getAttribute("t") === "e"
      ) {
        badRows.add(Number((cell.getAttribute("r") ?? "").replace(/\D/g, "")));
        cell.removeAttribute("t");
        cell.replaceChildren();
        cleaned = true;
      }
    }
    if (cleaned)
      archive[name] = strToU8(new XMLSerializer().serializeToString(doc));
  }
  const source = cleaned ? new Blob([new Uint8Array(zipSync(archive))]) : file;
  const sheets = await readXlsxFile(source);
  if (sheets.length !== 1)
    admissionError("File phải có đúng một sheet.", 4138, "file");
  const rows = sheets[0].data;
  const modern = norm(rows[2]?.[0]) === "manganh";
  const legacy = norm(rows[0]?.[0]) === "manganh";
  const major = String(modern ? rows[2]?.[1] : (rows[0]?.[1] ?? ""))
    .trim()
    .toUpperCase();
  if (!modern && !legacy)
    admissionError(
      "Thiếu thông tin ngành trong file. Hãy tải cấu trúc danh sách mới.",
      4139,
      "file",
    );
  if (major !== "CNTT")
    admissionError(
      "Mã ngành trong file không khớp ngành Công nghệ thông tin (CNTT).",
      4140,
      "majorCode",
    );
  if (
    legacy &&
    (norm(rows[2]?.[0]) !== "makhoa" ||
      String(rows[2]?.[1] ?? "")
        .trim()
        .toUpperCase() !== cohortCode)
  )
    admissionError(
      "Mã khóa trong mẫu cũ không khớp khóa đã chọn.",
      4140,
      "cohortCode",
    );
  let header = rows.findIndex((r) => r.some((c) => norm(c) === "mahoso"));
  if (header < 0) admissionError("Thiếu dòng tiêu đề Mã hồ sơ.", 4138, "file");
  if ([...badRows].some((n) => n <= header + 1))
    admissionError(
      "Không chấp nhận công thức hoặc ô lỗi trong metadata/header.",
      4138,
      "file",
    );
  if (Math.max(rows.length, ...badRows) - header - 1 > 50000)
    admissionError("Danh sách vượt 50.000 dòng.", 4138, "file");
  const normalized = rows[header].map(norm);
  const meaningful = normalized.filter(Boolean);
  if (new Set(meaningful).size !== meaningful.length)
    admissionError("Tiêu đề cột bị trùng.", 4138, "file");
  const indices = headers.map((h) => normalized.indexOf(norm(h)));
  if (indices.slice(0, 4).some((n) => n < 0))
    admissionError(
      "Thiếu cột Mã hồ sơ, CCCD, Họ tên hoặc Điểm đầu vào.",
      4138,
      "file",
    );
  const today = new Date().toLocaleDateString("sv-SE");
  const result: AdmissionApplicantResponse[] = [];
  const lastRow = Math.max(rows.length, ...badRows);
  for (let r = header + 1; r < lastRow; r++) {
    const row = rows[r] ?? [];
    if (!badRows.has(r + 1) && !row.some((v) => v !== null && String(v).trim()))
      continue;
    const get = (i: number) => (indices[i] < 0 ? null : row[indices[i]]);
    const text = (i: number) =>
      String(get(i) ?? "")
        .trim()
        .normalize("NFC");
    const errors: string[] = [];
    const citizenId = text(1).replace(/\s/g, "");
    const scoreText = text(3).replace(",", ".");
    const score = scoreText ? Number(scoreText) : NaN;
    if (badRows.has(r + 1)) errors.push("Không chấp nhận công thức hoặc ô lỗi");
    if (!text(0) || text(0).length > 100)
      errors.push("Mã hồ sơ bắt buộc, tối đa 100 ký tự");
    if (typeof get(1) !== "string" || !/^\d{12}$/.test(citizenId))
      errors.push("CCCD phải là ô văn bản gồm 12 chữ số");
    if (!text(2) || text(2).length > 255)
      errors.push("Họ tên bắt buộc, tối đa 255 ký tự");
    if (
      !Number.isFinite(score) ||
      score < 0 ||
      score >= 1e17 ||
      !/^\d+(?:\.\d{1,2})?$/.test(scoreText)
    )
      errors.push("Điểm đầu vào phải không âm, tối đa hai chữ số thập phân");
    let date: string | null = null;
    const rawDate = get(4);
    if (rawDate instanceof Date) date = rawDate.toISOString().slice(0, 10);
    else if (text(4)) {
      date = text(4);
      const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
      if (m) date = `${m[3]}-${m[2]}-${m[1]}`;
    }
    if (
      date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date ||
        date >= today)
    )
      errors.push("Ngày sinh không hợp lệ hoặc không trong quá khứ");
    if (
      text(5) &&
      !["nam", "nu", "khac", "male", "female", "other"].includes(norm(text(5)))
    )
      errors.push("Giới tính không hợp lệ");
    if (text(6) && validateEmail(text(6))) errors.push("Email không hợp lệ");
    if (text(7) && validatePhone(text(7)))
      errors.push("Số điện thoại không hợp lệ");
    result.push({
      id: r + 1,
      rowNumber: r + 1,
      applicationCode: text(0) || null,
      citizenId: citizenId || null,
      fullName: text(2) || null,
      dateOfBirth: date,
      gender: text(5) || null,
      email: text(6).toLowerCase() || null,
      phone: text(7) || null,
      entranceScore: Number.isFinite(score) ? score : null,
      state: errors.length ? "INVALID" : "VALID",
      error: errors.join("; ") || null,
      assignedClassId: null,
      studentId: null,
      studentCode: null,
      reusingAccount: false,
      warnings: [],
    });
  }
  if (!result.length) admissionError("File chưa có hồ sơ nào.", 4138, "file");
  return result;
}
