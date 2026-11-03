import { recurringOverlap as overlap } from "./timetable";
import type {
  SubjectResponse,
  ClassScheduleResponse,
  ModuleClassResponse,
} from "../types/dto";
export function prerequisiteCycle(
  subjects: SubjectResponse[],
  id: number,
  ids: number[],
): string[] {
  const graph = new Map(
    subjects.map((s) => [
      s.id,
      s.id === id ? ids : s.prerequisites.map((p) => p.id),
    ]),
  );
  function visit(n: number, path: number[]): number[] {
    if (path.includes(n)) return [...path.slice(path.indexOf(n)), n];
    for (const next of graph.get(n) ?? []) {
      const cycle = visit(next, [...path, n]);
      if (cycle.length) return cycle;
    }
    return [];
  }
  return visit(id, []).map(
    (n) => subjects.find((s) => s.id === n)?.subjectCode ?? String(n),
  );
}
export { recurringOverlap as overlap } from "./timetable";
export function conflicts(
  classes: ModuleClassResponse[],
  current: ModuleClassResponse,
  schedule: ClassScheduleResponse,
  identities: import("../services/academic/domain").ClassIdentity = {},
) {
  return classes
    .filter(
      (c) =>
        c.status !== "CANCELLED" && c.semesterCode === current.semesterCode,
    )
    .flatMap((c) =>
      c.schedules
        .filter(
          (s) =>
            !(c.id === current.id && s.id === schedule.id) &&
            overlap(s, schedule) &&
            (c.id === current.id ||
              s.roomCode === schedule.roomCode ||
              (identities[c.id]?.lecturerId != null &&
                identities[c.id].lecturerId ===
                  identities[current.id]?.lecturerId)),
        )
        .map(
          (s) =>
            `${c.moduleClassCode}: thứ ${s.dayOfWeek}, tiết ${s.lessonOrderStart}–${s.lessonOrderEnd}, phòng ${s.roomCode} (${s.startDate} – ${s.endDate})`,
        ),
    );
}
export function allocateByScore<T extends { entranceScore: number }>(
  rows: T[],
  count: number,
): T[][] {
  if (!Number.isInteger(count) || count < 1)
    throw Error("Số lớp phải là số nguyên dương.");
  const groups: T[][] = Array.from({ length: count }, () => []);
  [...rows]
    .sort((a, b) => b.entranceScore - a.entranceScore)
    .forEach((row, i) => {
      const round = Math.floor(i / count),
        offset = i % count;
      groups[round % 2 ? count - 1 - offset : offset].push(row);
    });
  return groups;
}
