import { managementSeed, demoRosters } from "./management";
import type { Grade, RecordRow } from "../../types/management";
// Historical fixtures, isolated from editable current-semester data.
export const teachingHistory = [
  { id: "2025-2026-2", name: "HK_2 - 2025-2026" },
  { id: "2025-2026-1", name: "HK_1 - 2025-2026" },
].map((term, index) => {
  const classes: RecordRow[] = managementSeed.classes
    .filter((c) => c.teacher === "GV001")
    .map((c) => ({ ...c, status: "Đã kết thúc" }));
  const rosters = Object.fromEntries(
    classes.map((c) => [c.id, [...(demoRosters[c.id] ?? [])]]),
  );
  const grades: Record<string, Record<string, Grade>> = {};
  classes.forEach((c) => {
    grades[c.id] = Object.fromEntries(
      rosters[c.id].map((id, i) => [
        id,
        {
          tp1: String(7 + ((i + index) % 3)),
          tp2: String(6 + ((i + index) % 4)),
          note: "",
        },
      ]),
    );
  });
  return { ...term, classes, rosters, grades };
});
