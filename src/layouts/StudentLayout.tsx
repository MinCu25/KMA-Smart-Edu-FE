import { useAuth } from "../context/AuthContext";
import { useState, type ReactNode } from "react";
import { LogOut, Menu, UserRound } from "lucide-react";
import { Brand } from "../components/common";
import { DemoFooter } from "../components/common/DemoFooter";
import { studentNavigation } from "../config/navigation";
import type { Page, PageProps } from "../types/navigation";
type Props = PageProps & {
  page: Page;
  children: ReactNode;
  onLogout: () => void;
};
export default function StudentLayout({
  page,
  children,
  onNavigate,
  onLogout,
}: Props) {
  const { session } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  function go(next: Page) {
    setAccountOpen(false);
    setMobile(false);
    onNavigate(next);
  }
  return (
    <div className="app">
      <header className="student-header">
        <Brand />
        <button
          className="mobile-menu"
          aria-label="Mở menu"
          onClick={() => setMobile(!mobile)}
        >
          <Menu size={20} />
        </button>
        <nav className={mobile ? "expanded" : ""}>
          {studentNavigation.map((item) => (
            <button
              className={
                page === item.id ||
                (item.id === "chat" && page.startsWith("chat-"))
                  ? "selected"
                  : ""
              }
              key={item.id}
              onClick={() => go(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="account">
          <button
            className="account-button"
            onClick={() => setAccountOpen(!accountOpen)}
            aria-expanded={accountOpen}
          >
            <b>{session?.user.fullName}</b>
            <span>Sinh viên</span>
          </button>
          {accountOpen && (
            <div className="account-menu">
              <button onClick={() => go("profile")}>
                <UserRound size={14} />
                Tài khoản cá nhân
              </button>
              <button onClick={() => go("student-password")}>
                Đổi mật khẩu
              </button>
              <button
                onClick={() => {
                  setAccountOpen(false);
                  onLogout();
                }}
              >
                <LogOut size={14} />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </header>
      <main>
        {children}
        <DemoFooter onNavigate={go} />
      </main>
    </div>
  );
}
