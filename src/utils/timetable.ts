import type {
  ClassScheduleResponse,
  ModuleClassResponse,
  SemesterResponse,
} from "../types/dto";
export function validDate(day: string | null | undefined): day is string {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(day + "T00:00:00Z");
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day
  );
}
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export function addDays(day: string, amount: number) {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + amount);
  return isoDay(d);
}
export function monday(day: string) {
  const d = new Date(day + "T00:00:00Z");
  return addDays(day, -(d.getUTCDay() + 6) % 7);
}
export function termWeeks(
  term?: Pick<SemesterResponse, "startDate" | "endDate">,
) {
  if (!term?.startDate || !term.endDate || term.startDate > term.endDate)
    return [];
  const weeks: string[] = [];
  for (
    let day = monday(term.startDate);
    day <= term.endDate;
    day = addDays(day, 7)
  )
    weeks.push(day);
  return weeks;
}
export function occursOn(s: ClassScheduleResponse, date: string) {
  const day = new Date(date + "T00:00:00Z").getUTCDay();
  return (
    s.dayOfWeek === (day === 0 ? 8 : day + 1) &&
    !!s.startDate &&
    !!s.endDate &&
    date >= s.startDate &&
    date <= s.endDate
  );
}
export function weeklyClasses(
  classes: ModuleClassResponse[],
  week: string,
  term: SemesterResponse,
) {
  return classes
    .filter(
      (c) => c.status !== "CANCELLED" && c.semesterCode === term.semesterCode,
    )
    .flatMap((c) =>
      c.schedules.flatMap((s) => {
        if (
          s.dayOfWeek == null ||
          s.dayOfWeek < 2 ||
          s.dayOfWeek > 8 ||
          !s.lessonOrderStart ||
          !s.lessonOrderEnd
        )
          return [];
        const date = addDays(week, s.dayOfWeek - 2);
        return occursOn(s, date) &&
          (!term.startDate || date >= term.startDate) &&
          (!term.endDate || date <= term.endDate)
          ? [{ c, s, date }]
          : [];
      }),
    );
}
/** Date ranges overlap only when the common range contains the scheduled weekday. */
export function recurringOverlap(
  a: ClassScheduleResponse,
  b: ClassScheduleResponse,
) {
  if (
    a.dayOfWeek == null ||
    a.dayOfWeek !== b.dayOfWeek ||
    a.lessonOrderStart == null ||
    a.lessonOrderEnd == null ||
    b.lessonOrderStart == null ||
    b.lessonOrderEnd == null ||
    a.lessonOrderStart > b.lessonOrderEnd ||
    b.lessonOrderStart > a.lessonOrderEnd
  )
    return false;
  const from = [a.startDate, b.startDate]
    .filter((s): s is string => !!s)
    .sort()
    .slice(-1)[0];
  const to = [a.endDate, b.endDate].filter((s): s is string => !!s).sort()[0];
  if (!from || !to) return true;
  if (from > to) return false;
  const weekday = new Date(from + "T00:00:00Z").getUTCDay();
  const offset = ((a.dayOfWeek === 8 ? 0 : a.dayOfWeek - 1) - weekday + 7) % 7;
  return addDays(from, offset) <= to;
}
