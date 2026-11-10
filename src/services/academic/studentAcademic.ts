import type { Student } from "../../types/student";
import type { Grade } from "../../types/management";
export function targetForStudent(students: Student[], username: string) {
  const target = students.find((s) => s.id === username)?.dto.targetGpa;
  return target == null ? "" : String(target);
}
export function setStudentTarget(
  students: Student[],
  username: string,
  value: string,
) {
  if (
    !username ||
    value.trim() === "" ||
    !Number.isFinite(+value) ||
    +value < 0 ||
    +value > 4 ||
    Math.abs(+value * 100 - Math.round(+value * 100)) > 1e-8
  )
    return students;
  return students.map((s) =>
    s.id === username ? { ...s, dto: { ...s.dto, targetGpa: +value } } : s,
  );
}
export function savedComponents(
  grades: Record<string, Record<string, Grade>>,
  classCode: string,
  studentCode: string,
) {
  const g = grades[classCode]?.[studentCode];
  return { tp1: g?.tp1?.trim() || "—", tp2: g?.tp2?.trim() || "—" };
}
