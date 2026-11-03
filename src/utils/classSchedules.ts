import type { Course } from "../types/course";
import type { ClassScheduleResponse } from "../types/dto";
export { recurringOverlap as schedulesOverlap } from "./timetable";
export function scheduleEntries(courses: Course[], weekStart?: string) {
  return courses.flatMap((course) =>
    course.dto.schedules.flatMap((schedule) => {
      if (
        schedule.dayOfWeek == null ||
        schedule.lessonOrderStart == null ||
        schedule.lessonOrderEnd == null
      )
        return [];
      if (weekStart) {
        const date = new Date(weekStart + "T00:00:00Z");
        date.setUTCDate(date.getUTCDate() + schedule.dayOfWeek - 2);
        const day = date.toISOString().slice(0, 10);
        if (
          (schedule.startDate && day < schedule.startDate) ||
          (schedule.endDate && day > schedule.endDate)
        )
          return [];
      }
      return [
        {
          ...course,
          scheduleId: schedule.id,
          day: schedule.dayOfWeek,
          start: schedule.lessonOrderStart,
          end: schedule.lessonOrderEnd,
          room: schedule.roomCode,
        },
      ];
    }),
  );
}
