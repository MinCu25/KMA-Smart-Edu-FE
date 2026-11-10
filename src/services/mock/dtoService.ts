import { createId } from "../../utils/id";
import type {
  ApiResponse,
  CreateStudentRequest,
  UpdateStudentRequest,
  StudentResponse,
  RegisterModuleClassRequest,
  RegistrationResult,
  EnrollmentResponse,
  UpdateProcessScoreRequest,
  LoginRequest,
  LoginResponse,
  ChatRequest,
  ChatResponse,
} from "../../types/dto";
import {
  administrativeClasses,
  moduleClassResponses,
  studentResponses,
  userResponses,
} from "../../data/mock/dtoFixtures";
export const success = <T>(data: T): ApiResponse<T> => ({
  success: true,
  message: "Success",
  data,
  timestamp: new Date().toISOString(),
});
export function createStudent(
  request: CreateStudentRequest & { trainingType?: string },
  existing: StudentResponse[],
  catalog = administrativeClasses,
): StudentResponse {
  if (
    !request.fullName.trim() ||
    !request.majorId ||
    !request.cohortId ||
    !request.administrativeClassId
  )
    throw new Error("Thiếu thông tin bắt buộc.");
  const cls = catalog.find((c) => c.id === request.administrativeClassId);
  if (!cls) throw new Error("Lớp hành chính không tồn tại.");
  if (
    request.majorId !== 1 ||
    request.cohortId !== (cls.cohortCode === "K2026" ? 1 : 2)
  )
    throw new Error("Lớp không thuộc ngành / khóa đã chọn.");
  const citizenId = (request.citizenId ?? "").replace(/\s/g, "");
  if (!/^\d{12}$/.test(citizenId))
    throw new Error("CCCD phải có đúng 12 chữ số.");
  if (
    existing.some(
      (s) => s.activityStatus !== "DELETED" && s.citizenId === citizenId,
    )
  )
    throw new Error("CCCD đã tồn tại.");
  if (
    request.dateOfBirth &&
    request.dateOfBirth >= new Date().toLocaleDateString("sv-SE")
  )
    throw new Error("Ngày sinh phải trong quá khứ.");
  if (request.trainingType && request.trainingType !== cls.trainingType)
    throw new Error("Hệ đào tạo không khớp lớp.");
  if (!request.reason?.trim() || request.reason.trim().length > 500)
    throw new Error("Vui lòng nhập lý do tối đa 500 ký tự.");
  const classMatch = /^(?:[A-Z]+)(\d+)([A-Z]+)$/.exec(cls.className);
  if (!classMatch) throw new Error("Lớp chưa có cấu hình cấp MSSV phù hợp.");
  const cohortSequence = Number(classMatch[1]);
  const classSequence = [...classMatch[2]].reduce(
    (value, c) => value * 26 + c.charCodeAt(0) - 64,
    0,
  );
  if (cohortSequence < 1 || cohortSequence > 99 || classSequence > 99)
    throw new Error("Mã khóa hoặc lớp vượt giới hạn 99.");
  const prefix =
    cls.majorCode +
    String(cohortSequence).padStart(2, "0") +
    String(classSequence).padStart(2, "0");
  const sequence =
    Math.max(
      0,
      ...existing
        .filter((s) => s.className === cls.className)
        .map((s) => Number(s.studentCode.slice(-2)) || 0),
    ) + 1;
  if (sequence > 99) throw new Error("Lớp đã hết số thứ tự cấp MSSV.");
  const id = Math.max(0, ...existing.map((s) => s.id)) + 1;
  return {
    id,
    studentCode: prefix + String(sequence).padStart(2, "0"),
    fullName: request.fullName.trim(),
    dateOfBirth: request.dateOfBirth ?? null,
    email: request.email ?? "",
    phone: request.phone ?? "",
    majorName: cls.majorName,
    cohortCode: cls.cohortCode,
    className: cls.className,
    trainingType: cls.trainingType,
    entranceScore: request.entranceScore ?? null,
    citizenId,
    targetGpa: null,
    activityStatus: "STUDYING",
    academicWarningStatus: "Chưa có cảnh báo",
    statusReason: request.reason ?? "",
    createdAt: new Date().toISOString(),
  };
}
export function updateStudent(
  existing: StudentResponse,
  request: Omit<UpdateStudentRequest, "targetGpa"> & {
    targetGpa?: number | null;
  },
  self = false,
): StudentResponse {
  const allowed = self
    ? ["email", "phone", "targetGpa"]
    : [
        "fullName",
        "dateOfBirth",
        "email",
        "phone",
        "citizenId",
        "targetGpa",
        "statusReason",
      ];
  for (const key of Object.keys(request))
    if (!allowed.includes(key))
      throw new Error("Trường không được phép cập nhật: " + key);
  const fields = Object.fromEntries(
    Object.entries(request).filter(
      ([, value]) => value !== undefined && (self || value !== null),
    ),
  );
  if (
    fields.targetGpa != null &&
    (Number(fields.targetGpa) < 0 ||
      Number(fields.targetGpa) > 4 ||
      Math.abs(
        Number(fields.targetGpa) * 100 -
          Math.round(Number(fields.targetGpa) * 100),
      ) > 1e-8)
  )
    throw new Error("GPA phải từ 0 đến 4, tối đa hai chữ số thập phân.");
  if (typeof fields.email === "string")
    fields.email = fields.email.trim().toLowerCase();
  if (typeof fields.citizenId === "string") {
    fields.citizenId = fields.citizenId.replace(/\s/g, "");
    if (!/^\d{12}$/.test(fields.citizenId as string))
      throw new Error("CCCD phải có đúng 12 chữ số.");
  }
  return { ...existing, ...fields } as StudentResponse;
}
const enrollmentIds = new Map<string, number>();
let nextEnrollmentId = 50001;
export function enrollmentFor(
  moduleClassId: number,
  student = studentResponses[0],
  catalog = moduleClassResponses,
): EnrollmentResponse {
  const c = catalog.find((c) => c.id === moduleClassId);
  if (!c) throw new Error("Không tìm thấy lớp học phần.");
  const key = `${student.id}:${c.id}`;
  if (!enrollmentIds.has(key)) enrollmentIds.set(key, nextEnrollmentId++);
  return {
    id: enrollmentIds.get(key)!,
    studentId: student.id,
    studentCode: student.studentCode,
    studentName: student.fullName,
    moduleClassId: c.id,
    moduleClassCode: c.moduleClassCode,
    subjectCode: c.subjectCode,
    subjectName: c.subjectName,
    credits: c.credits,
    registeredAt: new Date().toISOString(),
    status: "REGISTERED",
    componentScore1: null,
    componentScore2: null,
    processScore: null,
    finalExamScore: null,
    courseScore10: null,
    courseScoreLetter: null,
    courseScore4: null,
  };
}
export function registerModule(
  request: RegisterModuleClassRequest,
): ApiResponse<RegistrationResult> {
  return success({
    success: true,
    message: "Đã đăng ký.",
    enrollment: enrollmentFor(request.moduleClassId),
  });
}
export function updateProcessScore(
  request: UpdateProcessScoreRequest,
): ApiResponse<UpdateProcessScoreRequest> {
  if (!Number.isSafeInteger(request.enrollmentId))
    throw new Error("Thiếu ID đăng ký.");
  for (const score of [request.componentScore1, request.componentScore2])
    if (score != null && (!Number.isFinite(score) || score < 0 || score > 10))
      throw new Error("Điểm phải từ 0 đến 10.");
  return success(request);
}
export function loginDemo(request: LoginRequest): ApiResponse<LoginResponse> {
  const user = userResponses.find((user) => user.username === request.username);
  if (!user || request.password !== "demo123")
    throw new Error("Tên đăng nhập hoặc mật khẩu không đúng.");
  return success({
    accessToken: "demo-only",
    refreshToken: "demo-only",
    tokenType: "Bearer",
    expiresIn: 3600,
    user,
    requirePasswordChange: false,
  });
}
export function chatReply(request: ChatRequest, content: string): ChatResponse {
  if (!request.message.trim() || request.message.length > 2000)
    throw new Error("Tin nhắn phải từ 1 đến 2000 ký tự.");
  return {
    sessionId: request.sessionId ?? createId(),
    messageId: createId(),
    content,
    intent: /gpa|tốt nghiệp/i.test(request.message)
      ? "GRADUATION"
      : "KNOWLEDGE",
    citations: [],
    scenario: null,
  };
}
export function changePasswordDemo(
  request: import("../../types/dto").ChangePasswordRequest,
) {
  if (request.newPassword.length < 8)
    throw new Error("Mật khẩu mới phải có ít nhất 8 ký tự.");
  if (request.newPassword !== request.confirmPassword)
    throw new Error("Xác nhận mật khẩu không khớp.");
  return success(undefined);
}
