import type {
  SubjectResponse,
  ModuleClassResponse,
  StudentResponse,
  UserInfoResponse,
  EnrollmentResponse,
  UpdateSubjectRequest,
} from "../../types/dto";
export type ClassIdentity = Record<
  number,
  { lecturerId: number; roomType: string; changedAt?: string }
>;
export function normalizeSubjects(
  subjects: SubjectResponse[],
): SubjectResponse[] {
  const simple = (s: SubjectResponse) => ({
    id: s.id,
    subjectCode: s.subjectCode,
    subjectName: s.subjectName,
    credits: s.credits,
  });
  return subjects.map((s) => ({
    ...s,
    prerequisites: s.prerequisites
      .map((p) => subjects.find((x) => x.id === p.id))
      .filter((p): p is SubjectResponse => !!p)
      .map(simple),
    requiredBy: subjects
      .filter((x) => x.prerequisites.some((p) => p.id === s.id))
      .map(simple),
  }));
}
export function syncClasses(
  subjects: SubjectResponse[],
  classes: ModuleClassResponse[],
) {
  return classes.map((c) => {
    const s = subjects.find((s) => s.subjectCode === c.subjectCode);
    return s ? { ...c, subjectName: s.subjectName, credits: s.credits } : c;
  });
}
export function missingPrerequisites(
  subject: SubjectResponse | undefined,
  studentCode: string,
  results: EnrollmentResponse[],
) {
  const passed = new Set(
    results
      .filter(
        (r) =>
          r.studentCode === studentCode &&
          r.status === "COMPLETED" &&
          r.courseScoreLetter != null &&
          r.courseScoreLetter !== "F",
      )
      .map((r) => r.subjectCode),
  );
  return (
    subject?.prerequisites
      .filter((p) => !passed.has(p.subjectCode))
      .map((p) => `${p.subjectCode} · ${p.subjectName}`) ?? []
  );
}
// UC-10 (BF_UCS_and_IMAGESnew.pdf, pp. 78–79): reactivation restores login.
// Strip obsolete demo-only metadata without adding fields to the backend DTO.
function transitionDemoStudentAccount(
  user: UserInfoResponse,
  activate: boolean,
): UserInfoResponse {
  const { demoStatusBeforeDeactivation: _obsolete, ...account } =
    user as UserInfoResponse & { demoStatusBeforeDeactivation?: string };
  return { ...account, status: activate ? "ACTIVE" : "DISABLED" };
}
export function transitionStudent(
  student: StudentResponse,
  users: UserInfoResponse[],
  activate: boolean,
  reason: string,
) {
  if (student.activityStatus === "DELETED")
    throw Error("Hồ sơ đã xóa không được vô hiệu hóa hoặc tái kích hoạt.");
  if (!reason.trim()) throw Error("Vui lòng nhập lý do.");
  const account = users.find(
    (u) => u.username === student.studentCode && u.role === "STUDENT",
  );
  if (!account)
    throw Error(
      "Không tìm thấy tài khoản sinh viên liên kết. Chưa thay đổi trạng thái hồ sơ.",
    );
  return {
    student: {
      ...student,
      activityStatus: activate
        ? ("STUDYING" as const)
        : ("DEACTIVATED" as const),
      statusReason: reason.trim(),
    },
    users: users.map((u) =>
      u.id === account.id ? transitionDemoStudentAccount(u, activate) : u,
    ),
  };
}
export function updateSubjectModel(
  subject: SubjectResponse,
  request: UpdateSubjectRequest,
  hasGrades: boolean,
) {
  if (subject.status !== "ACTIVE")
    throw Error("Chỉ cập nhật học phần đang sử dụng.");
  if (request.subjectCode && request.subjectCode !== subject.subjectCode)
    throw Error("Không được thay đổi mã học phần.");
  if (request.credits !== subject.credits && hasGrades)
    throw Error(
      "Không thể đổi tín chỉ của học phần đã có điểm, kể cả các kỳ trước.",
    );
  return { ...subject, ...request };
}
export function pageIndex(index: number, total: number, size = 10) {
  return Math.min(Math.max(0, index), Math.max(0, Math.ceil(total / size) - 1));
}
export function studentScheduleConflicts(
  classes: ModuleClassResponse[],
  target: ModuleClassResponse,
  schedule: import("../../types/dto").ClassScheduleResponse,
  registrations: Record<string, string[]>,
  overlap: (
    a: import("../../types/dto").ClassScheduleResponse,
    b: import("../../types/dto").ClassScheduleResponse,
  ) => boolean,
) {
  return Object.entries(registrations)
    .filter(([, codes]) => codes.includes(target.moduleClassCode))
    .flatMap(([student, codes]) =>
      classes
        .filter(
          (c) =>
            c.id !== target.id &&
            c.status !== "CANCELLED" &&
            codes.includes(c.moduleClassCode) &&
            c.schedules.some((s) => overlap(s, schedule)),
        )
        .map((c) => `${student}: ${c.moduleClassCode}`),
    );
}
