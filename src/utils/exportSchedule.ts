import { scheduleEntries } from "./classSchedules";
import type { Course } from "../types/course";
import { exportCsv } from "./exportCsv";
export function exportScheduleCsv(selected: Course[], weekStart?: string) {
  exportCsv("KMA-thoi-khoa-bieu.csv", [
    ["Mã lớp", "Học phần", "Thứ", "Tiết", "Phòng"],
    ...scheduleEntries(selected, weekStart).map((c) => [
      c.id,
      c.name,
      c.day,
      `${c.start}-${c.end}`,
      c.room,
    ]),
  ]);
}
