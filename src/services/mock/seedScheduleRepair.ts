import {
  moduleClassResponses,
  semesterResponse,
} from "../../data/mock/dtoFixtures";
// Only known, unchanged legacy fixture dates are corrected. Custom terms and
// edited schedules stay untouched; passwords and accounts are never involved.
export function repairSeedScheduleStorage(key: string, value: any): any {
  const fixTerm = (term: any) =>
    term?.semesterCode === semesterResponse.semesterCode &&
    term.startDate === "2026-11-02" &&
    term.endDate === "2027-01-31" &&
    term.registrationStart === "2026-10-01" &&
    term.registrationEnd === "2026-11-15"
      ? { ...term, startDate: "2026-11-16" }
      : term;
  if (key === "kma-semester-dto-v3") return fixTerm(value);
  if (key === "kma-academic-terms-v1" && Array.isArray(value))
    return value.map(fixTerm);
  if (key !== "kma-dto-management-v3" || !Array.isArray(value?.classes))
    return value;
  return {
    ...value,
    classes: value.classes.map((row: any) => {
      const seed = moduleClassResponses.find(
        (s) =>
          s.id === row.id &&
          s.moduleClassCode === row.moduleClassCode &&
          s.semesterCode === row.semesterCode,
      );
      if (!seed || !Array.isArray(row.schedules)) return row;
      return {
        ...row,
        schedules: row.schedules.map((schedule: any) => {
          const original = seed.schedules.find(
            (s) =>
              s.id === schedule.id &&
              s.dayOfWeek === schedule.dayOfWeek &&
              s.lessonOrderStart === schedule.lessonOrderStart &&
              s.lessonOrderEnd === schedule.lessonOrderEnd,
          );
          if (
            !original ||
            schedule.startDate !== "2026-11-02" ||
            schedule.endDate !== "2027-01-31"
          )
            return schedule;
          const normalize = (code: string) =>
            code.replace(/^([A-Za-z]+)([0-9]+)$/, "$2-$1");
          const oldRoom =
            row.moduleClassCode === "INT1306.2"
              ? "201-A"
              : normalize(original.roomCode);
          if (normalize(schedule.roomCode ?? "") !== oldRoom) return schedule;
          return {
            ...schedule,
            startDate: "2026-11-16",
            ...(row.moduleClassCode === "INT1306.2"
              ? { roomCode: "201-B", buildingCode: "B", roomNumber: "201" }
              : {}),
          };
        }),
      };
    }),
  };
}
