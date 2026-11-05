import { ENDPOINTS } from "../../services/api/backendContract";
export type Op = keyof typeof ENDPOINTS;
export type Row = Record<string, unknown>;
export const names: Record<string, string> = {
  id: "ID",
  studyRange: "Thời gian học",
  registrationRange: "Thời gian đăng ký",
  size: "Sĩ số / sức chứa",
  username: "Tên đăng nhập",
  fullName: "Họ tên",
  email: "Email",
  phone: "Số điện thoại",
  reason: "Lý do",
  role: "Vai trò",
  status: "Trạng thái",
  firstLogin: "Đăng nhập lần đầu",
  createdAt: "Ngày tạo",
  studentCode: "Mã sinh viên",
  dateOfBirth: "Ngày sinh",
  gender: "Giới tính",
  citizenId: "CCCD",
  majorId: "ID ngành",
  cohortId: "ID khóa",
  administrativeClassId: "ID lớp hành chính",
  classId: "ID lớp",
  trainingType: "Hệ đào tạo",
  entranceScore: "Điểm xét tuyển",
  targetGpa: "GPA mục tiêu",
  className: "Lớp",
  majorName: "Ngành",
  cohortCode: "Khóa",
  activityStatus: "Trạng thái sinh viên",
  academicWarningStatus: "Trạng thái cảnh báo học vụ",
  academicWarningReason: "Lý do cảnh báo",
  statusReason: "Lý do cập nhật",
  facultyId: "ID khoa",
  facultyName: "Khoa",
  lecturerCode: "Mã giảng viên",
  subjectCode: "Mã học phần",
  subjectName: "Tên học phần",
  credits: "Tín chỉ",
  description: "Mô tả",
  prerequisites: "Học phần tiên quyết",
  requiredBy: "Học phần yêu cầu môn này",
  prerequisiteSubjectIds: "ID các môn tiên quyết (cách nhau bằng dấu phẩy)",
  confirmed: "Tôi xác nhận thực hiện",
  semesterName: "Tên kỳ học (HK_1 - 2026-2027)",
  semesterCode: "Mã kỳ",
  startDate: "Ngày bắt đầu học",
  endDate: "Ngày kết thúc học",
  registrationStart: "Ngày mở đăng ký",
  registrationEnd: "Ngày đóng đăng ký",
  confirmDateChange: "Xác nhận thay đổi ngày của kỳ",
  moduleClassCode: "Mã lớp học phần",
  semesterId: "ID kỳ học",
  subjectId: "ID học phần",
  lecturerId: "ID giảng viên",
  lecturerName: "Giảng viên",
  maxCapacity: "Sức chứa",
  currentSize: "Sĩ số",
  isLocked: "Đã khóa",
  lockedGrade: "Đã khóa điểm",
  keyword: "Từ khóa",
  withoutPrerequisites: "Chưa có môn tiên quyết",
  classSequence: "Số thứ tự lớp",
  schedules: "Buổi học",
  dataSource: "Nguồn dữ liệu",
  accountNotificationStatus: "Trạng thái gửi email",
  accountNotificationError: "Lỗi gửi email",
  onTimeStudentCount: "Học đúng kỳ",
  retakeStudentCount: "Học lại",
  missedStudentCount: "Học chậm",
  expectedStudentCount: "Nhu cầu",
  recommendedClassCount: "Số lớp đề xuất",
  existingClassCount: "Số lớp hiện có",
  historyComplete: "Đủ lịch sử học",
};
export const labels: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Ngừng hoạt động",
  LOCKED: "Đã khóa",
  DISABLED: "Vô hiệu hóa",
  STUDENT: "Sinh viên",
  LECTURER: "Giảng viên",
  ACADEMIC_ADMIN: "Admin học vụ",
  SYSTEM_ADMIN: "Admin hệ thống",
  STUDYING: "Đang học",
  DEACTIVATED: "Vô hiệu hóa",
  DELETED: "Đã xóa",
  CHINH_QUY: "Chính quy",
  LIEN_THONG: "Liên thông",
  VAN_BANG_2: "Văn bằng 2",
  UPCOMING: "Sắp diễn ra",
  ONGOING: "Đang diễn ra",
  ENDED: "Đã kết thúc",
  UNSCHEDULED: "Chưa xếp lịch",
  SCHEDULED: "Đã xếp lịch",
  OPEN: "Đã mở",
  CANCELLED: "Đã hủy",
  FAILED: "Thất bại",
  SENT: "Đã gửi",
  PENDING: "Đang chờ",
};
export interface Action {
  op: Op;
  title: string;
  fields: string[];
}
const act = (op: Op, title: string, fields = ""): Action => ({
  op,
  title,
  fields: fields.split(" ").filter(Boolean),
});
export const profileAction = act(
  "myStudentUpdate",
  "Cập nhật hồ sơ",
  "phone targetGpa",
);
interface Screen {
  title: string;
  list: Op;
  detail?: Op;
  columns: string;
  filters: string;
  status?: string;
  create?: Action;
  actions: Action[];
}
const term =
  "semesterName! registrationStart! registrationEnd! startDate! endDate!";
export const catalog: Record<string, Screen> = {
  accounts: {
    title: "Tài khoản người dùng",
    list: "adminUsersSearch",
    columns: "username email role status",
    filters: "keyword",
    actions: [
      act("adminUserLock", "Khóa tài khoản", "reason!"),
      act("adminUserUnlock", "Mở khóa"),
      act("adminUserResetPassword", "Gửi mật khẩu tạm qua email"),
    ],
  },
  admin: {
    title: "Quản lý sinh viên",
    list: "studentsSearch",
    detail: "studentGet",
    columns:
      "studentCode fullName className majorName cohortCode activityStatus",
    filters:
      "keyword majorId cohortId classId activityStatus academicWarningStatus",
    create: act(
      "studentCreate",
      "Thêm sinh viên",
      "fullName! dateOfBirth gender email! phone citizenId majorId! cohortId! administrativeClassId! trainingType! entranceScore reason!",
    ),
    actions: [
      act(
        "studentUpdate",
        "Cập nhật sinh viên",
        "fullName dateOfBirth email phone citizenId administrativeClassId targetGpa academicWarningStatus academicWarningReason statusReason",
      ),
      act("studentResendNotification", "Gửi lại email tài khoản"),
    ],
  },
  teachers: {
    title: "Quản lý giảng viên",
    list: "lecturersSearch",
    detail: "lecturerGet",
    columns: "lecturerCode fullName email phone facultyName status",
    filters: "keyword lecturerCode fullName facultyId status",
    status: "ACTIVE INACTIVE",
    create: act(
      "lecturerCreate",
      "Thêm giảng viên",
      "fullName! dateOfBirth! email! phone citizenId facultyId! reason!",
    ),
    actions: [act("lecturerResendNotification", "Gửi lại email tài khoản")],
  },
  subjects: {
    title: "Danh mục học phần",
    list: "subjectsSearch",
    detail: "subjectGet",
    columns: "subjectCode subjectName credits prerequisites status",
    filters:
      "keyword subjectCode subjectName credits status withoutPrerequisites",
    status: "ACTIVE INACTIVE",
    create: act(
      "subjectCreate",
      "Thêm học phần",
      "subjectCode! subjectName! credits! description",
    ),
    actions: [
      act("subjectUpdate", "Sửa học phần", "subjectName! credits! description"),
      act(
        "subjectSetPrerequisites",
        "Thay danh sách tiên quyết",
        "prerequisiteSubjectIds",
      ),
      act("subjectDeactivate", "Ngừng sử dụng", "reason! confirmed!"),
      act("subjectDelete", "Xóa mềm học phần", "reason! confirmed!"),
    ],
  },
  terms: {
    title: "Kỳ học & đăng ký",
    list: "semestersSearch",
    detail: "semesterGet",
    columns: "semesterName studyRange registrationRange status",
    filters: "keyword status",
    status: "UPCOMING ONGOING ENDED",
    create: act("semesterCreate", "Tạo kỳ học", term),
    actions: [
      act("semesterUpdate", "Cập nhật kỳ học", term + " confirmDateChange"),
    ],
  },
  classes: {
    title: "Lớp học phần",
    list: "moduleClassesSearch",
    detail: "moduleClassGet",
    columns:
      "moduleClassCode subjectName semesterCode lecturerName size status",
    filters: "keyword semesterId subjectId lecturerId status",
    status: "UNSCHEDULED SCHEDULED OPEN CANCELLED",
    actions: [
      act("moduleClassUpdate", "Đổi sức chứa", "maxCapacity! reason!"),
      act("moduleClassCancel", "Hủy lớp", "reason!"),
    ],
  },
};
