import { useState } from "react";
import type { StudentResponse } from "../../services/api/backendContract";
import { useAuth } from "../../context/AuthContext";
import { useFormErrors } from "../../hooks/useFormErrors";
import {
  validateEmail,
  validatePhone,
  normalizePhone,
  validateTarget,
} from "../../utils/profileValidation";
import { updateStudent } from "../../services/mock/dtoService";
import { studentView } from "../../services/adapters";
import { Card } from "../../components/common";
import { useDemoData } from "../../context/DemoDataContext";
import { useUI } from "../../context/UIContext";
export default function ProfilePage() {
  const { target, setTarget, studentData, updateStudents } = useDemoData();

  const { session, users, setUsers } = useAuth();
  const currentStudent = studentData.find(
    (s) => s.dto.studentCode === session?.user.username,
  )?.dto;
  if (!currentStudent)
    return (
      <Card title="Tài khoản cá nhân">
        Không tìm thấy hồ sơ sinh viên của tài khoản đang đăng nhập.
      </Card>
    );
  return (
    <ProfileForm
      currentStudent={currentStudent}
      target={target}
      duplicate={(email) =>
        [
          ...studentData.map((s) => ({ username: s.id, email: s.dto.email })),
          ...users,
        ].some(
          (u) =>
            u.username !== session?.user.username &&
            (u.email ?? "").trim().toLowerCase() === email,
        )
      }
      saveContact={(email, phone) => {
        updateStudents(
          studentData.map((s) =>
            s.dto.id === currentStudent.id
              ? studentView(updateStudent(s.dto, { email, phone }))
              : s,
          ),
        );
        setUsers((old) =>
          old.map((u) => (u.id === session?.user.id ? { ...u, email } : u)),
        );
      }}
      saveTarget={(value) => {
        updateStudents(
          studentData.map((s) =>
            s.dto.id === currentStudent.id
              ? studentView(updateStudent(s.dto, { targetGpa: Number(value) }))
              : s,
          ),
        );
        setTarget(value);
      }}
    />
  );
}
export function ProfileForm({
  currentStudent,
  target,
  live = false,
  duplicate,
  saveContact,
  saveTarget,
}: {
  currentStudent: Pick<
    StudentResponse,
    "fullName" | "studentCode" | "email" | "phone" | "className" | "majorName"
  >;
  target: string;
  live?: boolean;
  duplicate?: (email: string) => boolean;
  saveContact: (email: string, phone: string) => void | Promise<void>;
  saveTarget: (value: string) => void | Promise<void>;
}) {
  const { notify } = useUI();
  const [pending, setPending] = useState(false);
  const contactForm = useFormErrors((f) => ({
    email: live
      ? []
      : [
          validateEmail(String(f.get("email") ?? "")),
          duplicate?.(
            String(f.get("email") ?? "")
              .trim()
              .toLowerCase(),
          )
            ? "Email đã được sử dụng."
            : "",
        ].filter(Boolean),
    phone:
      live && !f.get("phone")
        ? []
        : [validatePhone(String(f.get("phone") ?? ""))].filter(Boolean),
  }));
  const targetForm = useFormErrors((f) => ({
    targetGpa:
      live && !f.get("targetGpa")
        ? []
        : [validateTarget(String(f.get("targetGpa") ?? ""))].filter(Boolean),
  }));
  function fieldError(form: typeof contactForm, name: string) {
    return form.errors[name]?.length ? (
      <div id={`${name}-error`} className="field-error" aria-live="polite">
        {form.errors[name].map((message) => (
          <div key={message}>{message}</div>
        ))}
      </div>
    ) : null;
  }
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Tài khoản cá nhân</h1>
          <p>Cập nhật thông tin liên hệ và GPA mục tiêu.</p>
        </div>
      </div>
      <div className="profile-layout">
        <Card title="Thông tin cá nhân">
          <form
            noValidate
            onChange={contactForm.onChange}
            onSubmit={async (e) => {
              e.preventDefault();
              if (pending || !contactForm.check(e.currentTarget)) return;
              const f = new FormData(e.currentTarget);
              setPending(true);
              try {
                await saveContact(
                  String(f.get("email") ?? "")
                    .trim()
                    .toLowerCase(),
                  normalizePhone(String(f.get("phone") ?? "")),
                );
                notify("Đã lưu thông tin liên hệ.");
              } catch (e) {
                contactForm.applyError(e);
              } finally {
                setPending(false);
              }
            }}
          >
            <div className="form-row">
              <label>
                MSSV
                <input disabled value={currentStudent.studentCode} />
              </label>
              <label>
                Họ và tên
                <input disabled value={currentStudent.fullName} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Email
                <input
                  {...contactForm.props("email")}
                  name="email"
                  type="email"
                  disabled={live}
                  defaultValue={currentStudent.email ?? ""}
                  required
                />
                {fieldError(contactForm, "email")}
              </label>
              <label>
                Số điện thoại
                <input
                  {...contactForm.props("phone")}
                  name="phone"
                  defaultValue={currentStudent.phone ?? ""}
                  type="tel"
                  autoComplete="tel"
                  required
                />
                {fieldError(contactForm, "phone")}
              </label>
            </div>
            <div className="form-row">
              <label>
                Lớp
                <input disabled value={currentStudent.className ?? ""} />
              </label>
              <label>
                Ngành
                <input disabled value={currentStudent.majorName ?? ""} />
              </label>
            </div>
            <div className="form-actions">
              {contactForm.formError && (
                <p className="field-error" role="alert">
                  {contactForm.formError}
                </p>
              )}
              <button disabled={pending} className="btn primary">
                Lưu cập nhật
              </button>
            </div>
          </form>
        </Card>
        <Card title="GPA mục tiêu">
          <form
            noValidate
            onChange={targetForm.onChange}
            onSubmit={async (e) => {
              e.preventDefault();
              if (pending || !targetForm.check(e.currentTarget)) return;
              const value = String(
                new FormData(e.currentTarget).get("targetGpa") ?? "",
              );
              setPending(true);
              try {
                await saveTarget(value);
                notify("Đã cập nhật GPA mục tiêu.");
              } catch (e) {
                targetForm.applyError(e);
              } finally {
                setPending(false);
              }
            }}
          >
            <label>
              GPA mục tiêu (thang 4)
              <input
                {...targetForm.props("targetGpa")}
                name="targetGpa"
                type="number"
                min="0"
                max="4"
                step="0.01"
                defaultValue={target}
                required
              />
              {fieldError(targetForm, "targetGpa")}
            </label>
            {targetForm.formError && (
              <p className="field-error" role="alert">
                {targetForm.formError}
              </p>
            )}
            <button disabled={pending} className="btn primary full">
              Lưu mục tiêu
            </button>
          </form>
        </Card>
      </div>
    </>
  );
}
