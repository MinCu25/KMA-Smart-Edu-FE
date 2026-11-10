import { passwordRequest } from "../../services/api/requestBuilders";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { useFormErrors } from "../../hooks/useFormErrors";
import { validatePasswordForm } from "../../utils/profileValidation";
import { Card } from "./Card";
export function PasswordForm() {
  const { changePassword, session } = useAuth();
  const { notify } = useUI();
  const [pending, setPending] = useState(false);
  const form = useFormErrors((f) => {
    const errors = validatePasswordForm(f, !!session?.requirePasswordChange);
    if (
      f.get("newPassword") &&
      f.get("currentPassword") === f.get("newPassword")
    )
      errors.newPassword = [
        ...errors.newPassword,
        "Mật khẩu mới phải khác mật khẩu hiện tại.",
      ];
    if (f.get("newPassword") === session?.user.username)
      errors.newPassword.push("Mật khẩu mới phải khác tên đăng nhập.");
    return errors;
  });
  return (
    <Card title="Đổi mật khẩu">
      {session?.requirePasswordChange && (
        <p className="notice yellow">
          Vui lòng đặt mật khẩu mới trước khi tiếp tục sử dụng hệ thống.
        </p>
      )}
      <form
        noValidate
        onChange={form.onChange}
        onSubmit={async (e) => {
          e.preventDefault();
          if (pending || !form.check(e.currentTarget)) return;
          const element = e.currentTarget;
          const f = new FormData(element);
          setPending(true);
          try {
            if (
              !(await changePassword(
                passwordRequest(f, !!session?.requirePasswordChange),
              ))
            ) {
              form.setErrors((old) => ({
                ...old,
                currentPassword: ["Mật khẩu hiện tại không đúng."],
              }));
              return;
            }
            element.reset();
            form.reset();
            notify(
              "Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.",
            );
          } catch (e) {
            form.applyError(e);
          } finally {
            setPending(false);
          }
        }}
      >
        <div className="form-row">
          {[
            ["currentPassword", "Mật khẩu hiện tại"],
            ["newPassword", "Mật khẩu mới"],
            ["confirmPassword", "Xác nhận mật khẩu mới"],
          ]
            .filter(
              ([name]) =>
                name !== "currentPassword" || !session?.requirePasswordChange,
            )
            .map(([name, label]) => (
              <label key={name}>
                {label}
                <input
                  name={name}
                  type="password"
                  disabled={pending}
                  autoComplete={
                    name === "currentPassword"
                      ? "current-password"
                      : "new-password"
                  }
                  {...form.props(name)}
                />
                {!!form.errors[name]?.length && (
                  <div
                    id={`${name}-error`}
                    className="field-error"
                    aria-live="polite"
                  >
                    {form.errors[name].map((error) => (
                      <div key={error}>{error}</div>
                    ))}
                  </div>
                )}
              </label>
            ))}
        </div>
        {form.formError && (
          <p role="alert" className="field-error">
            {form.formError}
          </p>
        )}
        <button className="btn primary" disabled={pending}>
          {pending ? "Đang lưu…" : "Đổi mật khẩu"}
        </button>
      </form>
    </Card>
  );
}
