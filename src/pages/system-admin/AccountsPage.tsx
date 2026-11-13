import "../live/live.css";
import { useLiveRequest } from "../live/client";
import type {
  PageResponse,
  UserAccountSummaryResponse,
  UserAccountDetailResponse,
} from "../../services/api/backendContract";
import { useAcademic } from "../../context/AcademicContext";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { useManagement } from "../../context/ManagementContext";
import { useFormErrors } from "../../hooks/useFormErrors";
import type { UserInfoResponse } from "../../types/dto";
const roles: Record<string, string> = {
  STUDENT: "Sinh viên",
  LECTURER: "Giảng viên",
  ACADEMIC_ADMIN: "Admin học vụ",
  SYSTEM_ADMIN: "Admin hệ thống",
};
const statuses: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  LOCKED: "Đã khóa",
  DISABLED: "Vô hiệu hóa",
};
type Mode = "detail" | "lock" | "unlock" | "reset";
const titles: Record<Mode, string> = {
  detail: "Chi tiết tài khoản",
  lock: "Khóa tài khoản",
  unlock: "Mở khóa tài khoản",
  reset: "Đặt lại mật khẩu",
};
const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Không thể thực hiện yêu cầu.";
const timestamp = (s: string | null) => {
  if (!s) return "—";
  const date = new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(s) ? s : s + "Z");
  return Number.isNaN(date.getTime())
    ? s
    : date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
};
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
  const { setUsers, session, resetPassword, clearSession } = useAuth();
  const { notify, notifyError } = useUI();
  const request = useLiveRequest();
  const [query, setQuery] = useState(""),
    [role, setRole] = useState(""),
    [status, setStatus] = useState(""),
    [firstLogin, setFirstLogin] = useState("");
  const [page, setPage] = useState(1),
    [size, setSize] = useState(10),
    [revision, refresh] = useState(0);
  const [remote, setRemote] =
      useState<PageResponse<UserAccountSummaryResponse>>(),
    [error, setError] = useState("");
  const [selected, select] = useState<UserAccountSummaryResponse>(),
    [detail, setDetail] = useState<UserAccountDetailResponse>();
  const [mode, setMode] = useState<Mode>("detail"),
    [detailError, setDetailError] = useState(""),
    [pending, setPending] = useState(false),
    [loadingDetail, setLoadingDetail] = useState(false);
  const selectionVersion = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useFormErrors((f): Record<string, string[]> => {
    const reason = String(f.get("reason") ?? "").trim();
    return mode === "lock"
      ? {
          reason: !reason
            ? ["Vui lòng nhập lý do khóa tài khoản."]
            : reason.length > 500
              ? ["Lý do khóa tối đa 500 ký tự."]
              : [],
        }
      : {};
  });
  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);
  useEffect(
    () => () => {
      selectionVersion.current++;
    },
    [],
  );
  useEffect(() => {
    if (!live) return;
    let active = true;
    setRemote(undefined);
    setError("");
    const params = new URLSearchParams({
      page: String(page - 1),
      size: String(size),
    });
    if (query.trim()) params.set("keyword", query.trim());
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    if (firstLogin !== "") params.set("firstLogin", firstLogin);
    const timer = setTimeout(() => {
      request<PageResponse<UserAccountSummaryResponse>>(
        "adminUsersSearch",
        undefined,
        undefined,
        params,
      )
        .then((r) => {
          if (active) {
            if (page > Math.max(1, r.totalPages))
              setPage(Math.max(1, r.totalPages));
            else setRemote(r);
          }
        })
        .catch((e) => {
          if (active) setError(errorMessage(e));
        });
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [live, request, page, size, query, role, status, firstLogin, revision]);
  const filtered = users
    .filter(
      (u) =>
        [u.username, u.email ?? ""].some((v) =>
          v.toLowerCase().includes(query.trim().toLowerCase()),
        ) &&
        (!role || u.role === role) &&
        (!status || u.status === status) &&
        (firstLogin === "" || String(u.firstLogin) === firstLogin),
    )
    .sort((a, b) => a.id - b.id);
  const count = live ? (remote?.totalElements ?? 0) : filtered.length;
  const pages = Math.max(1, Math.ceil(count / size)),
    current = live ? page : Math.min(page, pages),
    start = (current - 1) * size;
  const visible: UserAccountSummaryResponse[] = live
    ? (remote?.content ?? [])
    : (filtered.slice(start, start + size) as UserAccountSummaryResponse[]);
  const clear = () => {
    setQuery("");
    setRole("");
    setStatus("");
    setFirstLogin("");
    setPage(1);
  };
  function demoDetail(id: number): UserAccountDetailResponse {
    const u = users.find((u) => u.id === id);
    if (!u) throw Error("Tài khoản không còn tồn tại.");
    return {
      ...u,
      role: u.role as UserAccountDetailResponse["role"],
      status: u.status as UserAccountDetailResponse["status"],
      email: u.email ?? null,
      fullName: u.fullName ?? null,
      phone: null,
      failedLoginCount: 0,
      lockedUntil: null,
      passwordChangedAt: null,
      createdAt: null,
      updatedAt: null,
      temporarilyLocked: false,
    };
  }
  async function loadDetail(
    user: UserAccountSummaryResponse,
    nextMode: Mode = "detail",
  ) {
    const version = ++selectionVersion.current;
    select(user);
    setMode(nextMode);
    setDetail(undefined);
    setDetailError("");
    setLoadingDetail(true);
    form.reset();
    try {
      const d = live
        ? await request<UserAccountDetailResponse>("adminUserGet", user.id)
        : demoDetail(user.id);
      if (version === selectionVersion.current) setDetail(d);
    } catch (e) {
      if (version === selectionVersion.current) setDetailError(errorMessage(e));
    } finally {
      if (version === selectionVersion.current) setLoadingDetail(false);
    }
  }
  function close() {
    if (pending) return;
    selectionVersion.current++;
    select(undefined);
    setDetail(undefined);
    form.reset();
  }
  const lastAdmin =
    !live &&
    detail?.id === session?.user.id &&
    detail?.role === "SYSTEM_ADMIN" &&
    users.filter((u) => u.role === "SYSTEM_ADMIN" && u.status === "ACTIVE")
      .length <= 1;
  async function execute(reason = "") {
    if (!detail || pending || detail.status === "DISABLED") return;
    if (mode === "lock" && detail.status === "LOCKED") return;
    if (mode === "lock" && lastAdmin) {
      form.setFormError(
        "Không thể tự khóa quản trị hệ thống đang hoạt động cuối cùng.",
      );
      return;
    }
    setPending(true);
    try {
      if (live)
        await request(
          mode === "lock"
            ? "adminUserLock"
            : mode === "unlock"
              ? "adminUserUnlock"
              : "adminUserResetPassword",
          detail.id,
          mode === "lock" ? { reason } : undefined,
        );
      else if (mode === "reset")
        await resetPassword({ userId: detail.id, reason: "" });
      else
        setUsers((old) =>
          old.map((u) =>
            u.id === detail.id
              ? { ...u, status: mode === "lock" ? "LOCKED" : "ACTIVE" }
              : u,
          ),
        );
      log(session?.user.username ?? "", titles[mode], detail.username);
      notify(
        mode === "reset"
          ? `Đã đặt lại mật khẩu và gửi email cho ${detail.username}.`
          : mode === "lock"
            ? `Đã khóa ${detail.username}.`
            : `Đã mở khóa ${detail.username}.`,
      );
      if (detail.id === session?.user.id && mode !== "unlock") {
        clearSession();
        return;
      }
      refresh((n) => n + 1);
      form.reset();
      setMode("detail");
      if (live) {
        setDetail(undefined);
        setLoadingDetail(true);
        try {
          setDetail(
            await request<UserAccountDetailResponse>("adminUserGet", detail.id),
          );
        } catch (e) {
          setDetailError(
            "Thao tác đã thành công. Chưa tải lại được chi tiết: " +
              errorMessage(e),
          );
        } finally {
          setLoadingDetail(false);
        }
      } else
        setDetail({
          ...detail,
          status: mode === "lock" ? "LOCKED" : "ACTIVE",
          temporarilyLocked: false,
          failedLoginCount: 0,
          lockedUntil: null,
        });
    } catch (e) {
      if (mode === "lock") form.applyError(e);
      else notifyError(errorMessage(e));
    } finally {
      setPending(false);
    }
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
              placeholder="Tên đăng nhập hoặc email…"
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
              {Object.entries(roles).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
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
              {Object.entries(statuses).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Yêu cầu đổi mật khẩu
            <select
              value={firstLogin}
              onChange={(e) => {
                setFirstLogin(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả</option>
              <option value="true">Cần đổi mật khẩu</option>
              <option value="false">Không cần đổi mật khẩu</option>
            </select>
          </label>
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
                {["Tên đăng nhập", "Vai trò", "Trạng thái", "Thao tác"].map(
                  (s) => (
                    <th key={s}>{s}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.id}>
                  <td>
                    <button className="text-link" onClick={() => loadDetail(u)}>
                      {u.username}
                    </button>
                  </td>
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
                      <button className="btn" onClick={() => loadDetail(u)}>
                        Xem chi tiết
                      </button>
                      {u.status !== "DISABLED" && (
                        <>
                          <button
                            className="btn"

                            onClick={() =>
                              loadDetail(
                                u,
                                u.status === "LOCKED" ? "unlock" : "lock",
                              )
                            }
                          >
                            {u.status === "LOCKED" ? "Mở khóa" : "Khóa"}
                          </button>
                          <button
                            className="btn"

                            onClick={() => loadDetail(u, "reset")}
                          >
                            Đặt lại mật khẩu
                          </button>
                        </>
                      )}
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
          <p className="account-pagination-summary">
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
              >
                ← Trước
              </button>
              <span className="account-page-indicator">
                Trang <strong>{current}</strong> / {pages}
              </span>
              <button
                className="btn"
                disabled={current === pages}
                onClick={() => setPage(current + 1)}
              >
                Sau →
              </button>
            </nav>
          </div>
        </div>
      </section>
      {selected && (
        <dialog
          ref={dialog}
          className="dialog record-dialog live-dialog"
          onCancel={(e) => {
            e.preventDefault();
            close();
          }}
          aria-label={titles[mode]}
        >
          <h2>
            {titles[mode]} · {selected.username}
          </h2>
          {loadingDetail && <p role="status">Đang tải chi tiết tài khoản…</p>}
          {detailError && (
            <p className="field-error" role="alert">
              {detailError}{" "}
              <button
                className="btn"
                onClick={() => loadDetail(selected, mode)}
              >
                Thử lại
              </button>
            </p>
          )}
          {detail && (
            <>
              {mode === "detail" ? (
                <>
                  <dl className="account-detail-fields">
                    {[
                      ["Tên đăng nhập", detail.username],
                      ["Họ tên", detail.fullName],
                      ["Email", detail.email],
                      ["Số điện thoại", detail.phone],
                      ["Vai trò", roles[detail.role]],
                      ["Trạng thái", statuses[detail.status]],
                      ["Cần đổi mật khẩu", detail.firstLogin ? "Có" : "Không"],
                      [
                        "Khóa tạm",
                        detail.temporarilyLocked ? "Đang khóa tạm" : "Không",
                      ],
                      ...(live
                        ? [
                            [
                              "Số lần đăng nhập sai",
                              String(detail.failedLoginCount),
                            ],
                            ["Mốc hết khóa tạm", timestamp(detail.lockedUntil)],
                            [
                              "Đổi/đặt lại mật khẩu gần nhất",
                              timestamp(detail.passwordChangedAt),
                            ],
                            ["Ngày tạo", timestamp(detail.createdAt)],
                            ["Cập nhật gần nhất", timestamp(detail.updatedAt)],
                          ]
                        : []),
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                  {detail.status === "DISABLED" ? (
                    <p className="notice yellow">
                      Tài khoản đã bị vô hiệu hóa. Không thể khóa, mở khóa hoặc
                      đặt lại mật khẩu.
                      {!live &&
                        detail.role === "STUDENT" &&
                        " Admin học vụ cần kiểm tra hồ sơ và tái kích hoạt sinh viên."}
                    </p>
                  ) : (
                    <div className="dialog-actions">
                      {detail.status !== "LOCKED" && <button
                        className="btn"
                        disabled={pending}
                        onClick={() => {
                          form.reset();
                          setMode("lock");
                        }}
                      >
                        Khóa tài khoản
                      </button>}
                      {(detail.status === "LOCKED" ||
                        detail.temporarilyLocked) && (
                        <button
                          className="btn"
                          disabled={pending}
                          onClick={() => setMode("unlock")}
                        >
                          {detail.temporarilyLocked ? "Gỡ khóa tạm" : "Mở khóa"}
                        </button>
                      )}
                      <button
                        className="btn"
                        disabled={pending}
                        onClick={() => setMode("reset")}
                      >
                        Đặt lại mật khẩu
                      </button>
                    </div>
                  )}
                </>
              ) : detail.status === "DISABLED" ? (
                <p className="notice yellow">
                  Tài khoản đã bị vô hiệu hóa. Không thể khóa, mở khóa hoặc đặt
                  lại mật khẩu.
                </p>
              ) : mode === "lock" ? (
                <form
                  noValidate
                  onChange={form.onChange}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (form.check(e.currentTarget))
                      void execute(
                        String(
                          new FormData(e.currentTarget).get("reason") ?? "",
                        ).trim(),
                      );
                  }}
                >
                  {detail.id === session?.user.id && (
                    <p className="notice yellow">
                      Thao tác này sẽ kết thúc phiên đăng nhập của bạn.
                    </p>
                  )}
                  <label>
                    Lý do khóa
                    <input
                      name="reason"
                      disabled={pending}
                      {...form.props("reason")}
                    />
                  </label>
                  <p className="field-error" id="reason-error">
                    {form.errors.reason?.join(" ")}
                  </p>
                  {form.formError && (
                    <p className="field-error" role="alert">
                      {form.formError}
                    </p>
                  )}
                  <div className="dialog-actions">
                    <button className="btn primary" disabled={pending}>
                      {pending ? "Đang xử lý…" : "Xác nhận khóa"}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <p>
                    {mode === "reset"
                      ? "Hệ thống sinh mật khẩu tạm và gửi đến email tài khoản. Người dùng phải đổi mật khẩu ở lần đăng nhập tiếp theo. Thao tác không tự mở khóa thủ công."
                      : "Mở khóa tài khoản và xóa khóa tạm, bộ đếm đăng nhập sai. Người dùng cần đăng nhập lại."}
                  </p>
                  {mode === "reset" && (
                    <p>
                      Email nhận:{" "}
                      <strong>{detail.email || "Chưa có email"}</strong>
                    </p>
                  )}
                  {mode === "reset" && detail.id === session?.user.id && (
                    <p className="notice yellow">
                      Sau khi thành công, bạn sẽ được chuyển về trang đăng nhập.
                    </p>
                  )}
                  <div className="dialog-actions">
                    <button
                      className="btn"
                      disabled={pending}
                      onClick={() => setMode("detail")}
                    >
                      Quay lại
                    </button>
                    <button
                      className="btn primary"
                      disabled={pending || (mode === "reset" && !detail.email)}
                      onClick={() => execute()}
                    >
                      {pending ? "Đang xử lý…" : "Xác nhận"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
          <div className="dialog-actions">
            <button className="btn" disabled={pending} onClick={close}>
              Đóng
            </button>
          </div>
        </dialog>
      )}
    </>
  );
}
