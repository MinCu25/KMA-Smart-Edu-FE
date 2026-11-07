import { memo, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Eye, EyeOff, CheckCircle2, LogOut } from "lucide-react";
import { roleHome, roleNames } from "../../config/navigation";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import type { PageProps } from "../../types/navigation";
import template from "./home.html?raw";
import { initializeHome } from "./homeBehavior.js";
import "./fonts.css";
import "./home.css";
import "./integration.css";

const assetBase = `${import.meta.env.BASE_URL}home/assets/`;
const markup = template.replaceAll("__HOME_ASSETS__/", assetBase);

// The trusted, bundled archive markup stays stable while the React login updates.
// No API responses or user input are interpolated into this HTML.
const PortalShell = memo(function PortalShell({
  shellRef,
}: {
  shellRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      className="kma-home"
      ref={shellRef}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
});

function HomeLogin({ onNavigate }: PageProps) {
  const { login } = useAuth();
  const { notify } = useUI();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({ username: "", password: "" });
  const [help, setHelp] = useState(false);
  const submitting = useRef(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  return (
    <form
      id="login-form"
      aria-busy={pending}
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (submitting.current) return;
        const nextErrors = {
          username: username.trim() ? "" : "Vui lòng nhập tài khoản.",
          password: password ? "" : "Vui lòng nhập mật khẩu.",
        };
        setErrors(nextErrors);
        setError("");
        if (nextErrors.username || nextErrors.password) {
          (nextErrors.username ? usernameRef : passwordRef).current?.focus();
          return;
        }
        submitting.current = true;
        setPending(true);
        try {
          // Authorization and the destination always come from the role
          // returned by the existing authentication service.
          const result = await login(username.trim(), password);
          if (result.ok) {
            setPassword("");
            if (result.page.endsWith("-password")) onNavigate(result.page);
            notify("Đăng nhập thành công.");
          } else setError(result.message);
        } catch (cause) {
          setError(
            cause instanceof Error ? cause.message : "Đăng nhập thất bại.",
          );
        } finally {
          submitting.current = false;
          setPending(false);
        }
      }}
    >
      <label htmlFor="account">Tài khoản</label>
      <input
        ref={usernameRef}
        id="account"
        name="username"
        placeholder="Tên đăng nhập"
        autoComplete="username"
        required
        disabled={pending}
        value={username}
        aria-invalid={!!errors.username}
        aria-describedby={errors.username ? "home-username-error" : undefined}
        onChange={(event) => {
          setUsername(event.target.value);
          setErrors((current) => ({ ...current, username: "" }));
          setError("");
        }}
      />
      {errors.username && (
        <p className="home-field-error" id="home-username-error">
          {errors.username}
        </p>
      )}
      <label htmlFor="password">Mật khẩu</label>
      <div className="password-field">
        <input
          ref={passwordRef}
          id="password"
          name="password"
          type={visible ? "text" : "password"}
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          required
          disabled={pending}
          value={password}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "home-password-error" : undefined}
          onChange={(event) => {
            setPassword(event.target.value);
            setErrors((current) => ({ ...current, password: "" }));
            setError("");
          }}
        />
        <button
          type="button"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={visible}
          disabled={pending}
          onClick={() => setVisible(!visible)}
        >
          {visible ? (
            <EyeOff className="icon" aria-hidden="true" />
          ) : (
            <Eye className="icon" aria-hidden="true" />
          )}
        </button>
      </div>
      {errors.password && (
        <p className="home-field-error" id="home-password-error">
          {errors.password}
        </p>
      )}
      <div className="form-assist">
        <span>Tài khoản do Học viện cung cấp</span>
        <button
          type="button"
          aria-expanded={help}
          aria-controls="home-password-help"
          onClick={() => setHelp(!help)}
        >
          Quên mật khẩu?
        </button>
      </div>
      {help && (
        <p id="home-password-help" className="home-password-help">
          Liên hệ quản trị viên và cung cấp mã tài khoản cùng email đã đăng ký
          để được gửi mật khẩu tạm qua email.
        </p>
      )}
      <button type="submit" className="primary login-submit" disabled={pending}>
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
        <ArrowRight className="icon" aria-hidden="true" />
      </button>
      {error && (
        <p className="login-note changed" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function HomeAccount({
  onNavigate,
  compact = false,
}: PageProps & { compact?: boolean }) {
  const { session, role, logout } = useAuth();
  const { notifyError, setDialog } = useUI();
  if (!session) return null;
  const name = session.user.fullName || session.user.username;
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
  const enterLabel =
    role === "student"
      ? "Vào trang sinh viên"
      : role === "lecturer"
        ? "Vào trang giảng viên"
        : "Vào trang quản lý";
  const enter = () => onNavigate(roleHome[role]);
  return (
    <div className={compact ? "home-account-compact" : "home-account-panel"}>
      {!compact && (
        <p className="home-session-status">
          <CheckCircle2 size={16} aria-hidden="true" />
          Đăng nhập thành công
        </p>
      )}
      <button
        type="button"
        className="home-account-identity"
        onClick={enter}
        aria-label={`${enterLabel} của ${name}`}
      >
        <span className="home-account-avatar">{initials}</span>
        <span>
          <strong>{name}</strong>
          <small>{roleNames[role]}</small>
        </span>
        {compact && <ArrowRight size={17} aria-hidden="true" />}
      </button>
      {!compact && (
        <>
          <p className="home-account-description">
            {role === "system-admin"
              ? "Quản lý tài khoản, phân nhóm người dùng và bảo vệ truy cập hệ thống."
              : role === "academic-admin"
                ? "Tiếp nhận nhập học, quản lý sinh viên và tổ chức đào tạo."
                : role === "lecturer"
                  ? "Theo dõi lớp học phần, lịch giảng dạy và quản lý điểm."
                  : "Tra cứu học vụ, đăng ký học phần và theo dõi thời khóa biểu."}
          </p>
          <button
            type="button"
            className="primary login-submit"
            onClick={enter}
          >
            {enterLabel}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="home-account-logout"
            onClick={() =>
              setDialog({
                title: "Đăng xuất",
                body: "Bạn muốn đăng xuất khỏi tài khoản hiện tại?",
                confirm: "Đăng xuất",
                action: async () => {
                  try {
                    await logout();
                  } catch (e) {
                    notifyError(
                      e instanceof Error ? e.message : "Đăng xuất thất bại.",
                    );
                  }
                },
              })
            }
          >
            <LogOut size={15} aria-hidden="true" />
            Đăng xuất
          </button>
        </>
      )}
    </div>
  );
}

export default function HomePage({ onNavigate }: PageProps) {
  const { logged } = useAuth();
  const shell = useRef<HTMLDivElement>(null);
  const [loginRoot, setLoginRoot] = useState<HTMLElement | null>(null);
  const [accountRoot, setAccountRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const heading = shell.current?.querySelector("#access-heading");
    if (heading)
      heading.textContent = logged
        ? "Tài khoản đã đăng nhập"
        : "Đăng nhập hệ thống";
    shell.current
      ?.querySelector(".access-panel")
      ?.classList.toggle("is-authenticated", logged);
  }, [logged, loginRoot]);
  useEffect(() => {
    const root = shell.current;
    if (!root) return;
    const previousTitle = document.title;
    document.title = "Cổng thông tin đào tạo | Học viện Kỹ thuật Mật mã";
    setLoginRoot(root.querySelector<HTMLElement>("#portal-login-root"));
    setAccountRoot(root.querySelector<HTMLElement>("#portal-account-root"));
    const cleanup = initializeHome(root, assetBase);
    return () => {
      cleanup();
      document.title = previousTitle;
    };
  }, []);
  return (
    <>
      <PortalShell shellRef={shell} />
      {loginRoot &&
        createPortal(
          logged ? (
            <HomeAccount onNavigate={onNavigate} />
          ) : (
            <HomeLogin onNavigate={onNavigate} />
          ),
          loginRoot,
        )}
      {logged &&
        accountRoot &&
        createPortal(
          <HomeAccount compact onNavigate={onNavigate} />,
          accountRoot,
        )}
    </>
  );
}
