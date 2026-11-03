import AdmissionsPage from "../pages/academic-admin/AdmissionsPage";
import KnowledgePage from "../pages/academic-admin/KnowledgePage";
import AcademicTimetable from "../pages/academic-admin/TimetablePage";
import { PasswordForm } from "../components/common/PasswordForm";
import TeachersPage from "../pages/academic-admin/TeachersPage";
import SubjectsPage from "../pages/academic-admin/SubjectsPage";
import ClassesPage from "../pages/academic-admin/ClassesPage";
import RoomsPage from "../pages/academic-admin/RoomsPage";
import TermsPage from "../pages/academic-admin/TermsPage";
import TeachingClasses from "../pages/lecturer/ClassesPage";
import TeachingSchedule from "../pages/lecturer/SchedulePage";
import GradesPage from "../pages/lecturer/GradesPage";
import AccountsPage from "../pages/system-admin/AccountsPage";
import type { Page, PageProps, Role } from "../types/navigation";
import AcademicPage from "../pages/student/AcademicPage";
import CourseRegistrationPage from "../pages/student/CourseRegistrationPage";
import SchedulePage from "../pages/student/SchedulePage";
import ChatPage from "../pages/student/ChatPage";
import ProfilePage from "../pages/shared/ProfilePage";
import StudentsPage from "../pages/academic-admin/StudentsPage";

// Điều hướng giao diện mẫu, chưa phải bảo vệ quyền truy cập.
// Khi có API đăng nhập: lấy role từ server và thêm kiểm tra quyền ở đây + ở backend.
export const pageRoles: Record<Page, Role> = {
  academic: "student",
  register: "student",
  schedule: "student",
  chat: "student",
  "chat-graduation": "student",
  "chat-history": "student",
  profile: "student",
  admin: "academic-admin",
  admissions: "academic-admin",
  knowledge: "academic-admin",
  "academic-timetable": "academic-admin",
  "academic-dashboard": "academic-admin",
  teachers: "academic-admin",
  subjects: "academic-admin",
  classes: "academic-admin",
  rooms: "academic-admin",
  terms: "academic-admin",
  "lecturer-dashboard": "lecturer",
  "teaching-classes": "lecturer",
  "teaching-schedule": "lecturer",
  grades: "lecturer",
  "system-dashboard": "system-admin",
  accounts: "system-admin",
  permissions: "system-admin",
  audit: "system-admin",
  settings: "system-admin",
  "student-password": "student",
  "lecturer-password": "lecturer",
  "academic-password": "academic-admin",
  "system-password": "system-admin",
};
export function AppRoutes({ page, onNavigate }: PageProps & { page: Page }) {
  switch (page) {
    case "academic-dashboard":
      return <StudentsPage />;
    case "admissions":
      return <AdmissionsPage />;
    case "knowledge":
      return <KnowledgePage />;
    case "academic-timetable":
      return <AcademicTimetable onNavigate={onNavigate} />;
    case "teachers":
      return <TeachersPage />;
    case "subjects":
      return <SubjectsPage />;
    case "classes":
      return <ClassesPage />;
    case "rooms":
      return <RoomsPage />;
    case "terms":
      return <TermsPage />;
    case "lecturer-dashboard":
    case "teaching-classes":
      return <TeachingClasses onNavigate={onNavigate} />;
    case "teaching-schedule":
      return <TeachingSchedule />;
    case "grades":
      return <GradesPage />;
    case "accounts":
      return <AccountsPage />;
    case "system-dashboard":
    case "permissions":
    case "audit":
    case "settings":
      return <AccountsPage />;
    case "student-password":
    case "lecturer-password":
    case "academic-password":
    case "system-password":
      return <PasswordForm />;

    case "academic":
      return <AcademicPage onNavigate={onNavigate} />;
    case "register":
      return <CourseRegistrationPage />;
    case "schedule":
      return <SchedulePage />;
    case "chat":
    case "chat-graduation":
    case "chat-history":
      return <ChatPage page={page} onNavigate={onNavigate} />;
    case "profile":
      return <ProfilePage />;
    case "admin":
      return <StudentsPage />;
  }
}
