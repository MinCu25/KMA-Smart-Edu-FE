import { passwordRequest } from "../../services/api/requestBuilders";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { useFormErrors } from "../../hooks/useFormErrors";
import { validatePasswordForm } from "../../utils/profileValidation";
import { Card } from "./Card";
import "./password-form.css";
export function PasswordForm() {
  const { changePassword, session, role } = useAuth();
  const admin = role === "academic-admin" || role === "system-admin" || role === "student";
  const [visible, setVisible] = useState<Record<string, boolean>>({});
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
    return errors;
  });
  return (
    <>
    {admin && <div className="page-title"><div><h1>{session?.requirePasswordChange ? "Đổi mật khẩu lần đầu" : "Đổi mật khẩu"}</h1><p>Cập nhật mật khẩu cho tài khoản {role === "system-admin" ? "Admin hệ thống" : role === "student" ? "Sinh viên" : "Admin học vụ"}.</p></div></div>}
    <Card title={admin ? "Thông tin mật khẩu" : "Đổi mật khẩu"} className={admin ? "admin-password-panel" : ""}>
      {session?.requirePasswordChange && (
        <p className="notice yellow">
          Vui lòng đặt mật khẩu mới trước khi tiếp tục sử dụng hệ thống.
        </p>
      )}
      <form
        noValidate
        onReset={() => { form.reset(); setVisible({}); }}
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
                <div className={admin ? "admin-password-control" : ""}>
                <input
                  name={name}
                  type={visible[name] ? "text" : "password"}
                  disabled={pending}
                  autoComplete={
                    name === "currentPassword"
                      ? "current-password"
                      : "new-password"
                  }
                  {...form.props(name)}
                />
                {admin && <button type="button" disabled={pending} aria-label={(visible[name] ? "Ẩn " : "Hiện ") + label.toLowerCase()} aria-pressed={!!visible[name]} onClick={() => setVisible(current => ({...current, [name]: !current[name]}))}>{visible[name] ? "Ẩn" : "Hiện"}</button>}
                </div>
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
        <div className={admin ? "admin-password-actions" : ""}>
        {admin && <button type="reset" className="btn" disabled={pending}>Xóa nội dung</button>}
        <button className="btn primary" disabled={pending}>
          {pending ? "Đang lưu…" : "Đổi mật khẩu"}
        </button>
        </div>
      </form>
    </Card>
    </>
  );
}
