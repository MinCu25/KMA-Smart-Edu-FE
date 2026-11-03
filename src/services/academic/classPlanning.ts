import type {
  ClassScheduleResponse,
  CreateModuleClassesRequest,
  ModuleClassResponse,
  SemesterResponse,
} from "../../types/dto";
import type { ClassIdentity } from "./domain";
import type { RoomRecord } from "../../context/AcademicContext";
import { conflicts } from "../../utils/academicRules";
import { addDays, occursOn, validDate } from "../../utils/timetable";
export const MAX_CLASS_CAPACITY = 80;
export function buildOpeningRequest(
  rows: { subjectId: number; maxCapacity: string | number }[],
  confirmed: boolean,
): CreateModuleClassesRequest {
  const subjects: CreateModuleClassesRequest["subjects"] = [];
  for (const row of rows) {
    const maxCapacity = Number(row.maxCapacity);
    if (
      !Number.isInteger(row.subjectId) ||
      row.subjectId <= 0 ||
      !Number.isInteger(maxCapacity) ||
      maxCapacity < 1 ||
      maxCapacity > MAX_CLASS_CAPACITY
    )
      throw Error("Học phần hoặc sức chứa không hợp lệ (1–80).");
    let entry = subjects.find((s) => s.subjectId === row.subjectId);
    if (!entry) {
      entry = {
        subjectId: row.subjectId,
        confirmAdditionalClasses: confirmed,
        classes: [],
      };
      subjects.push(entry);
    }
    entry.classes.push({ maxCapacity });
  }
  if (!subjects.length) throw Error("Vui lòng chọn ít nhất một lớp học phần.");
  return { subjects };
}
export function scheduleProblems(
  s: ClassScheduleResponse,
  term?: SemesterResponse,
) {
  const errors: Record<string, string[]> = {};
  if (!Number.isInteger(s.dayOfWeek) || s.dayOfWeek! < 2 || s.dayOfWeek! > 8)
    errors.dayOfWeek = ["Chọn thứ từ thứ 2 đến Chủ nhật."];
  if (!Number.isInteger(s.lessonOrderStart) || s.lessonOrderStart! < 1)
    errors.lessonOrderStart = ["Tiết bắt đầu phải là số nguyên dương."];
  if (
    !Number.isInteger(s.lessonOrderEnd) ||
    s.lessonOrderEnd! < s.lessonOrderStart!
  )
    errors.lessonOrderEnd = [
      "Tiết kết thúc phải là số nguyên từ tiết bắt đầu trở đi.",
    ];
  if (
    !validDate(s.startDate) ||
    !validDate(s.endDate) ||
    s.startDate > s.endDate
  )
    errors.endDate = ["Khoảng ngày học không hợp lệ."];
  else if (
    !term?.startDate ||
    !term.endDate ||
    s.startDate < term.startDate ||
    s.endDate > term.endDate
  )
    errors.startDate = ["Lịch phải nằm trong khoảng ngày của kỳ học."];
  else if (
    s.dayOfWeek &&
    !Array.from({ length: 7 }, (_, i) => addDays(s.startDate!, i)).some((day) =>
      occursOn(s, day),
    )
  )
    errors.dayOfWeek = ["Khoảng ngày đã chọn không có buổi học vào thứ này."];
  return errors;
}
export function publicationProblems(
  c: ModuleClassResponse,
  term: SemesterResponse | undefined,
  date: string,
  classes: ModuleClassResponse[],
  rooms: RoomRecord[],
  identities: ClassIdentity,
  activeTeacherIds: number[],
) {
  const reasons: string[] = [];
  if (!term || term.isLocked || !term.endDate || term.endDate < date)
    reasons.push("Kỳ đã khóa hoặc kết thúc");
  if (c.status !== "SCHEDULED")
    reasons.push("Lớp chưa ở trạng thái Đã xếp lịch");
  if (!c.schedules.length) reasons.push("Chưa có buổi học");
  if (
    !Number.isInteger(c.maxCapacity) ||
    c.maxCapacity < 1 ||
    c.maxCapacity > MAX_CLASS_CAPACITY ||
    c.maxCapacity < c.currentSize
  )
    reasons.push("Sức chứa phải từ 1–80 và không nhỏ hơn sĩ số");
  if (!activeTeacherIds.includes(c.lecturerId ?? identities[c.id]?.lecturerId))
    reasons.push("Chưa có giảng viên đang hoạt động");
  for (const s of c.schedules) {
    reasons.push(...Object.values(scheduleProblems(s, term)).flat());
    const r = rooms.find((r) => r.roomCode === s.roomCode);
    if (
      !r ||
      r.deleted ||
      r.status !== "ACTIVE" ||
      r.capacity < c.maxCapacity ||
      r.roomType !== identities[c.id]?.roomType
    )
      reasons.push(`Phòng ${s.roomCode} không phù hợp hoặc thiếu chỗ`);
    reasons.push(
      ...conflicts(classes, c, s, identities).map((x) => `Trùng lịch: ${x}`),
    );
  }
  return [...new Set(reasons)];
}
