import { backendEnabled } from "../services/api/httpClient";
import { LiveAccountPage } from "../pages/auth/LiveAccountPage";
import { roleHome, passwordPage } from "../config/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import { AppDialog } from "../components/common/AppDialog";
import { Toast } from "../components/common/Toast";
import StudentLayout from "../layouts/StudentLayout";
import AdminLayout from "../layouts/AdminLayout";
import LoginPage from "../pages/auth/LoginPage";
import { AppRoutes, pageRoles } from "../routes/AppRoutes";
import type { Page } from "../types/navigation";
export default function App() {
  const readPage = (): Page => {
    const hash = window.location.hash.slice(1);
    const raw = hash === "academic-dashboard" ? "admin" : hash;
    const value = [
      "system-dashboard",
      "permissions",
      "audit",
      "settings",
    ].includes(raw)
      ? "accounts"
      : raw;
    return Object.hasOwn(pageRoles, value) ? (value as Page) : "register";
  };
  const [page, setPage] = useState<Page>(readPage);
  useEffect(() => {
    const change = () => setPage(readPage());
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  const { logged, logout, role, session } = useAuth();
  const { setDialog, notify, notifyError, dismissToast } = useUI();
  function navigate(next: Page) {
    if (next === "academic-dashboard") next = "admin";
    if (["system-dashboard", "permissions", "audit", "settings"].includes(next))
      next = "accounts";
    dismissToast();
    window.location.hash = next;
    setPage(next);
    window.scrollTo({ top: 0 });
  }
  function confirmLogout() {
    setDialog({
      title: "Đăng xuất",
      body: "Bạn có chắc chắn muốn đăng xuất khỏi phiên đăng nhập?",
      confirm: "Đăng xuất",
      action: async () => {
        try {
          await logout();
        } catch (e) {
          notifyError(e instanceof Error ? e.message : "Đăng xuất thất bại.");
          return;
        }
        notify("Đã đăng xuất khỏi phiên đăng nhập.");
      },
    });
  }
  const activePage =
    logged && session?.requirePasswordChange
      ? passwordPage[role]
      : logged && pageRoles[page] !== role
        ? roleHome[role]
        : page;
  useEffect(() => {
    if (logged && pageRoles[page] !== role) {
      window.location.hash = roleHome[role];
      setPage(roleHome[role]);
    }
  }, [logged, role, page]);
  const content =
    backendEnabled && activePage !== passwordPage[role] ? (
      <LiveAccountPage
        key={activePage}
        page={activePage}
        onNavigate={navigate}
      />
    ) : (
      <AppRoutes page={activePage} onNavigate={navigate} />
    );
  return (
    <div onSubmitCapture={dismissToast}>
      {!logged ? (
        <LoginPage onNavigate={navigate} />
      ) : pageRoles[activePage] !== "student" ? (
        <AdminLayout
          page={activePage}
          role={pageRoles[activePage]}
          onNavigate={navigate}
          onLogout={confirmLogout}
        >
          {content}
        </AdminLayout>
      ) : (
        <StudentLayout
          page={activePage}
          onNavigate={navigate}
          onLogout={confirmLogout}
        >
          {content}
        </StudentLayout>
      )}
      <Toast />
      <AppDialog />
    </div>
  );
}
