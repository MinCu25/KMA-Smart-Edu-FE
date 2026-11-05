/** HTTP contract verified against develop 8253c0e. Base URL is the BE origin
 * (or reverse-proxy prefix), not /api/v1. This client never falls back to mocks.
 * UI data sources must be switched as a whole after missing endpoints are supplied.
 */
import type * as D from "../../types/dto";
import { apiRequest, ApiError } from "./httpClient";
import { semesterFormName } from "../../utils/semesterValidation";
export function semesterWireName(display: string) {
  const value = semesterFormName(display);
  const m = /^HK_([1-9][0-9]*) - (\d{4})-(\d{4})$/.exec(value);
  if (!m || Number(m[3]) !== Number(m[2]) + 1)
    throw Error("Tên kỳ học không hợp lệ.");
  return `Học kì ${m[1]} năm học ${m[2]}-${m[3]}`;
}
export function semesterBody(
  value: D.CreateSemesterRequest,
): D.CreateSemesterRequest {
  return {
    semesterName: semesterWireName(value.semesterName),
    startDate: value.startDate,
    endDate: value.endDate,
    registrationStart: value.registrationStart,
    registrationEnd: value.registrationEnd,
  };
}
function id(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw Error("ID không hợp lệ.");
  return value;
}
function query(input: object, allowed: string[]) {
  const result = new URLSearchParams();
  for (const key of allowed) {
    const value = (input as Record<string, unknown>)[key];
    if (value !== undefined && value !== null && value !== "")
      result.set(key, String(value));
  }
  return result.size ? `?${result}` : "";
}
export function createEduApi(options: {
  getAccessToken: () => string | undefined;
  onUnauthorized?: () => void;
}) {
  async function call<T>(
    path: string,
    method = "GET",
    body?: unknown,
    authenticated = true,
  ) {
    const token = authenticated ? options.getAccessToken() : undefined;
    if (authenticated && !token)
      throw new ApiError("Vui lòng đăng nhập lại.", 401);
    try {
      return await apiRequest<T>(
        `/api/v1${path}`,
        {
          method,
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
        token,
      );
    } catch (e) {
      if (
        e instanceof ApiError &&
        e.status === 401 &&
        e.code !== 4003 &&
        authenticated
      )
        options.onUnauthorized?.();
      throw e;
    }
  }
  async function data<T>(
    path: string,
    method = "GET",
    body?: unknown,
    authenticated = true,
  ): Promise<T> {
    const result = await call<T>(path, method, body, authenticated);
    if (result === undefined || result === null)
      throw new ApiError("Backend chưa trả dữ liệu cần thiết.", 502);
    return result;
  }
  const pageKeys = ["page", "size"];
  return {
    auth: {
      login: (r: D.LoginRequest) =>
        data<D.LoginResponse>(
          "/auth/login",
          "POST",
          { username: r.username, password: r.password },
          false,
        ),
      logout: (r: D.LogoutRequest) =>
        call<void>("/auth/logout", "POST", { refreshToken: r.refreshToken }),
      changePassword: (r: D.ChangePasswordRequest) =>
        call<void>("/auth/change-password", "POST", {
          currentPassword: r.currentPassword ?? null,
          newPassword: r.newPassword,
          confirmPassword: r.confirmPassword,
        }),
    },
    users: {
      search: (r: {
        keyword?: string;
        page?: number;
        size?: number;
        role?: string;
        status?: string;
      }) => {
        if (r.role || r.status)
          throw Error(
            "API hiện chưa hỗ trợ lọc tài khoản theo vai trò/trạng thái. Không lọc trên một trang dữ liệu.",
          );
        return data<D.PageResponse<D.UserInfoResponse>>(
          "/admin/users" + query(r, ["keyword", ...pageKeys]),
        );
      },
      lock: (userId: number, reason: string) =>
        call<void>(`/admin/users/${id(userId)}/lock`, "POST", { reason }),
      unlock: (userId: number) =>
        call<void>(`/admin/users/${id(userId)}/unlock`, "POST"),
      resetPassword: (userId: number) =>
        call<void>(`/admin/users/${id(userId)}/reset-password`, "POST"),
    },
    students: {
      me: () =>
        data<import("./backendContract").StudentResponse>("/students/me"),
      search: (r: D.StudentSearchRequest & { page?: number; size?: number }) =>
        data<D.PageResponse<D.StudentResponse>>(
          "/students" +
            query(r, [
              "keyword",
              "majorId",
              "cohortId",
              "classId",
              "activityStatus",
              "academicWarningStatus",
              ...pageKeys,
            ]),
        ),
      detail: (studentId: number) =>
        data<D.StudentResponse>(`/students/${id(studentId)}`),
      update: (studentId: number, r: D.UpdateStudentRequest) =>
        data<D.StudentResponse>(`/students/${id(studentId)}`, "PUT", {
          studentCode: r.studentCode,
          fullName: r.fullName,
          dateOfBirth: r.dateOfBirth,
          email: r.email,
          phone: r.phone,
          citizenId: r.citizenId,
          administrativeClassId: r.administrativeClassId,
          targetGpa: r.targetGpa,
          academicWarningStatus: r.academicWarningStatus,
          statusReason: r.statusReason,
        }),
    },
    lecturers: {
      search: (r: D.LecturerSearchRequest & { page?: number; size?: number }) =>
        data<D.PageResponse<D.LecturerResponse>>(
          "/lecturers" +
            query(r, [
              "keyword",
              "lecturerCode",
              "fullName",
              "facultyId",
              "status",
              ...pageKeys,
            ]),
        ),
      detail: (lecturerId: number) =>
        data<D.LecturerResponse>(`/lecturers/${id(lecturerId)}`),
    },
    subjects: {
      search: (r: D.SubjectSearchRequest) =>
        data<D.PageResponse<D.SubjectResponse>>(
          "/subjects" +
            query(r, [
              "keyword",
              "subjectCode",
              "subjectName",
              "credits",
              "status",
              "withoutPrerequisites",
              ...pageKeys,
            ]),
        ),
      detail: (subjectId: number) =>
        data<D.SubjectResponse>(`/subjects/${id(subjectId)}`),
      create: (r: D.CreateSubjectRequest) =>
        data<D.SubjectResponse>("/subjects", "POST", {
          subjectCode: r.subjectCode,
          subjectName: r.subjectName,
          credits: r.credits,
          description: r.description,
        }),
      update: (subjectId: number, r: D.UpdateSubjectRequest) =>
        data<D.SubjectResponse>(`/subjects/${id(subjectId)}`, "PUT", {
          subjectCode: r.subjectCode,
          subjectName: r.subjectName,
          credits: r.credits,
          description: r.description,
        }),
      deactivate: (subjectId: number, r: D.SubjectActionRequest) =>
        data<D.SubjectResponse>(
          `/subjects/${id(subjectId)}/deactivate`,
          "POST",
          { reason: r.reason, confirmed: r.confirmed },
        ),
      remove: (subjectId: number, r: D.SubjectActionRequest) =>
        call<void>(`/subjects/${id(subjectId)}`, "DELETE", {
          reason: r.reason,
          confirmed: r.confirmed,
        }),
      prerequisites: (subjectId: number, r: D.SetPrerequisiteRequest) =>
        data<D.SubjectResponse>(
          `/subjects/${id(subjectId)}/prerequisites`,
          "POST",
          { prerequisiteSubjectIds: r.prerequisiteSubjectIds },
        ),
    },
    semesters: {
      search: (r: D.SemesterSearchRequest) =>
        data<D.PageResponse<D.SemesterResponse>>(
          "/semesters" + query(r, ["keyword", "status", ...pageKeys]),
        ),
      detail: (semesterId: number) =>
        data<D.SemesterResponse>(`/semesters/${id(semesterId)}`),
      create: (r: D.CreateSemesterRequest) =>
        data<D.SemesterResponse>("/semesters", "POST", semesterBody(r)),
      update: (semesterId: number, r: D.UpdateSemesterRequest) =>
        data<D.SemesterResponse>(`/semesters/${id(semesterId)}`, "PUT", {
          ...semesterBody(r),
          confirmDateChange: r.confirmDateChange,
        }),
    },
    classes: {
      search: (r: D.ModuleClassSearchRequest) =>
        data<D.PageResponse<D.ModuleClassResponse>>(
          "/module-classes" +
            query(r, [
              "semesterId",
              "subjectId",
              "lecturerId",
              "status",
              "keyword",
              ...pageKeys,
            ]),
        ),
      detail: (classId: number) =>
        data<D.ModuleClassResponse>(`/module-classes/${id(classId)}`),
      openingSubjects: (semesterId: number) =>
        data<D.OpeningSubjectResponse[]>(
          `/semesters/${id(semesterId)}/opening-subjects`,
        ),
      createBatch: (semesterId: number, r: D.CreateModuleClassesRequest) =>
        data<D.ModuleClassResponse[]>(
          `/semesters/${id(semesterId)}/module-classes/batch`,
          "POST",
          {
            subjects: r.subjects.map((s) => ({
              subjectId: s.subjectId,
              confirmAdditionalClasses: s.confirmAdditionalClasses,
              classes: s.classes.map((c) => ({ maxCapacity: c.maxCapacity })),
            })),
          },
        ),
      update: (classId: number, r: D.UpdateModuleClassRequest) =>
        data<D.ModuleClassResponse>(`/module-classes/${id(classId)}`, "PATCH", {
          maxCapacity: r.maxCapacity,
          reason: r.reason,
        }),
      cancel: (classId: number, r: D.CancelModuleClassRequest) =>
        data<D.ModuleClassResponse>(
          `/module-classes/${id(classId)}/cancel`,
          "POST",
          { reason: r.reason },
        ),
    },
  };
}
