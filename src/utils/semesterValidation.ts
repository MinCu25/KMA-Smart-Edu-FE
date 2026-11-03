import type { SemesterResponse } from "../types/dto";
import { validDate } from "./timetable";
const namePattern = /^HK_([1-9][0-9]*) - ([0-9]{4})-([0-9]{4})$/;
/** Normalize known earlier display names without changing existing term identifiers. */
export function semesterFormName(name: string) {
  const value = name.trim();
  const match =
    value.match(/^Học k[ìỳ] ([1-9][0-9]*) năm học (\d{4})-(\d{4})$/) ??
    value.match(
      /^(?:HK_|Học k[ìỳ]\s+)([1-9][0-9]*)\s*(?:-|·)\s*(\d{4})\s*[-–]\s*(\d{4})$/,
    );
  return match ? `HK_${match[1]} - ${match[2]}-${match[3]}` : value;
}
export function nextSemesterIdentity(
  terms: Pick<SemesterResponse, "semesterCode">[],
  lastSequence: number,
) {
  const sequence =
    Math.max(
      lastSequence,
      0,
      ...terms.map((t) => Number(t.semesterCode.match(/^KY(\d+)$/)?.[1] ?? 0)),
    ) + 1;
  return { sequence, code: `KY${String(sequence).padStart(4, "0")}` };
}
export type SemesterFields = Pick<
  SemesterResponse,
  | "semesterName"
  | "startDate"
  | "endDate"
  | "registrationStart"
  | "registrationEnd"
>;
export function validateSemesterFields(
  value: SemesterFields,
  terms: SemesterResponse[],
  excludedId?: number,
) {
  const errors: Record<string, string[]> = {};
  const add = (key: string, message: string) =>
    (errors[key] ??= []).push(message);
  const name = value.semesterName.trim();
  const match = name.match(namePattern);
  if (!name) add("semesterName", "Vui lòng nhập tên kỳ học.");
  else if (!match || +match[2] < 1 || +match[3] !== +match[2] + 1)
    add(
      "semesterName",
      "Nhập theo dạng HK_1 - 2026-2027; số kỳ là số nguyên dương và hai năm phải liên tiếp.",
    );
  else if (
    terms.some(
      (t) => t.id !== excludedId && semesterFormName(t.semesterName) === name,
    )
  )
    add("semesterName", "Tên kỳ học đã tồn tại.");
  const {
    startDate: start,
    endDate: end,
    registrationStart: regStart,
    registrationEnd: regEnd,
  } = value;
  if (validDate(start) && validDate(end) && start >= end)
    add("endDate", "Ngày kết thúc kỳ học phải sau ngày bắt đầu kỳ học.");
  if (validDate(regStart) && validDate(regEnd) && regStart >= regEnd)
    add(
      "registrationEnd",
      "Ngày kết thúc đăng ký phải sau ngày bắt đầu đăng ký.",
    );
  if (validDate(regEnd) && validDate(start) && regEnd >= start) {
    add(
      "registrationEnd",
      "Ngày kết thúc đăng ký phải trước ngày bắt đầu kỳ học.",
    );
    add("startDate", "Ngày bắt đầu kỳ học phải sau ngày kết thúc đăng ký.");
  }
  for (const t of terms.filter((t) => t.id !== excludedId)) {
    if (
      validDate(start) &&
      validDate(end) &&
      start < end &&
      t.startDate &&
      t.endDate &&
      t.startDate <= end &&
      t.endDate >= start
    )
      add("startDate", `Thời gian học chồng lấn với ${t.semesterName}.`);
    if (
      validDate(regStart) &&
      validDate(regEnd) &&
      regStart < regEnd &&
      t.registrationStart &&
      t.registrationEnd &&
      t.registrationStart <= regEnd &&
      t.registrationEnd >= regStart
    )
      add(
        "registrationStart",
        `Thời gian đăng ký chồng lấn với ${t.semesterName}.`,
      );
  }
  return errors;
}
