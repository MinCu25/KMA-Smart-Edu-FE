import { useAcademic } from "../../context/AcademicContext";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { useManagement } from "../../context/ManagementContext";
import { useFormErrors } from "../../hooks/useFormErrors";
import type { ResetPasswordRequest, UserInfoResponse } from "../../types/dto";
const roles: Record<string, string> = {
  STUDENT: "Sinh viên",
  LECTURER: "Giảng viên",
  ACADEMIC_ADMIN: "Admin học vụ",
  SYSTEM_ADMIN: "Admin hệ thống",
};
const statuses: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  LOCKED: "Đã khóa",
  DISABLED: "Ngừng hoạt động",
};
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
export default function AccountsPage() {
  const { users, setUsers, session, resetPassword } = useAuth();
  const { excludedLecturerCodes } = useAcademic();
  const { notify, setDialog } = useUI();
  const { log } = useManagement();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [modal, setModal] = useState<{
    user: UserInfoResponse;
    mode: "lock" | "reset";
  } | null>(null);
  const [pending, setPending] = useState(false);
  const form = useFormErrors((f): Record<string, string[]> =>
    modal?.mode === "lock"
      ? {
          reason: String(f.get("reason") ?? "").trim()
            ? []
            : ["Vui lòng nhập lý do khóa tài khoản."],
        }
      : {},
  );
  const listedUsers = users.filter(
    u => !(u.role === "LECTURER" && excludedLecturerCodes.includes(u.username)),
  );
  const filtered = listedUsers.filter(
    (u) =>
      normalize(`${u.username} ${u.fullName}`).includes(normalize(query)) &&
      (!role || u.role === role) &&
      (!status || u.status === status),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages);
  const start = (current - 1) * size;
  const visible = filtered.slice(start, start + size);
  function clear() {
    setQuery("");
    setRole("");
    setStatus("");
    setPage(1);
  }
  function open(user: UserInfoResponse, mode: "lock" | "reset") {
    form.reset();
    setModal({ user, mode });
  }
  function unlock(user: UserInfoResponse) {
    setDialog({
      title: `Mở khóa ${user.username}?`,
      body: `Cho phép ${user.fullName} đăng nhập trở lại.`,
      confirm: "Mở khóa",
      action: () => {
        setUsers((old) =>
          old.map((u) => (u.id === user.id ? { ...u, status: "ACTIVE" } : u)),
        );
        log(session?.user.username ?? "", "Mở khóa tài khoản", user.username);
        notify(`Đã mở khóa ${user.username}.`);
      },
    });
  }
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Tài khoản người dùng</h1>
          <p>Tra cứu, khóa, mở khóa và đặt lại mật khẩu.</p>
        </div>
      </div>
      <section className="card">
        <div className="management-toolbar account-filters">
          <label>
            Tìm kiếm
            <input
              placeholder="Tên đăng nhập hoặc họ tên…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            Vai trò
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả vai trò</option>
              {Object.entries(roles).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trạng thái
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(statuses).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" onClick={clear}>
            Xóa bộ lọc
          </button>
        </div>
        <div className="account-count" role="status">
          <strong>{filtered.length}</strong>
          <span>tài khoản phù hợp / {listedUsers.length} tài khoản</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Tên đăng nhập",
                  "Họ tên",
                  "Vai trò",
                  "Trạng thái",
                  "Thao tác",
                ].map((s) => (
                  <th key={s}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.id}>
                  <td className="code-text">{u.username}</td>
                  <td>{u.fullName}</td>
                  <td>{roles[u.role] ?? u.role}</td>
                  <td>
                    <span
                      className={`badge ${u.status === "ACTIVE" ? "green" : "red"}`}
                    >
                      {statuses[u.status] ?? u.status}
                    </span>
                  </td>
                  <td>
                    <div className="management-actions">
                      {u.status === "LOCKED" ? (
                        <button className="btn" onClick={() => unlock(u)}>
                          Mở khóa
                        </button>
                      ) : (
                        <button
                          className="btn"
                          disabled={
                            u.id === session?.user.id || u.status !== "ACTIVE"
                          }
                          title={
                            u.id === session?.user.id
                              ? "Không thể tự khóa tài khoản đang đăng nhập"
                              : undefined
                          }
                          onClick={() => open(u, "lock")}
                        >
                          Khóa
                        </button>
                      )}
                      <button
                        className="btn"
                        disabled={u.id === session?.user.id}
                        title={
                          u.id === session?.user.id
                            ? "Dùng mục Đổi mật khẩu để thay mật khẩu của bạn"
                            : undefined
                        }
                        onClick={() => open(u, "reset")}
                      >
                        Đặt lại mật khẩu
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <div className="empty-state" role="status">
            <h2>Không tìm thấy tài khoản phù hợp</h2>
          </div>
        )}
        <div className="account-pagination">
          <p className="account-pagination-summary" role="status">
            {filtered.length ? (
              <>
                Hiển thị{" "}
                <strong>
                  {start + 1}–{Math.min(start + size, filtered.length)}
                </strong>{" "}
                trong <strong>{filtered.length}</strong> tài khoản
              </>
            ) : (
              "Không có tài khoản để hiển thị"
            )}
          </p>
          <div className="account-pagination-controls">
            <label className="account-page-size">
              Số dòng mỗi trang
              <select
                value={size}
                onChange={(e) => {
                  setSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {[10, 25, 50].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <nav
              className="account-page-navigation"
              aria-label="Phân trang tài khoản"
            >
              <button
                className="btn"
                disabled={current === 1}
                onClick={() => setPage(current - 1)}
                aria-label="Trang trước"
              >
                ← Trước
              </button>
              <span className="account-page-indicator" aria-live="polite">
                Trang <strong>{current}</strong> / {pages}
              </span>
              <button
                className="btn"
                disabled={current === pages}
                onClick={() => setPage(current + 1)}
                aria-label="Trang sau"
              >
                Sau →
              </button>
            </nav>
          </div>
        </div>
      </section>
      {modal && (
        <div className="dialog-backdrop">
          <section
            className="dialog record-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={
              modal.mode === "lock" ? "Khóa tài khoản" : "Đặt lại mật khẩu"
            }
          >
            <h2>
              {modal.mode === "lock" ? "Khóa tài khoản" : "Đặt lại mật khẩu"} ·{" "}
              {modal.user.username}
            </h2>
            {modal.mode === "reset" && (
              <p>
                Hệ thống sẽ tự sinh mật khẩu tạm thời và gửi đến email đã đăng
                ký của người dùng. Người dùng bắt buộc đổi mật khẩu ở lần đăng
                nhập tiếp theo trước khi sử dụng các chức năng khác. Thao tác
                này không tự mở khóa tài khoản.
              </p>
            )}
            <form
              noValidate
              onChange={form.onChange}
              onSubmit={async (e) => {
                e.preventDefault();
                if (pending || !form.check(e.currentTarget)) return;
                const f = new FormData(e.currentTarget);
                setPending(true);
                try {
                  if (modal.mode === "lock")
                    setUsers((old) =>
                      old.map((u) =>
                        u.id === modal.user.id ? { ...u, status: "LOCKED" } : u,
                      ),
                    );
                  else {
                    const request: ResetPasswordRequest = {
                      userId: modal.user.id,
                      reason: String(f.get("reason") ?? "").trim(),
                    };
                    await resetPassword(request);
                  }
                  log(
                    session?.user.username ?? "",
                    modal.mode === "lock"
                      ? "Khóa tài khoản"
                      : "Đặt lại mật khẩu",
                    `${modal.user.username} · ${String(f.get("reason") ?? "").trim()}`,
                  );
                  notify(
                    modal.mode === "lock"
                      ? `Đã khóa ${modal.user.username}.`
                      : `Đã đặt lại mật khẩu và gửi email cho ${modal.user.username}.`,
                  );
                  setModal(null);
                  form.reset();
                } catch (e) {
                  form.setFormError(
                    e instanceof Error ? e.message : "Không thể lưu thay đổi.",
                  );
                } finally {
                  setPending(false);
                }
              }}
            >
              <div className="record-fields">
                {(modal.mode === "lock"
                  ? [["reason", "Lý do khóa"]]
                  : [["reason", "Lý do đặt lại (không bắt buộc)"]]
                ).map(([name, label]) => (
                  <label key={name}>
                    {label}
                    <input
                      name={name}
                      type="text"
                      autoComplete="off"
                      disabled={pending}
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
                <p className="field-error" role="alert">
                  {form.formError}
                </p>
              )}
              <div className="dialog-actions">
                <button
                  type="button"
                  className="btn"
                  disabled={pending}
                  onClick={() => setModal(null)}
                >
                  Hủy
                </button>
                <button className="btn primary" disabled={pending}>
                  {pending
                    ? "Đang lưu…"
                    : modal.mode === "lock"
                      ? "Khóa tài khoản"
                      : "Đặt lại mật khẩu"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
