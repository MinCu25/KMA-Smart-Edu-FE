/**
 * EduHub — hợp đồng FE theo source ngày 2026-11-04.
 * 38 endpoint nghiệp vụ / 8 controller. Đọc FE_API_INTEGRATION.md trước khi dùng.
 * URL đã chứa /api/v1; chỉ ghép thêm origin, ví dụ http://localhost:8080.
 * Không bao gồm API chưa có controller (refresh, enrollment, academic, AI...).
 * Kiểu TypeScript không thay thế validation runtime; ràng buộc xem tài liệu đi kèm.
 */

export type Id = number;
export type UUID = string;
export type LocalDateString = string; // yyyy-MM-dd; giữ nguyên chuỗi, không đổi timezone.
export type UtcLocalDateTimeString = string; // yyyy-MM-ddTHH:mm:ss[.fraction], không có Z.

export type RoleName = "STUDENT" | "LECTURER" | "ACADEMIC_ADMIN" | "SYSTEM_ADMIN";
export type UserStatus = "ACTIVE" | "LOCKED" | "DISABLED";
export type TrainingType = "CHINH_QUY" | "LIEN_THONG" | "VAN_BANG_2";
export type ActivityStatus = "STUDYING" | "DEACTIVATED" | "DELETED";
export type LecturerStatus = "ACTIVE" | "INACTIVE";
export type AccountNotificationStatus = "PENDING" | "SENT" | "FAILED";
export type SubjectStatus = "ACTIVE" | "INACTIVE";
export type SemesterStatus = "UPCOMING" | "ONGOING" | "ENDED";
export type ModuleClassStatus = "UNSCHEDULED" | "SCHEDULED" | "OPEN" | "CANCELLED";

export interface FieldErrorDetail {
  field: string;
  message: string;
}

export type ApiSuccess<T> = {
  success: true;
  message: string;
  timestamp: UtcLocalDateTimeString;
} & ([T] extends [void] ? { data?: never } : { data: T });

export interface ApiFailure {
  success: false;
  code: number; // mã nghiệp vụ, khác HTTP status.
  message: string;
  path: string;
  timestamp: UtcLocalDateTimeString;
  errors?: FieldErrorDetail[];
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean; // JSON là last, Java field là isLast.
}

export interface PageQuery {
  page?: number; // mặc định 0, >= 0.
  size?: number; // mặc định 20, >= 1.
}

// Identity
export interface LoginRequest {
  username: string;
  password: string;
}

export interface UserInfoResponse {
  id: Id; // User ID, không phải Student/Lecturer ID.
  username: string;
  email: string | null; // login hiện không map email; admin search có map.
  role: RoleName;
  fullName: string | null; // các mapper hiện chưa điền.
  firstLogin: boolean; // JSON là firstLogin, Java field là isFirstLogin.
  status: UserStatus;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string; // dùng cho logout; chưa có HTTP endpoint refresh.
  tokenType: "Bearer";
  expiresIn: number; // giây; hiện 900.
  user: UserInfoResponse;
  requirePasswordChange: boolean;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword?: string | null; // bắt buộc nghiệp vụ nếu không phải first login.
  newPassword: string;
  confirmPassword: string;
}

export interface AdminUserSearchQuery extends PageQuery {
  keyword?: string; // username, mặc định "".
}

// Tên record thực sự trong AdminUserController; không dùng LockUserRequest.
export interface LockBody {
  reason: string;
}

// People — sinh viên
export interface StudentSearchQuery extends PageQuery {
  keyword?: string;
  majorId?: Id;
  cohortId?: Id;
  classId?: Id; // khác tên administrativeClassId ở body tạo/sửa.
  activityStatus?: ActivityStatus;
  academicWarningStatus?: string; // chưa có enum/range được BE công bố.
}

export interface StudentResponse {
  id: Id;
  studentCode: string;
  fullName: string;
  dateOfBirth: LocalDateString | null;
  email: string | null;
  phone: string | null;
  citizenId: string | null;
  majorName: string | null;
  cohortCode: string | null;
  className: string | null;
  trainingType: TrainingType | null;
  entranceScore: number | null;
  targetGpa: number | null;
  activityStatus: ActivityStatus;
  academicWarningStatus: string | null;
  academicWarningReason: string | null;
  statusReason: string | null; // mapper hiện chưa điền => null.
  createdAt: UtcLocalDateTimeString | null;
}

export interface CreateStudentRequest {
  fullName: string;
  dateOfBirth?: LocalDateString | null;
  gender?: string | null;
  email: string;
  phone?: string | null;
  citizenId?: string | null;
  majorId: Id;
  cohortId: Id;
  administrativeClassId: Id;
  trainingType: TrainingType;
  entranceScore?: number | null;
  reason: string;
}

export interface CreateStudentResponse {
  student: StudentResponse;
  warnings: string[];
  notificationStatus: AccountNotificationStatus;
  notificationError: string | null;
}

export interface AccountNotificationResponse {
  studentId: Id;
  studentCode: string;
  notificationStatus: AccountNotificationStatus;
  notificationError: string | null;
}

export interface UpdateStudentRequest {
  // Không gửi studentCode: mọi giá trị non-null đều bị từ chối.
  fullName?: string | null;
  dateOfBirth?: LocalDateString | null;
  email?: string | null;
  phone?: string | null;
  citizenId?: string | null;
  administrativeClassId?: Id | null;
  targetGpa?: number | null; // endpoint quản trị hiện chỉ kiểm tra >= 0.
  academicWarningStatus?: string | null;
  academicWarningReason?: string | null;
  statusReason?: string | null; // chỉ dùng log, chưa được lưu vào hồ sơ.
}

export interface UpdateMyStudentProfileRequest {
  targetGpa?: number | null; // 0..4; null xóa; bỏ field giữ nguyên.
  phone?: string | null; // tối đa 255; null xóa; bỏ field giữ nguyên.
  // Mọi field ngoài hai field này bị BE từ chối.
}

// People — nhập học Excel
// Preview: FormData.append("file", file); không tự set Content-Type.
export interface AdmissionClassAdjustmentRequest {
  applicationCode: string;
  targetClassId: Id;
}

export interface AdmissionConfirmRequest {
  actor?: string | null; // source nhận từ body cho audit; nên gửi username hiện tại.
  acceptMinimumCapacityWarning?: boolean; // mặc định false.
}

export interface AdmissionErrorResponse {
  rowNumber: number; // dòng Excel, tính từ 1.
  applicationCode: string | null;
  field: string;
  reason: string; // khác errors[].message của ApiFailure.
}

export interface AdmissionStudentPreview {
  rowNumber: number;
  applicationCode: string;
  fullName: string;
  dateOfBirth: LocalDateString;
  gender: string;
  email: string;
  entranceScore: number;
  majorCode: string;
  cohortCode: string;
  trainingType: string; // giá trị gốc từ file, có thể khác hoa/thường; BE validate bằng uppercase.
  assignedClassId: Id;
  assignedClassName: string;
}

export interface AdmissionClassPreview {
  classId: Id;
  className: string;
  currentSize: number;
  projectedSize: number;
  minCapacity: number;
  maxCapacity: number;
  projectedAverageEntranceScore: number;
  students: AdmissionStudentPreview[];
}

export interface AdmissionPreviewResponse {
  batchId: UUID;
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number; // thực tế = errors.length; không phải số dòng lỗi distinct.
  classes: AdmissionClassPreview[];
  errors: AdmissionErrorResponse[];
  duplicateNameWarnings: string[];
  capacityWarnings: string[];
}

export interface AdmissionConfirmResponse {
  batchId: UUID;
  createdStudents: number;
  createdUsers: number;
  emailFailures: string[]; // mã hồ sơ applicationCode, không phải địa chỉ email.
}

// People — giảng viên
export interface LecturerSearchQuery extends PageQuery {
  keyword?: string;
  lecturerCode?: string;
  fullName?: string;
  facultyId?: Id;
  status?: LecturerStatus;
}

export interface LecturerResponse {
  id: Id;
  lecturerCode: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: LocalDateString | null;
  citizenId: string | null;
  facultyId: Id | null;
  accountNotificationStatus: AccountNotificationStatus | null;
  accountNotificationError: string | null;
  facultyName: string | null;
  status: LecturerStatus;
}

export interface CreateLecturerRequest {
  fullName: string;
  dateOfBirth: LocalDateString;
  email: string;
  phone?: string | null;
  citizenId?: string | null;
  facultyId: Id;
  reason: string;
}

export interface CreateLecturerResponse {
  lecturer: LecturerResponse;
  warnings: string[];
  notificationStatus: AccountNotificationStatus;
  notificationError: string | null;
}

export interface LecturerNotificationResponse {
  lecturerId: Id;
  lecturerCode: string;
  notificationStatus: AccountNotificationStatus;
  notificationError: string | null;
}

// Curriculum — học phần
export interface SubjectSearchQuery extends PageQuery {
  keyword?: string;
  subjectCode?: string;
  subjectName?: string;
  credits?: number;
  status?: SubjectStatus;
  withoutPrerequisites?: boolean;
}

export interface SubjectSimpleResponse {
  id: Id;
  subjectCode: string;
  subjectName: string;
  credits: number;
}

export interface SubjectResponse extends SubjectSimpleResponse {
  description: string | null;
  status: SubjectStatus;
  prerequisites: SubjectSimpleResponse[];
  requiredBy: SubjectSimpleResponse[];
}

export interface CreateSubjectRequest {
  subjectCode: string;
  subjectName: string;
  credits: number;
  description?: string | null;
}

export interface UpdateSubjectRequest {
  subjectCode?: string | null; // bỏ field hoặc giữ đúng mã cũ.
  subjectName: string;
  credits: number;
  description?: string | null; // bỏ field cũng được lưu thành null.
}

export interface SubjectActionRequest {
  reason: string;
  confirmed: boolean; // phải true để thực hiện.
}

export interface SetPrerequisiteRequest {
  prerequisiteSubjectIds: Id[]; // thay thế toàn bộ; [] gỡ hết.
}

// Scheduling — kỳ học
export interface SemesterSearchQuery extends PageQuery {
  keyword?: string;
  status?: SemesterStatus;
}

export interface SemesterResponse {
  id: Id;
  semesterCode: string;
  semesterName: string;
  startDate: LocalDateString;
  endDate: LocalDateString;
  registrationStart: LocalDateString;
  registrationEnd: LocalDateString;
  status: SemesterStatus;
  isLocked: boolean; // giữ nguyên isLocked (Java là Boolean, không phải boolean).
  lockedGrade: boolean;
}

export interface CreateSemesterRequest {
  semesterName: string;
  startDate: LocalDateString;
  endDate: LocalDateString;
  registrationStart: LocalDateString;
  registrationEnd: LocalDateString;
}

export interface UpdateSemesterRequest extends CreateSemesterRequest {
  confirmDateChange?: boolean;
}

// Scheduling — lớp học phần
export interface ModuleClassSearchQuery extends PageQuery {
  keyword?: string; // chỉ mã lớp học phần.
  semesterId?: Id;
  subjectId?: Id;
  lecturerId?: Id;
  status?: ModuleClassStatus;
}

export interface ClassScheduleResponse {
  id: Id;
  moduleClassId: Id;
  roomCode: string | null;
  buildingCode: string | null;
  roomNumber: string | null;
  dayOfWeek: number; // 2..8.
  lessonOrderStart: number;
  lessonOrderEnd: number;
  startDate: LocalDateString | null;
  endDate: LocalDateString | null;
}

export interface ModuleClassResponse {
  id: Id;
  semesterId: Id;
  subjectId: Id;
  lecturerId: Id | null;
  classSequence: number;
  dataSource: string; // hiện "DATABASE".
  moduleClassCode: string;
  subjectCode: string | null;
  subjectName: string | null;
  credits: number;
  lecturerName: string | null;
  semesterCode: string;
  maxCapacity: number;
  currentSize: number;
  status: ModuleClassStatus;
  schedules: ClassScheduleResponse[]; // mapper hiện luôn trả [].
}

export interface OpeningSubjectResponse {
  subjectId: Id;
  subjectCode: string;
  subjectName: string;
  credits: number;
  onTimeStudentCount: number;
  retakeStudentCount: number;
  missedStudentCount: number;
  expectedStudentCount: number;
  recommendedClassCount: number;
  existingClassCount: number;
  dataSource: string;
  historyComplete: boolean;
}

export interface CreateModuleClassRequest {
  maxCapacity?: number; // JSON integer 1..80; bỏ field mặc định 80; null bị từ chối.
}

export interface SubjectClassesRequest {
  subjectId: Id;
  confirmAdditionalClasses?: boolean; // mặc định false, theo từng subject.
  classes: CreateModuleClassRequest[]; // không rỗng.
}

export interface CreateModuleClassesRequest {
  subjects: SubjectClassesRequest[]; // không rỗng, không lặp subjectId.
}

export interface UpdateModuleClassRequest {
  maxCapacity: number;
  reason: string;
}

export interface CancelModuleClassRequest {
  reason: string;
}

/** Method + URL; query truyền riêng bằng URLSearchParams; body theo tài liệu. */
export const API_PREFIX = "/api/v1";
export const ENDPOINTS = {
  authLogin: { method: "POST", url: `${API_PREFIX}/auth/login` },
  authLogout: { method: "POST", url: `${API_PREFIX}/auth/logout` },
  authChangePassword: { method: "POST", url: `${API_PREFIX}/auth/change-password` },
  adminUsersSearch: { method: "GET", url: `${API_PREFIX}/admin/users` },
  adminUserLock: { method: "POST", url: (userId: Id) => `${API_PREFIX}/admin/users/${userId}/lock` },
  adminUserUnlock: { method: "POST", url: (userId: Id) => `${API_PREFIX}/admin/users/${userId}/unlock` },
  adminUserResetPassword: { method: "POST", url: (userId: Id) => `${API_PREFIX}/admin/users/${userId}/reset-password` },
  studentsSearch: { method: "GET", url: `${API_PREFIX}/students` },
  studentGet: { method: "GET", url: (id: Id) => `${API_PREFIX}/students/${id}` },
  studentCreate: { method: "POST", url: `${API_PREFIX}/students` },
  studentUpdate: { method: "PUT", url: (id: Id) => `${API_PREFIX}/students/${id}` },
  studentResendNotification: { method: "POST", url: (id: Id) => `${API_PREFIX}/students/${id}/account-notification/resend` },
  myStudentGet: { method: "GET", url: `${API_PREFIX}/students/me` },
  myStudentUpdate: { method: "PATCH", url: `${API_PREFIX}/students/me` },
  admissionPreview: { method: "POST", url: `${API_PREFIX}/students/admission/preview` },
  admissionAdjustAssignment: { method: "PUT", url: (batchId: UUID) => `${API_PREFIX}/students/admission/${encodeURIComponent(batchId)}/assignment` },
  admissionConfirm: { method: "POST", url: (batchId: UUID) => `${API_PREFIX}/students/admission/${encodeURIComponent(batchId)}/confirm` },
  lecturersSearch: { method: "GET", url: `${API_PREFIX}/lecturers` },
  lecturerGet: { method: "GET", url: (id: Id) => `${API_PREFIX}/lecturers/${id}` },
  lecturerCreate: { method: "POST", url: `${API_PREFIX}/lecturers` },
  lecturerResendNotification: { method: "POST", url: (id: Id) => `${API_PREFIX}/lecturers/${id}/account-notification/resend` },
  subjectsSearch: { method: "GET", url: `${API_PREFIX}/subjects` },
  subjectGet: { method: "GET", url: (id: Id) => `${API_PREFIX}/subjects/${id}` },
  subjectCreate: { method: "POST", url: `${API_PREFIX}/subjects` },
  subjectUpdate: { method: "PUT", url: (id: Id) => `${API_PREFIX}/subjects/${id}` },
  subjectDeactivate: { method: "POST", url: (id: Id) => `${API_PREFIX}/subjects/${id}/deactivate` },
  subjectDelete: { method: "DELETE", url: (id: Id) => `${API_PREFIX}/subjects/${id}` },
  subjectSetPrerequisites: { method: "POST", url: (id: Id) => `${API_PREFIX}/subjects/${id}/prerequisites` },
  semestersSearch: { method: "GET", url: `${API_PREFIX}/semesters` },
  semesterGet: { method: "GET", url: (id: Id) => `${API_PREFIX}/semesters/${id}` },
  semesterCreate: { method: "POST", url: `${API_PREFIX}/semesters` },
  semesterUpdate: { method: "PUT", url: (id: Id) => `${API_PREFIX}/semesters/${id}` },
  openingSubjects: { method: "GET", url: (semesterId: Id) => `${API_PREFIX}/semesters/${semesterId}/opening-subjects` },
  moduleClassesSearch: { method: "GET", url: `${API_PREFIX}/module-classes` },
  moduleClassGet: { method: "GET", url: (id: Id) => `${API_PREFIX}/module-classes/${id}` },
  moduleClassesCreateBatch: { method: "POST", url: (semesterId: Id) => `${API_PREFIX}/semesters/${semesterId}/module-classes/batch` },
  moduleClassUpdate: { method: "PATCH", url: (id: Id) => `${API_PREFIX}/module-classes/${id}` },
  moduleClassCancel: { method: "POST", url: (id: Id) => `${API_PREFIX}/module-classes/${id}/cancel` },
} as const;
