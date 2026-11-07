import { readAllPages, useLiveRequest } from "../live/client";
import { Users, GraduationCap, BookOpen, UserCog } from "lucide-react";
import "./accounts.css";
import { useAcademic } from "../../context/AcademicContext";
import { useEffect, useState } from "react";
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
  const { users } = useAuth();
  const { excludedLecturerCodes } = useAcademic();
  const { log } = useManagement();
  return (
    <AccountScreen
      users={users.filter(
        (u) =>
          !(
            u.role === "LECTURER" && excludedLecturerCodes.includes(u.username)
          ),
      )}
      log={log}
    />
  );
}
export function LiveAccounts() {
  return <AccountScreen users={[]} live />;
}
function AccountScreen({
  users,
  live = false,
  log = () => {},
}: {
  users: UserInfoResponse[];
  live?: boolean;
  log?: (actor: string, action: string, detail: string) => void;
}) {
  const { setUsers, session, resetPassword } = useAuth();
  const { notify, notifyError, setDialog } = useUI();
  const request = useLiveRequest();
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
  const [remote, setRemote] = useState<UserInfoResponse[]>(),
    [error, setError] = useState(""),
    [revision, refresh] = useState(0);
  useEffect(() => {
    if (!live) return;
    let active = true;
    setRemote(undefined);
    setError("");
    const timer = setTimeout(() => {
      readAllPages<UserInfoResponse>(
        request,
        "adminUsersSearch",
        new URLSearchParams({
          keyword: query.trim(),
        }),
        () => active,
      )
        .then((r) => {
          if (active) {
            setRemote(r);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [live, request, query, revision]);
  const source = live ? (remote ?? []) : users;
  const filtered = source.filter(
    (u) =>
      normalize(u.username + " " + u.fullName).includes(normalize(query)) &&
      (!role || u.role === role) &&
      (!status || u.status === status),
  );
  const count = filtered.length;
  const pages = Math.max(1, Math.ceil(count / size)),
    current = Math.min(page, pages),
    start = (current - 1) * size;
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
      action: async () => {
        if (live) {
          try {
            await request("adminUserUnlock", user.id);
            refresh((n) => n + 1);
          } catch (e) {
            notifyError(e instanceof Error ? e.message : "Mở khóa thất bại.");
            return;
          }
        } else
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
      <section className="card system-accounts">
        <div
          className="account-role-switch"
          role="group"
          aria-label="Lọc tài khoản theo vai trò"
        >
          {[
            { value: "", label: "Tất cả", Icon: Users },
            { value: "STUDENT", label: "Sinh viên", Icon: GraduationCap },
            { value: "ACADEMIC_ADMIN", label: "Admin học vụ", Icon: UserCog },
            { value: "LECTURER", label: "Giảng viên", Icon: BookOpen },
          ].map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={role === value}
              onClick={() => {
                setRole(value);
                setPage(1);
              }}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
              <b>
                {live && !remote
                  ? "…"
                  : source.filter((u) => !value || u.role === value).length}
              </b>
            </button>
          ))}
        </div>
        <div className="management-toolbar account-filters">
          <label>
            Tìm kiếm
            <input
              placeholder={
                live ? "Tên đăng nhập…" : "Tên đăng nhập hoặc họ tên…"
              }
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          {!live && (
            <>
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
            </>
          )}
          <button className="btn" onClick={clear}>
            Xóa bộ lọc
          </button>
        </div>
        <div className="account-count" role="status">
          <strong>{count}</strong>
          <span>
            tài khoản phù hợp{!live && <> / {users.length} tài khoản</>}
          </span>
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
                  <td>{u.fullName || "—"}</td>
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
        {live && !remote && (
          <p role="status" className="empty-state">
            {error || "Đang tải danh sách tài khoản…"}{" "}
            {error && (
              <button className="btn" onClick={() => refresh((n) => n + 1)}>
                Thử lại
              </button>
            )}
          </p>
        )}
        {!count && (!live || remote) && (
          <div className="empty-state" role="status">
            <h2>Không tìm thấy tài khoản phù hợp</h2>
          </div>
        )}
        <div className="account-pagination">
          <p className="account-pagination-summary" role="status">
            {count ? (
              <>
                Hiển thị{" "}
                <strong>
                  {start + 1}–{Math.min(start + size, count)}
                </strong>{" "}
                trong <strong>{count}</strong> tài khoản
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
                  if (live) {
                    if (modal.mode === "lock")
                      await request("adminUserLock", modal.user.id, {
                        reason: String(f.get("reason")).trim(),
                      });
                    else await request("adminUserResetPassword", modal.user.id);
                    refresh((n) => n + 1);
                  } else if (modal.mode === "lock")
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
                  form.applyError(e);
                } finally {
                  setPending(false);
                }
              }}
            >
              <div className="record-fields">
                {(modal.mode === "lock"
                  ? [["reason", "Lý do khóa"]]
                  : live
                    ? []
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
