import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";
import { studentNavigation } from "../config/navigation";
import type { Page, PageProps } from "../types/navigation";
import "./academic-portal.css";
import "./student-portal.css";
type Props = PageProps & { page: Page; children: ReactNode; onLogout: () => void };
export default function StudentLayout({ page, children, onNavigate, onLogout }: Props) {
  const { session } = useAuth();
  const menu = [...studentNavigation, { id: "profile" as const, label: "Hồ sơ cá nhân" }, { id: "student-password" as const, label: "Đổi mật khẩu" }];
  const firstLogin = !!session?.requirePasswordChange;
  return <div className="academic-portal student-portal">
    <a className="academic-skip" href="#student-content">Bỏ qua điều hướng</a>
    <div className="academic-utility"><div className="academic-container"><span>KMA SMART EDU / CỔNG THÔNG TIN SINH VIÊN</span><span>Không gian học tập</span></div></div>
    <header className="academic-masthead academic-container"><button className="academic-identity" onClick={() => onNavigate(firstLogin ? "student-password" : "academic")}><img src={`${import.meta.env.BASE_URL}home/assets/logo.png`} alt="Huy hiệu Học viện Kỹ thuật Mật mã" /><span><strong>HỌC VIỆN KỸ THUẬT MẬT MÃ</strong><b>Hệ thống quản lý đào tạo</b><small>Academy of Cryptography Techniques</small></span></button><div className="academic-account"><span className="academic-avatar">SV</span><div><strong>{session?.user.fullName || session?.user.username}</strong><small>{session?.user.username} · Sinh viên</small></div></div></header>
    <nav className="academic-nav" aria-label="Chức năng sinh viên"><div className="academic-container">{menu.map(item => <button key={item.id} disabled={firstLogin && item.id !== "student-password"} aria-current={page === item.id || item.id === "chat" && page.startsWith("chat-") ? "page" : undefined} onClick={() => onNavigate(item.id)}>{item.label}</button>)}<button onClick={onLogout}>Đăng xuất</button></div></nav>
    <main id="student-content" className="academic-container" tabIndex={-1}><div className="academic-breadcrumb"><span>Sinh viên</span><span>/</span><span>{menu.find(item => item.id === page)?.label || "Trợ lý AI"}</span></div>{children}</main>
    <footer className="academic-footer"><div className="academic-container"><span>© 2026 Học viện Kỹ thuật Mật mã</span><span>KMA Smart Edu · Cổng sinh viên</span></div></footer>
  </div>;
}
