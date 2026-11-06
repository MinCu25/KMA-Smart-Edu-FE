import { memo, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
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
            onNavigate(result.page);
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
      <p className="login-note">
        Sử dụng tài khoản được cấp. Hệ thống mở giao diện theo quyền tài khoản
        sau khi đăng nhập.
      </p>
    </form>
  );
}

export default function HomePage({ onNavigate }: PageProps) {
  const shell = useRef<HTMLDivElement>(null);
  const [loginRoot, setLoginRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const root = shell.current;
    if (!root) return;
    const previousTitle = document.title;
    document.title = "Cổng thông tin đào tạo | Học viện Kỹ thuật Mật mã";
    setLoginRoot(root.querySelector<HTMLElement>("#portal-login-root"));
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
        createPortal(<HomeLogin onNavigate={onNavigate} />, loginRoot)}
    </>
  );
}
