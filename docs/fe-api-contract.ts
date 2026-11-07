/**
 * EduHub — hợp đồng FE theo source hiện tại (05/11/2026).
 * Đọc FE_API_INTEGRATION.md trước khi tích hợp.
 * Chỉ chứa 44 endpoint đã có controller. Không sinh URL cho chức năng dự kiến.
 * Đây là kiểu dữ liệu/hằng URL, không tự gửi request hoặc lưu token.
 */

export type ID = number; // JSON number của Java Long; không dùng username thay ID.
export type UUID = string;
export type LocalDate = string; // yyyy-MM-dd, giữ nguyên ngày, không đổi timezone.
export type LocalDateTime = string; // ISO không có hậu tố Z; BE chạy main() ở UTC.
export type Nullable<T> = T | null;

export type RoleName = "STUDENT" | "LECTURER" | "ACADEMIC_ADMIN" | "SYSTEM_ADMIN";
export type UserStatus = "ACTIVE" | "LOCKED" | "DISABLED";
export type TrainingType = "CHINH_QUY" | "LIEN_THONG" | "VAN_BANG_2";
export type ActivityStatus = "STUDYING" | "DEACTIVATED" | "DELETED";
export type LecturerStatus = "ACTIVE" | "INACTIVE";
export type AccountNotificationStatus = "PENDING" | "SENT" | "FAILED";
export type SubjectStatus = "ACTIVE" | "INACTIVE";
export type SemesterStatus = "UPCOMING" | "ONGOING" | "ENDED";
export type ModuleClassStatus = "UNSCHEDULED" | "SCHEDULED" | "OPEN" | "CANCELLED";
export type RoomStatus = "ACTIVE" | "INACTIVE";

export interface FieldErrorDetail {
  field: string;
  message: string;
}
export type ApiSuccess<T = void> = {
  success: true;
  message: string;
  timestamp: LocalDateTime;
} & ([T] extends [void] ? { data?: never } : { data: T });

export interface ApiError {
  success: false;
  code: number; // Mã nghiệp vụ, KHÁC HTTP status.
  message: string;
  errors?: FieldErrorDetail[];
  path?: string;
  timestamp: LocalDateTime;
  data?: never;
}
export type ApiResponse<T = void> = ApiSuccess<T> | ApiError;

export interface PageResponse<T> {
  content: T[];
  pageNumber: number; // Bắt đầu từ 0.
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean; // JSON là last, KHÔNG phải isLast.
}
export interface PageQuery {
  page?: number; // Mặc định 0; >= 0.
  size?: number; // Mặc định 20; >= 1. BE chưa khai báo giới hạn trên.
}

// Identity
export interface LoginRequest {
  username: string;
  password: string;
}
export interface UserInfoResponse {
  id: ID;
  username: string;
  email: Nullable<string>; // Login hiện không map email; danh sách admin có map.
  role: RoleName;
  fullName: Nullable<string>; // Chưa map ở cả hai luồng.
  firstLogin: boolean; // Java isFirstLogin -> JSON firstLogin.
  status: UserStatus;
}
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number; // Giây; hiện tại 900.
  user: UserInfoResponse;
  requirePasswordChange: boolean;
}
export interface LogoutRequest {
  refreshToken: string; // Token của cùng phiên accessToken ở header.
}
export interface ChangePasswordRequest {
  currentPassword?: Nullable<string>; // Bắt buộc theo nghiệp vụ nếu không first-login.
  newPassword: string;
  confirmPassword: string;
}
export interface AdminUserSearchQuery extends PageQuery {
  keyword?: string; // Chỉ tìm username.
}
export interface LockBody {
  reason: string; // userId nằm trong URL, KHÔNG gửi trong body.
}

// People — sinh viên
export interface StudentSearchRequest extends PageQuery {
  keyword?: string;
  majorId?: ID;
  cohortId?: ID;
  classId?: ID; // Query dùng classId; request ghi dùng administrativeClassId.
  activityStatus?: ActivityStatus;
  academicWarningStatus?: string; // Chuỗi tự do, chưa có enum trong BE.
}
export interface StudentResponse {
  id: ID; // Student ID, không phải User ID.
  studentCode: string;
  fullName: string;
  dateOfBirth: Nullable<LocalDate>;
  email: Nullable<string>;
  phone: Nullable<string>;
  citizenId: Nullable<string>;
  majorName: Nullable<string>;
  cohortCode: Nullable<string>;
  className: Nullable<string>;
  trainingType: Nullable<TrainingType>;
  entranceScore: Nullable<number>;
  targetGpa: Nullable<number>;
  activityStatus: ActivityStatus;
  academicWarningStatus: Nullable<string>;
  academicWarningReason: Nullable<string>;
  statusReason: Nullable<string>; // Hiện mapper không gán, thường null.
  createdAt: Nullable<LocalDateTime>;
}
export interface CreateStudentRequest {
  fullName: string; // Không blank, <= 255.
  dateOfBirth?: Nullable<LocalDate>; // DTO tạo SV hiện không có @Past.
  gender?: Nullable<string>; // Chưa có enum.
  email: string; // Email hợp lệ, <= 255.
  phone?: Nullable<string>; // <= 255.
  citizenId?: Nullable<string>; // <= 255.
  majorId: ID;
  cohortId: ID;
  administrativeClassId: ID;
  trainingType: TrainingType;
  entranceScore?: Nullable<number>; // >= 0.
  reason: string; // Không blank; trim rồi <= 500.
}
export interface CreateStudentResponse {
  student: StudentResponse;
  warnings: string[];
  notificationStatus: AccountNotificationStatus;
  notificationError: Nullable<string>;
}
export interface UpdateStudentRequest {
  studentCode?: null; // Mọi giá trị khác null đều bị BE từ chối: nên bỏ hẳn.
  fullName?: Nullable<string>; // Có gửi khác null thì không được blank.
  dateOfBirth?: Nullable<LocalDate>; // Phải là ngày quá khứ.
  email?: Nullable<string>; // Email hợp lệ.
  phone?: Nullable<string>;
  citizenId?: Nullable<string>;
  administrativeClassId?: Nullable<ID>; // > 0.
  targetGpa?: Nullable<number>; // DTO quản trị chỉ có min=0, chưa có max=4.
  academicWarningStatus?: Nullable<string>;
  academicWarningReason?: Nullable<string>;
  statusReason?: Nullable<string>; // Chỉ ghi application log; không đổi activityStatus.
}
export interface AccountNotificationResponse {
  studentId: ID;
  studentCode: string;
  notificationStatus: AccountNotificationStatus;
  notificationError: Nullable<string>;
}
export interface UpdateMyStudentProfileRequest {
  targetGpa?: Nullable<number>; // 0..4; null xóa; bỏ field giữ nguyên.
  phone?: Nullable<string>; // <= 255; null xóa; bỏ field giữ nguyên.
  // Bất kỳ key khác đều bị BE từ chối, kể cả key có giá trị null.
}

// People — nhập học
export interface AdmissionPreviewForm {
  file: File; // Gửi FormData với key "file", không stringify.
}
export interface AdmissionClassAdjustmentRequest {
  applicationCode: string;
  targetClassId: ID;
}
export interface AdmissionConfirmRequest {
  actor?: Nullable<string>; // Source hiện nhận trực tiếp để ghi audit, không xác minh từ token.
  acceptMinimumCapacityWarning?: boolean; // Mặc định false.
}
export interface AdmissionStudentPreview {
  rowNumber: number; // Số dòng Excel, từ 1.
  applicationCode: string;
  fullName: string;
  dateOfBirth: LocalDate;
  gender: string;
  email: string;
  entranceScore: number;
  majorCode: string;
  cohortCode: string;
  trainingType: string; // Parser giữ cách viết từ Excel; nên dùng enum IN HOA trong file.
  assignedClassId: ID;
  assignedClassName: string;
}
export interface AdmissionClassPreview {
  classId: ID;
  className: string;
  currentSize: number;
  projectedSize: number;
  minCapacity: number;
  maxCapacity: number;
  projectedAverageEntranceScore: number;
  students: AdmissionStudentPreview[]; // Chỉ SV mới được phân vào lớp của batch.
}
export interface AdmissionErrorResponse {
  rowNumber: number;
  applicationCode: Nullable<string>;
  field: string;
  reason: string; // Lỗi import dùng reason, không phải message.
}
export interface AdmissionPreviewResponse {
  batchId: UUID;
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number; // Hiện đếm số lỗi, KHÔNG đảm bảo là số dòng lỗi distinct.
  classes: AdmissionClassPreview[];
  errors: AdmissionErrorResponse[]; // Nằm trong data, khác errors của ApiError.
  duplicateNameWarnings: string[];
  capacityWarnings: string[];
}
export interface AdmissionConfirmResponse {
  batchId: UUID;
  createdStudents: number;
  createdUsers: number;
  emailFailures: string[]; // applicationCode, không phải email/MSSV.
}

// People — giảng viên
export interface LecturerSearchRequest extends PageQuery {
  keyword?: string;
  lecturerCode?: string;
  fullName?: string;
  facultyId?: ID;
  status?: LecturerStatus;
}
export interface LecturerResponse {
  id: ID; // Lecturer ID, không phải User ID.
  lecturerCode: string;
  fullName: string;
  email: Nullable<string>;
  phone: Nullable<string>;
  dateOfBirth: Nullable<LocalDate>;
  citizenId: Nullable<string>;
  facultyId: Nullable<ID>;
  accountNotificationStatus: Nullable<AccountNotificationStatus>;
  accountNotificationError: Nullable<string>;
  facultyName: Nullable<string>;
  status: LecturerStatus;
}
export interface CreateLecturerRequest {
  fullName: string; // Không blank, <= 255.
  dateOfBirth: LocalDate; // Bắt buộc, ngày quá khứ.
  email: string; // Email hợp lệ, <= 255.
  phone?: Nullable<string>; // <= 255.
  citizenId?: Nullable<string>; // <= 255.
  facultyId: ID;
  reason: string; // Không blank, <= 500.
}
export interface CreateLecturerResponse {
  lecturer: LecturerResponse;
  warnings: string[];
  notificationStatus: AccountNotificationStatus;
  notificationError: Nullable<string>;
}
export interface LecturerNotificationResponse {
  lecturerId: ID;
  lecturerCode: string;
  notificationStatus: AccountNotificationStatus;
  notificationError: Nullable<string>;
}

// Curriculum — học phần
export interface SubjectSearchRequest extends PageQuery {
  keyword?: string;
  subjectCode?: string;
  subjectName?: string;
  credits?: number; // Số nguyên >= 1.
  status?: SubjectStatus;
  withoutPrerequisites?: boolean; // Mặc định false.
}
export interface SubjectSimpleResponse {
  id: ID;
  subjectCode: string;
  subjectName: string;
  credits: number;
}
export interface SubjectResponse extends SubjectSimpleResponse {
  description: Nullable<string>;
  status: SubjectStatus;
  prerequisites: SubjectSimpleResponse[];
  requiredBy: SubjectSimpleResponse[];
}
export interface CreateSubjectRequest {
  subjectCode: string;
  subjectName: string;
  credits: number; // Số nguyên 1..5.
  description?: Nullable<string>;
}
export interface UpdateSubjectRequest {
  subjectCode?: Nullable<string>; // Bỏ hoặc bằng mã hiện tại; khác mã bị từ chối.
  subjectName: string;
  credits: number; // Số nguyên 1..5.
  description?: Nullable<string>; // Bỏ/null xóa mô tả cũ.
}
export interface SubjectActionRequest {
  reason: string;
  confirmed: boolean; // Phải true khi gọi deactivate hoặc DELETE.
}
export interface SetPrerequisiteRequest {
  prerequisiteSubjectIds: ID[]; // Toàn bộ tập cuối cùng; [] gỡ hết; ID > 0.
}

// Scheduling — kỳ học
export interface SemesterSearchRequest extends PageQuery {
  keyword?: string;
  status?: SemesterStatus;
}
export interface CreateSemesterRequest {
  semesterName: string;
  startDate: LocalDate;
  endDate: LocalDate;
  registrationStart: LocalDate;
  registrationEnd: LocalDate;
}
export interface UpdateSemesterRequest extends CreateSemesterRequest {
  confirmDateChange?: boolean; // Mặc định false.
}
export interface SemesterResponse {
  id: ID;
  semesterCode: string;
  semesterName: string;
  startDate: LocalDate;
  endDate: LocalDate;
  registrationStart: LocalDate;
  registrationEnd: LocalDate;
  status: SemesterStatus;
  isLocked: boolean; // JSON vẫn là isLocked (Java dùng Boolean).
  lockedGrade: boolean;
}

// Scheduling — lớp học phần
export interface ModuleClassSearchRequest extends PageQuery {
  keyword?: string; // Chỉ tìm moduleClassCode.
  semesterId?: ID; // Các ID query phải > 0.
  subjectId?: ID;
  lecturerId?: ID;
  status?: ModuleClassStatus;
}
export interface CreateModuleClassRequest {
  maxCapacity?: number; // Bỏ thì 80; null/string/80.0 không hợp lệ; 1..80.
}
export interface SubjectClassesRequest {
  subjectId: ID;
  confirmAdditionalClasses?: boolean;
  classes: CreateModuleClassRequest[]; // >= 1 phần tử, không phần tử null.
}
export interface CreateModuleClassesRequest {
  subjects: SubjectClassesRequest[]; // >= 1 phần tử; subjectId không lặp.
}
export interface UpdateModuleClassRequest {
  maxCapacity: number; // JSON integer 1..80 và >= currentSize.
  reason: string;
}
export interface CancelModuleClassRequest {
  reason: string;
}
export interface OpeningSubjectResponse {
  subjectId: ID;
  subjectCode: string;
  subjectName: string;
  credits: number;
  onTimeStudentCount: number;
  retakeStudentCount: number;
  missedStudentCount: number;
  expectedStudentCount: number;
  recommendedClassCount: number;
  existingClassCount: number;
  dataSource: string; // Adapter hiện dùng DATABASE.
  historyComplete: boolean;
}
export interface ClassScheduleResponse {
  id: ID;
  moduleClassId: ID;
  roomCode: string;
  buildingCode: string;
  roomNumber: string;
  dayOfWeek: number; // 2..8.
  lessonOrderStart: number;
  lessonOrderEnd: number;
  startDate: Nullable<LocalDate>;
  endDate: Nullable<LocalDate>;
}
export interface ModuleClassResponse {
  id: ID;
  semesterId: ID;
  subjectId: ID;
  lecturerId: Nullable<ID>;
  classSequence: number;
  dataSource: string; // Hiện "DATABASE".
  moduleClassCode: string;
  subjectCode: Nullable<string>;
  subjectName: Nullable<string>;
  credits: number;
  lecturerName: Nullable<string>;
  semesterCode: string;
  maxCapacity: number;
  currentSize: number;
  status: ModuleClassStatus;
  schedules: ClassScheduleResponse[]; // Hiện mapper LUÔN trả []; chưa nối dữ liệu lịch.
}

// Scheduling — phòng
export interface RoomSearchRequest extends PageQuery {
  keyword?: string;
  buildingCode?: string;
  campus?: string;
  status?: RoomStatus;
  minCapacity?: number; // Số nguyên >= 1.
}
export interface CreateRoomRequest {
  roomCode: string; // <= 50; <số phòng>-<tòa nhà>, vd 102-TA1.
  roomName: string; // <= 255, không blank.
  campus?: Nullable<string>; // <= 100; bỏ/null/blank -> "".
  buildingCode: string; // <= 50; phải khớp roomCode.
  roomNumber?: Nullable<string>; // <= 50; bỏ/null suy từ roomCode.
  capacity: number; // JSON integer 1..2147483647, KHÔNG giới hạn 80.
}
export type UpdateRoomRequest = CreateRoomRequest; // PUT gửi đủ các field bắt buộc.
export interface ChangeRoomStatusRequest {
  status: RoomStatus;
}
export interface RoomResponse {
  id: ID;
  roomCode: string;
  roomName: string;
  campus: string;
  buildingCode: string;
  roomNumber: string;
  capacity: number;
  status: RoomStatus;
}

// URL tương đối đã gồm /api/v1: ghép với origin, ví dụ http://localhost:8080.
// Không cộng /api/v1 lần thứ hai. UUID cũng được encode khi đưa vào path.
const root = "/api/v1";
const pathId = (id: ID | UUID): string => encodeURIComponent(String(id));
export const API_URLS = {
  auth: {
    login: root + "/auth/login",
    logout: root + "/auth/logout",
    changePassword: root + "/auth/change-password",
  },
  adminUsers: {
    list: root + "/admin/users",
    lock: (userId: ID) => root + "/admin/users/" + pathId(userId) + "/lock",
    unlock: (userId: ID) => root + "/admin/users/" + pathId(userId) + "/unlock",
    resetPassword: (userId: ID) => root + "/admin/users/" + pathId(userId) + "/reset-password",
  },
  students: {
    list: root + "/students",
    create: root + "/students",
    detail: (id: ID) => root + "/students/" + pathId(id),
    update: (id: ID) => root + "/students/" + pathId(id),
    me: root + "/students/me",
    updateMe: root + "/students/me",
    admissionPreview: root + "/students/admission/preview",
    admissionAssignment: (batchId: UUID) => root + "/students/admission/" + pathId(batchId) + "/assignment",
    admissionConfirm: (batchId: UUID) => root + "/students/admission/" + pathId(batchId) + "/confirm",
  },
  lecturers: {
    list: root + "/lecturers",
    create: root + "/lecturers",
    detail: (id: ID) => root + "/lecturers/" + pathId(id),
    resendAccountNotification: (id: ID) => root + "/lecturers/" + pathId(id) + "/account-notification/resend",
  },
  subjects: {
    list: root + "/subjects",
    detail: (id: ID) => root + "/subjects/" + pathId(id),
    create: root + "/subjects",
    update: (id: ID) => root + "/subjects/" + pathId(id),
    deactivate: (id: ID) => root + "/subjects/" + pathId(id) + "/deactivate",
    delete: (id: ID) => root + "/subjects/" + pathId(id),
    prerequisites: (id: ID) => root + "/subjects/" + pathId(id) + "/prerequisites",
  },
  semesters: {
    list: root + "/semesters",
    detail: (id: ID) => root + "/semesters/" + pathId(id),
    create: root + "/semesters",
    update: (id: ID) => root + "/semesters/" + pathId(id),
    openingSubjects: (semesterId: ID) => root + "/semesters/" + pathId(semesterId) + "/opening-subjects",
    createModuleClassesBatch: (semesterId: ID) => root + "/semesters/" + pathId(semesterId) + "/module-classes/batch",
  },
  moduleClasses: {
    list: root + "/module-classes",
    detail: (id: ID) => root + "/module-classes/" + pathId(id),
    update: (id: ID) => root + "/module-classes/" + pathId(id),
    cancel: (id: ID) => root + "/module-classes/" + pathId(id) + "/cancel",
  },
  rooms: {
    list: root + "/rooms",
    detail: (id: ID) => root + "/rooms/" + pathId(id),
    create: root + "/rooms",
    update: (id: ID) => root + "/rooms/" + pathId(id),
    changeStatus: (id: ID) => root + "/rooms/" + pathId(id) + "/status",
    delete: (id: ID) => root + "/rooms/" + pathId(id),
  },
} as const;
