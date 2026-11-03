import { useFormErrors } from "../../hooks/useFormErrors";
import { useState } from "react";
import { useUI } from "../../context/UIContext";
import { Brand } from "../../components/common";
import { useAuth } from "../../context/AuthContext";
import { roleNames, roleHome } from "../../config/navigation";
import type { PageProps, Role } from "../../types/navigation";
export default function LoginPage({ onNavigate }: PageProps) {
  const { notify, notifyError, dismissToast } = useUI();
  const { login } = useAuth();
  const [pending, setPending] = useState(false);
  const [role, setRole] = useState<Role>("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const form = useFormErrors((data) => ({
    username: String(data.get("username") ?? "").trim()
      ? []
      : ["Vui lòng nhập tên đăng nhập."],
    password: String(data.get("password") ?? "").trim()
      ? []
      : ["Vui lòng nhập mật khẩu."],
  }));
  return (
    <div className="login-background">
      <section className="login-box">
        <Brand />
        <h1>Đăng nhập</h1>
        <p>Chọn vai trò để vào không gian làm việc của bạn.</p>
        <form
          noValidate
          onChange={(e) => {
            dismissToast();
            form.onChange(e);
          }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!form.check(e.currentTarget)) return;
            if (pending) return;
            setPending(true);
            const error = await login(username.trim(), password, role);
            if (!error) {
              onNavigate(roleHome[role]);
              notify("Đăng nhập thành công.");
            } else notifyError(error);
            setPending(false);
          }}
        >
          <label>
            Vai trò
            <select
              disabled={pending}
              value={role}
              onChange={(e) => {
                const next = e.target.value as Role;
                form.reset();
                dismissToast();
                setRole(next);
                setUsername("");
                setPassword("");
              }}
            >
              {Object.entries(roleNames).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tên đăng nhập
            <input
              {...form.props("username")}
              name="username"
              disabled={pending}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
            {form.errors.username?.length ? (
              <div
                id="username-error"
                className="field-error"
                aria-live="polite"
              >
                {form.errors.username[0]}
              </div>
            ) : null}
          </label>
          <label>
            Mật khẩu
            <input
              {...form.props("password")}
              name="password"
              disabled={pending}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            {form.errors.password?.length ? (
              <div
                id="password-error"
                className="field-error"
                aria-live="polite"
              >
                {form.errors.password[0]}
              </div>
            ) : null}
          </label>
          <button className="btn primary" disabled={pending}>
            {pending ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>
      </section>
    </div>
  );
}
