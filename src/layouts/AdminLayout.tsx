import { useAuth } from "../context/AuthContext";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarDays,
  Shield,
  Settings,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { Brand } from "../components/common";
import { DemoFooter } from "../components/common/DemoFooter";
import {
  academicAdminNavigation,
  lecturerNavigation,
  systemNavigation,
  roleNames,
  roleHome,
} from "../config/navigation";
import type { PageProps, Page, Role } from "../types/navigation";
import "./academic-portal.css";
type Props = PageProps & {
  children: ReactNode;
  onLogout: () => void;
  page: Page;
  role: Role;
};
export default function AdminLayout({
  children,
  onNavigate,
  onLogout,
  page,
  role,
}: Props) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  const menu =
    role === "lecturer"
      ? lecturerNavigation
      : role === "system-admin"
        ? systemNavigation
        : academicAdminNavigation;
  const icons = [
    LayoutDashboard,
    Users,
    BookOpen,
    CalendarDays,
    Shield,
    ClipboardList,
    Settings,
  ];
  if (role === "academic-admin" || role === "system-admin") {
    const system = role === "system-admin";
    const labels: Record<string, string> = { admissions: "Nhập học", admin: "Sinh viên", teachers: "Giảng viên", subjects: "Học phần", classes: "Lớp học phần", rooms: "Phòng học", terms: "Kỳ học & đăng ký", "academic-timetable": "Thời khóa biểu", knowledge: "Tri thức AI" };
    return (
      <div className={"academic-portal management-app" + (system ? " system-portal" : "")}>
        <a className="academic-skip" href="#academic-content">Bỏ qua điều hướng</a>
        <div className="academic-utility"><div className="academic-container"><span>KMA SMART EDU / {system ? "QUẢN TRỊ HỆ THỐNG" : "QUẢN TRỊ HỌC VỤ"}</span><span>Không gian quản lý đào tạo</span></div></div>
        <header className="academic-masthead academic-container">
          <button className="academic-identity" onClick={() => onNavigate(system ? "accounts" : "admissions")}>
            <img src={`${import.meta.env.BASE_URL}home/assets/logo.png`} alt="Huy hiệu Học viện Kỹ thuật Mật mã" />
            <span><strong>HỌC VIỆN KỸ THUẬT MẬT MÃ</strong><b>Hệ thống quản lý đào tạo</b><small>Academy of Cryptography Techniques</small></span>
          </button>
          <div className="academic-account"><span className="academic-avatar">{system ? "HT" : "HV"}</span><div><strong>{session?.user.fullName || session?.user.username || roleNames[role]}</strong><small>{roleNames[role]}</small>{!system && <div><button onClick={() => onNavigate("academic-password")}>Đổi mật khẩu</button><span>·</span><button onClick={onLogout}>Đăng xuất</button></div>}</div></div>
        </header>
        <nav className="academic-nav" aria-label={system ? "Quản trị hệ thống" : "Các chức năng học vụ"}><div className="academic-container">{menu.filter(item => item.id !== "academic-password").map(item => <button key={item.id} aria-current={page === item.id ? "page" : undefined} onClick={() => onNavigate(item.id)}>{labels[item.id] || item.label}</button>)}{system && <button onClick={onLogout}>Đăng xuất</button>}</div></nav>
        <main id="academic-content" className="academic-container" tabIndex={-1}><div className="academic-breadcrumb"><span>{system ? "Admin hệ thống" : "Học vụ"}</span><span>/</span><span>{menu.find(item => item.id === page)?.label}</span></div>{children}</main>
        <footer className="academic-footer"><div className="academic-container"><span>© 2026 Học viện Kỹ thuật Mật mã</span><span>KMA Smart Edu · {system ? "Quản trị hệ thống" : "Quản trị đào tạo"}</span></div></footer>
      </div>
    );
  }
  return (
    <div
      className={"app admin-app management-app " + (open ? "sidebar-open" : "")}
    >
      <button
        className="sidebar-shade"
        aria-label="Đóng menu"
        onClick={() => setOpen(false)}
      />
      <aside id="management-sidebar" className="admin-sidebar">
        <Brand />
        <span className="sidebar-caption">KHÔNG GIAN LÀM VIỆC</span>
        <div className="role-switch">
          <strong>{roleNames[role]}</strong>
        </div>
        <nav className="admin-menu">
          {menu.map((item, i) => {
            const Icon = icons[i % icons.length];
            return (
              <button
                key={item.id}
                className={page === item.id ? "selected" : ""}
                aria-current={page === item.id ? "page" : undefined}
                onClick={() => {
                  onNavigate(item.id);
                  setOpen(false);
                }}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="admin-bottom">
          <button onClick={onLogout}>
            <LogOut size={15} />
            Đăng xuất
          </button>
        </div>
      </aside>
      <main>
        <header className="management-topbar">
          <div>
            <button
              className="btn mobile-sidebar-toggle"
              aria-label={open ? "Đóng menu" : "Mở menu"}
              aria-expanded={open}
              aria-controls="management-sidebar"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <span>{roleNames[role]}</span>
            <ChevronRight size={13} />
            <b>{menu.find((m) => m.id === page)?.label}</b>
          </div>
          <div className="staff-account">
            <span className="staff-avatar">
              {role === "lecturer"
                ? "QH"
                  : "HV"}
            </span>
            <span>
              <b>{session?.user.fullName || session?.user.username}</b>
              <small>{session?.user.username}</small>
            </span>
          </div>
        </header>
        {children}
        <DemoFooter onNavigate={onNavigate} admin />
      </main>
    </div>
  );
}
