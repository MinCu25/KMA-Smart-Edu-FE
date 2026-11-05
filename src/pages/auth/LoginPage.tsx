import { useFormErrors } from "../../hooks/useFormErrors";
import { useState } from "react";
import { useUI } from "../../context/UIContext";
import { Brand } from "../../components/common";
import { useAuth } from "../../context/AuthContext";
import type { PageProps } from "../../types/navigation";
export default function LoginPage({ onNavigate }: PageProps) {
  const { notify, notifyError, dismissToast } = useUI();
  const { login } = useAuth();
  const [pending, setPending] = useState(false);
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
            const result = await login(username.trim(), password);
            if (result.ok) {
              onNavigate(result.page);
              notify("Đăng nhập thành công.");
            } else notifyError(result.message);
            setPending(false);
          }}
        >
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
