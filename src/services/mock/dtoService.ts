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
  request: CreateStudentRequest,
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
  const id = Math.max(0, ...existing.map((s) => s.id)) + 1;
  return {
    id,
    studentCode: `CT${cls.cohortCode.replace("K", "")}${String(id).padStart(5, "0")}`,
    fullName: request.fullName.trim(),
    dateOfBirth: request.dateOfBirth ?? null,
    email: request.email ?? "",
    phone: request.phone ?? "",
    majorName: cls.majorName,
    cohortCode: cls.cohortCode,
    className: cls.className,
    trainingType: cls.trainingType,
    entranceScore: request.entranceScore ?? null,
    citizenId: request.citizenId ?? null,
    targetGpa: null,
    activityStatus: "STUDYING",
    academicWarningStatus: "Chưa có cảnh báo",
    statusReason: request.reason ?? "",
    createdAt: new Date().toISOString(),
  };
}
export function updateStudent(
  existing: StudentResponse,
  request: UpdateStudentRequest,
): StudentResponse {
  const cls = administrativeClasses.find(
    (c) => c.id === request.administrativeClassId,
  );
  const { administrativeClassId, ...fields } = request;
  return {
    ...existing,
    ...fields,
    ...(cls ? { className: cls.className } : {}),
  };
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
