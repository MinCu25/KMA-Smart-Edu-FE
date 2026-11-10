/**
 * EduHub — hợp đồng REST đối chiếu source ngày 10/11/2026.
 * Đọc API_SPECIFICATION.md về validation, token, nullable và giới hạn nghiệp vụ.
 * Chỉ chứa URL có controller; không chứa facade/endpoint dự kiến.
 * Kiểu dữ liệu không phải runtime validator và không tự gửi request/lưu token.
 */

export type ID = number; // JSON number của Java Long; không dùng username thay ID.
export type LocalDate = string; // yyyy-MM-dd, giữ nguyên ngày, không đổi timezone.
export type LocalDateTime = string; // ISO không có hậu tố Z; BE chạy main() ở UTC.
export type Nullable<T> = T | null;

export type RoleName = "STUDENT" | "LECTURER" | "ACADEMIC_ADMIN" | "SYSTEM_ADMIN";
export type UserStatus = "ACTIVE" | "LOCKED" | "DISABLED";
export type TrainingType = "CHINH_QUY" | "LIEN_THONG" | "VAN_BANG_2";
export type ActivityStatus = "STUDYING" | "DEACTIVATED" | "DELETED";
export type LecturerStatus = "ACTIVE" | "INACTIVE";
export type AccountNotificationStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";
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
  message?: string; // Search sinh viên/giảng viên có kết quả sẽ lược field này.
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
  email: Nullable<string>; // Email tài khoản Identity trong login/facade.
  role: RoleName;
  fullName: Nullable<string>; // Login đọc tên hồ sơ theo role; thiếu hồ sơ/admin có thể null.
  firstLogin: boolean; // Java isFirstLogin -> JSON firstLogin.
  status: UserStatus;
}
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number; // Giây; mặc định 900, có thể thay qua cấu hình backend.
  user: UserInfoResponse;
  requirePasswordChange: boolean; // true: JWT chỉ dùng đổi mật khẩu/đăng xuất; API nghiệp vụ trả 403/4006.
}
export interface LogoutRequest {
  refreshToken: string; // Cùng phiên accessToken ở header; logout chỉ revoke refresh token, access token còn hạn vẫn hợp lệ.
}
export interface ChangePasswordRequest {
  currentPassword?: Nullable<string>; // Bắt buộc theo nghiệp vụ nếu không first-login.
  newPassword: string; // Đủ policy cả lần đầu; khác username, mật khẩu hiện tại và một mật khẩu chính thức trước đó.
  confirmPassword: string;
}
// Đổi mật khẩu thành công: xóa cả hai token và đăng nhập lại; server chỉ revoke refresh token.
// Access token cũ vẫn hợp lệ đến exp tại Resource Server; endpoint kiểm tra phiên DB có thể từ chối sớm hơn.
export interface AdminUserSearchQuery extends PageQuery {
  keyword?: string; // Tìm username hoặc email; trim/không phân biệt hoa thường/escape wildcard, sort ID tăng dần.
  role?: RoleName;
  status?: UserStatus;
  firstLogin?: boolean; // false là lọc không cần đổi mật khẩu; bỏ tham số là không lọc.
}
export interface UserAccountSummaryResponse {
  id: ID; // User ID, dùng cho API chi tiết và thao tác quản trị.
  username: string;
  role: RoleName;
  status: UserStatus;
}
export interface UserAccountDetailResponse extends UserAccountSummaryResponse {
  failedLoginCount: number;
  lockedUntil: Nullable<LocalDateTime>; // Có thể giữ mốc đã hết hạn; không suy đang khóa chỉ từ việc khác null.
  passwordChangedAt: Nullable<LocalDateTime>; // Cập nhật cả khi reset mật khẩu.
  createdAt: Nullable<LocalDateTime>; // Metadata của User, không phải hồ sơ People.
  updatedAt: Nullable<LocalDateTime>;
  email: Nullable<string>;
  firstLogin: boolean; // Đang cần đổi mật khẩu, bao gồm sau reset.
  temporarilyLocked: boolean; // lockedUntil ở tương lai theo UTC, độc lập status=LOCKED.
  fullName: Nullable<string>; // People trả theo User ID/role; admin hoặc thiếu hồ sơ trả null.
  phone: Nullable<string>;
}
export interface LockBody {
  reason: string; // Trim, không blank, <=500; Java dùng LockUserRequest, userId chỉ nằm trong URL.
}
// Lock/unlock/reset từ chối DISABLED bằng 409/4010; quyền SYSTEM_ADMIN/permission vẫn chưa được thực thi.
// Reset gỡ khóa tạm, giữ LOCKED thủ công; revoke mọi refresh token, access token cũ vẫn có thể hợp lệ đến exp.

// People — sinh viên
export interface StudentSearchRequest extends PageQuery {
  // page/size thuộc request query, mặc định 0/20; service kiểm tra page>=0, size>=1.
  keyword?: string;
  majorId?: ID;
  cohortId?: ID;
  classId?: ID; // Query dùng classId; administrativeClassId chỉ thuộc request tạo, PUT không nhận đổi lớp.
  activityStatus?: ActivityStatus;
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
  academicWarningStatus: Nullable<string>; // Chỉ đọc dữ liệu đã lưu; cơ chế đánh giá đang hoãn.
  academicWarningReason: Nullable<string>;
  statusReason: Nullable<string>; // Hiện mapper không gán, thường null.
  createdAt: Nullable<LocalDateTime>;
}
export interface CreateStudentRequest {
  fullName: string; // Không blank, <=255, trim.
  dateOfBirth?: Nullable<LocalDate>; // Nếu có phải quá khứ.
  gender?: Nullable<string>;
  email?: Nullable<string>; // Có giá trị phải email hợp lệ, <=255; thiếu có thể SKIPPED.
  phone?: Nullable<string>; // <=255.
  citizenId: string; // DTO <=32; service bỏ whitespace và yêu cầu 12 chữ số.
  majorId: ID;
  cohortId: ID;
  administrativeClassId: ID;
  trainingType?: TrainingType; // Bỏ field mặc định CHINH_QUY; phải khớp lớp.
  entranceScore?: Nullable<number>; // Không âm.
  reason: string; // Không blank, trim rồi <=500.
}
export interface CreateStudentResponse {
  student: StudentResponse;
  warnings: string[];
  notificationStatus: AccountNotificationStatus;
  notificationError: Nullable<string>;
}
export interface UpdateStudentRequest {
  // Tương ứng UpdateStudentProfileRequest Java; giữ tên type FE và JSON hiện có.
  fullName?: Nullable<string>; // Có gửi khác null thì không được blank, <=255 trước trim.
  dateOfBirth?: Nullable<LocalDate>; // Phải là ngày quá khứ.
  email?: Nullable<string>; // Email hợp lệ <=255, cập nhật User liên kết; null/bỏ field giữ nguyên ở PUT.
  phone?: Nullable<string>; // <=255 trước trim; null/bỏ field giữ nguyên ở PUT.
  citizenId?: Nullable<string>; // Bỏ whitespace, đúng 12 chữ số; không trùng Student khác chưa xóa.
  targetGpa?: Nullable<number>; // 0..4, tối đa 2 chữ số thập phân; null/bỏ field giữ nguyên tại PUT.
  // TODO(ACADEMIC_WARNING_EVALUATION): Chờ Academic đánh giá từ dữ liệu học tập/quy chế; không nhập tay cảnh báo.
  statusReason?: Nullable<string>; // Lý do cập nhật <=500 trước trim; chỉ log, không đổi activityStatus.
  // Key khác bị từ chối, kể cả null hoặc MSSV cũ; không gửi studentCode/administrativeClassId/ngành/khóa/hệ.
  // TODO(STUDENT_ADMINISTRATIVE_CLASS_TRANSFER), TODO(STUDENT_MAJOR_TRANSFER): các use-case riêng, chưa có API.
}
export interface UpdateMyStudentProfileRequest {
  // Tương ứng UpdateMyProfileRequest Java, chỉ dùng cho PATCH /students/me.
  targetGpa?: Nullable<number>; // 0..4, tối đa 2 chữ số thập phân; null xóa; bỏ field giữ nguyên.
  phone?: Nullable<string>; // <= 255; null xóa; bỏ field giữ nguyên.
  email?: Nullable<string>; // Email <=255 sau chuẩn hóa; lowercase, trống/null xóa tại User, bỏ field giữ nguyên.
  // Bất kỳ key khác đều bị BE từ chối, kể cả key có giá trị null.
}

// Admission — kiểu REST giữ nguyên; form upload dùng File của trình duyệt.
export type AdmissionPlanStatus =
  | "DRAFT" | "CLASSES_READY" | "PREVIEWED"
  | "CONFIRMING" | "PARTIALLY_CONFIRMED" | "CONFIRMED";
export type AdmissionApplicantStatus =
  | "VALID" | "INVALID" | "CONFLICT" | "EXISTING" | "ENROLLED" | "FAILED";
export type AdmissionScenarioLevel = "NORMAL" | "RESERVE" | "BELOW_MINIMUM";
export type NotificationStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";

export interface AdmissionScopeQuery {
  majorId: ID;
  cohortId: ID; // Khóa được chọn trên hệ thống; mẫu XLSX mới không chứa mã khóa.
}
export interface CreateAdmissionPlanRequest extends AdmissionScopeQuery {
  totalStudents: number; // >=0; lập theo số dự kiến.
  minCapacity?: Nullable<number>;
  maxCapacity?: Nullable<number>;
  reserveCapacity?: Nullable<number>;
}
export interface CreateAdmissionPlanFromFileForm extends AdmissionScopeQuery {
  file: File; // Gửi multipart, convert các số thành chuỗi FormData.
  minCapacity?: number;
  maxCapacity?: number;
  reserveCapacity?: number;
}
export interface ImportAdmissionApplicantsForm {
  file: File;
  expectedRevision: number; // Revision mới nhất, scope lấy từ plan.
}
export interface PrepareAdmissionClassesRequest {
  planId: ID;
  expectedRevision: number;
  classCount: number; // 1..99.
  existingClassIds?: Nullable<ID[]>; // null/bỏ: tự dùng lại; []: tạo toàn bộ; ID[]: chọn rõ.
  acceptReserve?: boolean;
  acceptBelowMinimum?: boolean;
  reason?: Nullable<string>; // <=500, bắt buộc khi chấp nhận dưới tối thiểu.
}
export interface PreviewAdmissionAllocationRequest {
  expectedRevision: number;
}
export interface AdmissionAssignment {
  applicantId: ID;
  classId: ID;
}
export interface AdjustAdmissionAssignmentsRequest {
  expectedRevision: number;
  assignments: AdmissionAssignment[]; // Không rỗng, mỗi applicant chỉ chuyển một lần.
}
export interface ConfirmAdmissionEnrollmentRequest {
  expectedRevision: number;
  acceptReserve?: boolean;
  acceptBelowMinimum?: boolean;
  reason?: Nullable<string>;
}
export interface AdmissionCapacity {
  minimum: number;
  maximum: number;
  reserve: number;
}
export interface AdmissionScenario {
  classCount: number;
  targetSizes: number[];
  level: AdmissionScenarioLevel;
  reserveUsed: number;
  belowMinimum: boolean;
  insufficientRooms: boolean;
  suitableRooms: number;
  requiredRoomCapacity: number;
  recommended: boolean;
  warnings: string[];
}
export interface AdmissionClassPreview {
  id: ID;
  className: string;
  targetSize: number;
  assignedSize: number;
  currentSize: number;
  minimum: number;
  maximum: number;
  reserve: number;
  reserveUsed: number;
  averageScore: Nullable<number>;
  applicantIds: ID[];
}
export interface AdmissionApplicantResponse {
  id: ID;
  rowNumber: number; // Dòng vật lý Excel, từ 1.
  applicationCode: Nullable<string>;
  citizenId: Nullable<string>;
  fullName: Nullable<string>;
  dateOfBirth: Nullable<LocalDate>;
  gender: Nullable<string>;
  email: Nullable<string>;
  phone: Nullable<string>;
  entranceScore: Nullable<number>; // INVALID có thể không parse được điểm.
  state: AdmissionApplicantStatus;
  error: Nullable<string>;
  assignedClassId: Nullable<ID>;
  studentId: Nullable<ID>;
  studentCode: Nullable<string>;
  reusingAccount: boolean;
  warnings: string[];
}
export interface AdmissionPlanResponse {
  id: ID;
  revision: number;
  majorId: ID;
  cohortId: ID;
  totalStudents: number;
  capacity: AdmissionCapacity;
  state: AdmissionPlanStatus;
  selectedClassCount: Nullable<number>;
  scenarios: AdmissionScenario[];
  classes: AdmissionClassPreview[];
  applicants: AdmissionApplicantResponse[];
  averageScoreDifference: number;
  warnings: string[];
}
export interface AdmissionConfirmationResponse {
  planId: ID;
  revision: number;
  state: AdmissionPlanStatus;
  enrolled: number;
  failed: number;
  skipped: number;
  applicants: AdmissionApplicantResponse[];
}
export interface AdmissionNotificationResponse {
  id: ID;
  admissionId: ID;
  state: NotificationStatus;
  failureCount: number;
  error: Nullable<string>;
}
export interface AdministrativeClassResponse {
  id: ID;
  className: string;
  majorCode: string;
  majorName: string;
  cohortCode: string;
  trainingType: TrainingType;
  currentSize: Nullable<number>;
  maxCapacity: Nullable<number>;
  minCapacity: Nullable<number>;
  reserveCapacity: Nullable<number>;
  availableForAdmission: boolean;
}

// People — giảng viên
export interface LecturerSearchRequest extends PageQuery {
  // page/size thuộc request query, mặc định 0/20; service kiểm tra page>=0, size>=1.
  keyword?: string;
  lecturerCode?: string;
  fullName?: string;
  facultyId?: ID;
  status?: LecturerStatus; // Trạng thái hồ sơ giảng viên; bỏ tham số lấy cả ACTIVE/INACTIVE.
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
  facultyName: Nullable<string>;
  recruitmentYear: Nullable<number>; // Dữ liệu cũ chưa biết năm giữ null.
  teachingSubjects: SubjectSimpleResponse[]; // Giữ tên môn lịch sử đã ngừng/ẩn; hồ sơ cũ chưa có môn trả [].
  status: LecturerStatus;
}
export interface CreateLecturerRequest {
  fullName: string; // Không blank, <= 255.
  dateOfBirth: LocalDate; // Bắt buộc, ngày quá khứ.
  email: string; // Email hợp lệ, <= 255.
  phone?: Nullable<string>; // <= 255.
  citizenId?: Nullable<string>; // <=255 trước chuẩn hóa; nếu có phải đúng 12 chữ số sau bỏ whitespace.
  facultyId: ID; // Khoa ACTIVE/chưa xóa, có mã khoa chính thức.
  recruitmentYear: number; // Bắt buộc, năm bốn chữ số 1000..9999; không tự lấy năm hiện tại.
  teachingSubjectIds: ID[]; // Ít nhất một ID dương, không null; trùng ID được gộp, môn phải ACTIVE/chưa xóa.
  reason: string; // Không blank, <= 500.
}
export interface UpdateLecturerRequest {
  // Tương ứng UpdateLecturerProfileRequest Java; PUT theo Lecturer ID, không nhận field ngoài danh sách này.
  // Bỏ field/null giữ nguyên, {} không đổi dữ liệu nghiệp vụ; vẫn cần JWT/User/phiên hợp lệ.
  fullName?: Nullable<string>; // Không blank, <=255 trước trim.
  dateOfBirth?: Nullable<LocalDate>; // Ngày trong quá khứ.
  email?: Nullable<string>; // Chuẩn hóa trim/lowercase, <=255; chuỗi rỗng/trắng xóa User.email.
  phone?: Nullable<string>; // <=255 trước trim; chuỗi trắng thành chuỗi rỗng.
  citizenId?: Nullable<string>; // Đúng 12 chữ số sau bỏ whitespace; chuỗi trắng không hợp lệ.
  teachingSubjectIds?: Nullable<ID[]>; // Thay toàn bộ tập môn; [] bị từ chối, từng ID dương/không null.
  // ID lặp được gộp, mọi môn phải ACTIVE/chưa xóa; bỏ/null giữ cả môn lịch sử đã ngừng/ẩn.
  reason?: Nullable<string>; // <=500 trước trim, tùy chọn; không dùng statusReason của sinh viên.
}
export interface CreateLecturerResponse {
  lecturer: LecturerResponse;
  warnings: string[];
  notificationStatus: AccountNotificationStatus;
  notificationError: Nullable<string>;
}
// Tạo SV đơn lẻ/GV kiểm tra User/phiên từ principal, chỉ gửi một lần sau commit.
// Kết quả gửi chỉ có trong response create, không lưu lâu dài; không có resend/retry.
// Bản ghi/API trạng thái thông báo nhập học vẫn giữ riêng để vận hành retry.

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

// URL đã gồm /api/v1; query và HTTP method theo API_SPECIFICATION.md.
const API_BASE_PATH = "/api/v1";
const encodePathId = (id: ID): string => encodeURIComponent(String(id));
export const API_URLS = {
  auth: {
    login: API_BASE_PATH + "/auth/login",
    logout: API_BASE_PATH + "/auth/logout",
    changePassword: API_BASE_PATH + "/auth/change-password",
  },
  adminUsers: {
    list: API_BASE_PATH + "/admin/users",
    detail: (userId: ID) => API_BASE_PATH + "/admin/users/" + encodePathId(userId),
    lock: (userId: ID) => API_BASE_PATH + "/admin/users/" + encodePathId(userId) + "/lock",
    unlock: (userId: ID) => API_BASE_PATH + "/admin/users/" + encodePathId(userId) + "/unlock",
    resetPassword: (userId: ID) => API_BASE_PATH + "/admin/users/" + encodePathId(userId) + "/reset-password",
  },
  students: {
    list: API_BASE_PATH + "/students",
    create: API_BASE_PATH + "/students",
    detail: (id: ID) => API_BASE_PATH + "/students/" + encodePathId(id),
    update: (id: ID) => API_BASE_PATH + "/students/" + encodePathId(id),
    me: API_BASE_PATH + "/students/me",
    updateMe: API_BASE_PATH + "/students/me",
  },
  admissions: {
    configuration: API_BASE_PATH + "/student-admissions/configuration",
    template: API_BASE_PATH + "/student-admissions/template",
    createPlan: API_BASE_PATH + "/student-admissions/plans",
    createPlanFromFile: API_BASE_PATH + "/student-admissions/plans/import",
    planDetail: (planId: ID) => API_BASE_PATH + "/student-admissions/plans/" + encodePathId(planId),
    importApplicants: (planId: ID) => API_BASE_PATH + "/student-admissions/plans/" + encodePathId(planId) + "/applicants",
    previewAllocation: (planId: ID) => API_BASE_PATH + "/student-admissions/plans/" + encodePathId(planId) + "/allocation/preview",
    adjustAssignments: (planId: ID) => API_BASE_PATH + "/student-admissions/plans/" + encodePathId(planId) + "/allocation",
    confirmEnrollment: (planId: ID) => API_BASE_PATH + "/student-admissions/plans/" + encodePathId(planId) + "/confirm",
    notifications: (planId: ID) => API_BASE_PATH + "/student-admissions/plans/" + encodePathId(planId) + "/notifications",
  },
  administrativeClasses: {
    list: API_BASE_PATH + "/administrative-classes",
    prepareFromAdmissionPlan: API_BASE_PATH + "/administrative-classes/from-admission-plan",
  },
  lecturers: {
    list: API_BASE_PATH + "/lecturers",
    create: API_BASE_PATH + "/lecturers",
    detail: (id: ID) => API_BASE_PATH + "/lecturers/" + encodePathId(id),
    update: (id: ID) => API_BASE_PATH + "/lecturers/" + encodePathId(id),
  },
  subjects: {
    list: API_BASE_PATH + "/subjects",
    detail: (id: ID) => API_BASE_PATH + "/subjects/" + encodePathId(id),
    create: API_BASE_PATH + "/subjects",
    update: (id: ID) => API_BASE_PATH + "/subjects/" + encodePathId(id),
    deactivate: (id: ID) => API_BASE_PATH + "/subjects/" + encodePathId(id) + "/deactivate",
    delete: (id: ID) => API_BASE_PATH + "/subjects/" + encodePathId(id),
    prerequisites: (id: ID) => API_BASE_PATH + "/subjects/" + encodePathId(id) + "/prerequisites",
  },
  semesters: {
    list: API_BASE_PATH + "/semesters",
    detail: (id: ID) => API_BASE_PATH + "/semesters/" + encodePathId(id),
    create: API_BASE_PATH + "/semesters",
    update: (id: ID) => API_BASE_PATH + "/semesters/" + encodePathId(id),
    openingSubjects: (semesterId: ID) => API_BASE_PATH + "/semesters/" + encodePathId(semesterId) + "/opening-subjects",
    createModuleClassesBatch: (semesterId: ID) => API_BASE_PATH + "/semesters/" + encodePathId(semesterId) + "/module-classes/batch",
  },
  moduleClasses: {
    list: API_BASE_PATH + "/module-classes",
    detail: (id: ID) => API_BASE_PATH + "/module-classes/" + encodePathId(id),
    update: (id: ID) => API_BASE_PATH + "/module-classes/" + encodePathId(id),
    cancel: (id: ID) => API_BASE_PATH + "/module-classes/" + encodePathId(id) + "/cancel",
  },
  rooms: {
    list: API_BASE_PATH + "/rooms",
    detail: (id: ID) => API_BASE_PATH + "/rooms/" + encodePathId(id),
    create: API_BASE_PATH + "/rooms",
    update: (id: ID) => API_BASE_PATH + "/rooms/" + encodePathId(id),
    changeStatus: (id: ID) => API_BASE_PATH + "/rooms/" + encodePathId(id) + "/status",
    delete: (id: ID) => API_BASE_PATH + "/rooms/" + encodePathId(id),
  },
} as const;
