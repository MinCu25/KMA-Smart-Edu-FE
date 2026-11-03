import { useAuth } from "../../context/AuthContext";
import { useFormErrors } from "../../hooks/useFormErrors";
import {
  validateEmail,
  validatePhone,
  normalizePhone,
  validateTarget,
} from "../../utils/profileValidation";
import type { UpdateStudentRequest } from "../../types/dto";
import { updateStudent } from "../../services/mock/dtoService";
import { studentView } from "../../services/adapters";
import { Card } from "../../components/common";
import { useDemoData } from "../../context/DemoDataContext";
import { useUI } from "../../context/UIContext";
export default function ProfilePage() {
  const { target, setTarget, studentData, updateStudents } = useDemoData();
  const { notify } = useUI();
  const { session, users, setUsers } = useAuth();
  const currentStudent = studentData.find(
    (s) => s.dto.studentCode === session?.user.username,
  )?.dto;
  const contactForm = useFormErrors((f) => ({
    email: [
      validateEmail(String(f.get("email") ?? "")),
      [
        ...studentData.map((s) => ({ username: s.id, email: s.dto.email })),
        ...users,
      ].some(
        (u) =>
          u.username !== session?.user.username &&
          (u.email ?? "").trim().toLowerCase() ===
            String(f.get("email") ?? "")
              .trim()
              .toLowerCase(),
      )
        ? "Email đã được sử dụng."
        : "",
    ].filter(Boolean),
    phone: [validatePhone(String(f.get("phone") ?? ""))].filter(Boolean),
  }));
  const targetForm = useFormErrors((f) => ({
    target: [validateTarget(String(f.get("target") ?? ""))].filter(Boolean),
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
  if (!currentStudent)
    return (
      <Card title="Tài khoản cá nhân">
        Không tìm thấy hồ sơ sinh viên của tài khoản đang đăng nhập.
      </Card>
    );
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
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const email = String(f.get("email")).trim().toLowerCase();
              const phone = String(f.get("phone")).trim();
              if (!contactForm.check(e.currentTarget)) return;
              const request: UpdateStudentRequest = {
                email,
                phone: normalizePhone(phone),
              };
              try {
                updateStudents(
                  studentData.map((s) =>
                    s.dto.id === currentStudent.id
                      ? studentView(updateStudent(s.dto, request))
                      : s,
                  ),
                );
                setUsers((old) =>
                  old.map((u) =>
                    u.id === session?.user.id ? { ...u, email } : u,
                  ),
                );
                notify("Đã lưu thông tin liên hệ.");
              } catch {
                contactForm.setFormError(
                  "Không thể lưu thông tin liên hệ. Vui lòng kiểm tra quyền lưu dữ liệu của trình duyệt rồi thử lại.",
                );
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
                  defaultValue={currentStudent.email}
                  required
                />
                {fieldError(contactForm, "email")}
              </label>
              <label>
                Số điện thoại
                <input
                  {...contactForm.props("phone")}
                  name="phone"
                  defaultValue={currentStudent.phone}
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
                <input disabled value={currentStudent.className} />
              </label>
              <label>
                Ngành
                <input disabled value={currentStudent.majorName} />
              </label>
            </div>
            <div className="form-actions">
              {contactForm.formError && (
                <p className="field-error" role="alert">
                  {contactForm.formError}
                </p>
              )}
              <button className="btn primary">Lưu cập nhật</button>
            </div>
          </form>
        </Card>
        <Card title="GPA mục tiêu">
          <form
            noValidate
            onChange={targetForm.onChange}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const value = String(f.get("target"));
              if (!targetForm.check(e.currentTarget)) return;
              const request: UpdateStudentRequest = {
                targetGpa: Number(value),
              };
              updateStudents(
                studentData.map((s) =>
                  s.dto.id === currentStudent.id
                    ? studentView(updateStudent(s.dto, request))
                    : s,
                ),
              );
              setTarget(value);
              notify("Đã cập nhật GPA mục tiêu.");
            }}
          >
            <label>
              GPA mục tiêu (thang 4)
              <input
                {...targetForm.props("target")}
                name="target"
                type="number"
                min="0"
                max="4"
                step="0.01"
                defaultValue={target}
                required
              />
              {fieldError(targetForm, "target")}
            </label>
            {targetForm.formError && (
              <p className="field-error" role="alert">
                {targetForm.formError}
              </p>
            )}
            <button className="btn primary full">Lưu mục tiêu</button>
          </form>
        </Card>
      </div>
    </>
  );
}
