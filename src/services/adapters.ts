import type { ModuleClassResponse, StudentResponse } from "../types/dto";
import type { Student } from "../types/student";
import type { Course } from "../types/course";
import { demoMissingPrerequisites } from "../data/mock/dtoFixtures";
export function studentView(dto: StudentResponse): Student {
  return {
    dto,
    id: dto.studentCode,
    name: dto.fullName,
    className: dto.className,
    major: dto.majorName,
    cohort: dto.cohortCode,
    status:
      dto.activityStatus === "STUDYING"
        ? "Đang hoạt động"
        : dto.activityStatus === "DELETED"
          ? "Đã xóa"
          : "Ngừng hoạt động",
  };
}
export function courseView(dto: ModuleClassResponse): Course {
  const schedule = dto.schedules[0];
  return {
    dto,
    id: dto.moduleClassCode,
    name: dto.subjectName,
    credits: dto.credits,
    teacher: dto.lecturerName ?? "Chưa phân công",
    day: schedule?.dayOfWeek ?? 2,
    start: schedule?.lessonOrderStart ?? 0,
    end: schedule?.lessonOrderEnd ?? 0,
    room: schedule?.roomCode ?? "Chưa xếp phòng",
    seats: dto.currentSize,
    capacity: dto.maxCapacity,
    missing: demoMissingPrerequisites[dto.id],
  };
}
