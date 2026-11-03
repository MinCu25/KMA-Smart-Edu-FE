import type { NavigationItem } from "../types/navigation";
export const studentNavigation: NavigationItem[] = [
  { id: "academic", label: "Học vụ cá nhân" },
  { id: "register", label: "Đăng ký học phần" },
  { id: "schedule", label: "Thời khóa biểu" },
  { id: "chat", label: "Trợ lý AI" },
];
export const academicAdminNavigation: NavigationItem[] = [
  { id: "admissions", label: "Phân luồng nhập học" },
  { id: "admin", label: "Quản lý sinh viên" },
  { id: "teachers", label: "Quản lý giảng viên" },
  { id: "subjects", label: "Danh mục học phần" },
  { id: "classes", label: "Lớp học phần & lịch học" },
  { id: "rooms", label: "Quản lý phòng học" },
  { id: "terms", label: "Kỳ học & đăng ký" },
  { id: "academic-timetable", label: "Thời khóa biểu" },
  { id: "knowledge", label: "Nguồn tri thức AI" },
  { id: "academic-password", label: "Đổi mật khẩu" },
];
export const lecturerNavigation: NavigationItem[] = [
  { id: "teaching-classes", label: "Lớp học phần của tôi" },
  { id: "teaching-schedule", label: "Lịch giảng dạy" },
  { id: "grades", label: "Quản lý điểm" },
  { id: "lecturer-password", label: "Đổi mật khẩu" },
];
export const systemNavigation: NavigationItem[] = [
  { id: "accounts", label: "Tài khoản người dùng" },
  { id: "system-password", label: "Đổi mật khẩu" },
];
export const passwordPage = {
  student: "student-password",
  lecturer: "lecturer-password",
  "academic-admin": "academic-password",
  "system-admin": "system-password",
} as const;
export const roleNames = {
  student: "Sinh viên",
  "academic-admin": "Admin học vụ",
  lecturer: "Giảng viên",
  "system-admin": "Admin hệ thống",
};
export const roleHome = {
  student: "register",
  "academic-admin": "admin",
  lecturer: "teaching-classes",
  "system-admin": "accounts",
} as const;
