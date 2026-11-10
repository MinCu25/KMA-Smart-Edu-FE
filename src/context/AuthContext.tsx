import {
  prepareAccounts,
  authenticateAccount,
} from "../services/mock/accountProvisioning";
import { usePersistentState } from "../hooks/usePersistentState";
import { userResponses } from "../data/mock/dtoFixtures";
import { readStorage } from "../services/mock/storage";
import {
  verifyPassword,
  verifyPreviousPassword,
  storePassword,
} from "../services/mock/passwordStore";
import { validateNewPassword } from "../utils/profileValidation";
import { requestPasswordReset } from "../services/api/passwordReset";
import type {
  ChangePasswordRequest,
  ResetPasswordRequest,
  UserInfoResponse,
} from "../types/dto";
import type { Role } from "../types/navigation";
import { accountRole, passwordPage, roleHome } from "../config/navigation";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type SetStateAction,
  type ReactNode,
} from "react";
import { createEduApi } from "../services/api/eduApi";
import { ApiError, backendEnabled } from "../services/api/httpClient";
import type { LoginResponse } from "../services/api/backendContract";

function useAuthState() {
  // Phiên đăng nhập mô phỏng; backend phải xác thực và phân quyền khi tích hợp thật.
  const [users, setStoredUsers] = usePersistentState<UserInfoResponse[]>(
    "kma-users-v1",
    readStorage<{ accounts: UserInfoResponse[] }>("kma-dto-management-v3", {
      accounts: userResponses,
    }).accounts,
  );
  const usersRef = useRef(users);
  usersRef.current = users;
  const provisionQueue = useRef<Promise<void>>(Promise.resolve());
  const setUsers = useCallback(
    (update: SetStateAction<UserInfoResponse[]>) => {
      const next =
        typeof update === "function" ? update(usersRef.current) : update;
      usersRef.current = next;
      setStoredUsers(next);
    },
    [setStoredUsers],
  );
  const [session, setSession] = useState<LoginResponse | null>(null);
  const logged = session !== null;
  const [role, setRole] = useState<Role>("student");
  async function login(username: string, password: string) {
    try {
      const data = backendEnabled
        ? await api.auth.login({ username, password })
        : await authenticateAccount(users, username, password);
      const role = accountRole(data.user.role);
      setRole(role);
      setSession(data);
      return {
        ok: true,
        page: data.requirePasswordChange ? passwordPage[role] : roleHome[role],
      } as const;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Đăng nhập thất bại.";
      return { ok: false, message } as const;
    }
  }
  const clearSession = useCallback(() => {
    setSession((current) => (current === session ? null : current));
  }, [session]);
  const api = useMemo(
    () =>
      createEduApi({
        getAccessToken: () => session?.accessToken,
        onUnauthorized: clearSession,
      }),
    [session, clearSession],
  );
  async function logout() {
    try {
      if (backendEnabled && session)
        await api.auth.logout({ refreshToken: session.refreshToken });
    } catch (error) {
      throw new Error(
        "Đã xóa phiên trên trình duyệt nhưng chưa xác nhận đăng xuất với máy chủ. " +
          (error instanceof Error
            ? error.message
            : "Vui lòng kiểm tra kết nối."),
      );
    } finally {
      clearSession();
    }
  }
  const requirePasswordChange = useCallback(() => {
    setSession((current) =>
      current === session && current
        ? {
            ...current,
            requirePasswordChange: true,
            user: { ...current.user, firstLogin: true },
          }
        : current,
    );
  }, [session?.accessToken]);
  useEffect(() => {
    if (!session) return;
    const token = session.accessToken;
    const timer = setTimeout(
      () =>
        setSession((current) =>
          current?.accessToken === token ? null : current,
        ),
      session.expiresIn * 1000,
    );
    if (backendEnabled) return () => clearTimeout(timer);
    const invalidate = (event: StorageEvent) => {
      if (
        !["kma-password-verifiers-v1", "kma-users-v1"].includes(event.key ?? "")
      )
        return;
      try {
        const before = JSON.parse(event.oldValue ?? "null"),
          after = JSON.parse(event.newValue ?? "null");
        if (event.key === "kma-password-verifiers-v1") {
          if (
            JSON.stringify(before?.[session.user.username]) !==
            JSON.stringify(after?.[session.user.username])
          )
            clearSession();
        } else {
          const current = (after as UserInfoResponse[] | null)?.find(
            (u) => u.id === session.user.id,
          );
          if (
            !current ||
            current.status !== "ACTIVE" ||
            current.firstLogin !== session.user.firstLogin
          )
            clearSession();
        }
      } catch {
        clearSession();
      }
    };
    window.addEventListener("storage", invalidate);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", invalidate);
    };
  }, [session?.accessToken]);
  useEffect(() => {
    if (
      !backendEnabled &&
      session &&
      users.find((u) => u.id === session.user.id)?.status !== "ACTIVE"
    )
      logout();
  }, [users]);
  async function changePassword(request: ChangePasswordRequest) {
    if (!session) throw Error("Phiên đăng nhập đã hết hạn.");
    if (backendEnabled) {
      try {
        await api.auth.changePassword(request);
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 401 &&
          error.code === 4003
        )
          return false;
        throw error;
      }
      clearSession();
      return true;
    }
    const passwordErrors = validateNewPassword(request.newPassword);
    if (request.newPassword === session.user.username)
      passwordErrors.push("Mật khẩu mới phải khác tên đăng nhập.");
    if (passwordErrors.length)
      throw new ApiError(
        "Mật khẩu mới chưa hợp lệ.",
        400,
        1001,
        passwordErrors.map((message) => ({ field: "newPassword", message })),
      );
    if (request.newPassword !== request.confirmPassword)
      throw Error("Mật khẩu xác nhận chưa khớp.");
    if (
      !session.requirePasswordChange &&
      !(await verifyPassword(
        session.user.username,
        request.currentPassword ?? "",
      ))
    )
      return false;
    if (await verifyPassword(session.user.username, request.newPassword))
      throw new ApiError("Mật khẩu mới chưa hợp lệ.", 400, 1001, [
        {
          field: "newPassword",
          message: "Mật khẩu mới phải khác mật khẩu hiện tại.",
        },
      ]);
    if (
      await verifyPreviousPassword(session.user.username, request.newPassword)
    )
      throw new ApiError("Mật khẩu mới chưa hợp lệ.", 400, 1001, [
        {
          field: "newPassword",
          message: "Không được dùng lại mật khẩu chính thức ngay trước đó.",
        },
      ]);
    await storePassword(
      session.user.username,
      request.newPassword,
      !session.requirePasswordChange,
    );
    setUsers((old) =>
      old.map((u) =>
        u.id === session.user.id ? { ...u, firstLogin: false } : u,
      ),
    );
    logout();
    return true;
  }
  async function resetPassword(request: ResetPasswordRequest) {
    if (role !== "system-admin" || !logged)
      throw Error("Bạn không có quyền đặt lại mật khẩu.");
    if (!users.some((u) => u.id === request.userId))
      throw Error("Không tìm thấy tài khoản.");
    // Backend owns generation, email delivery and the first-login flag.
    // Never replace browser credentials when no email can be delivered.
    await requestPasswordReset(request);
  }

  async function provisionAccounts(
    entries: {
      username: string;
      fullName: string;
      role: string;
      email?: string | null;
    }[],
  ) {
    const task = provisionQueue.current.then(async () => {
      const created = await prepareAccounts(usersRef.current, entries);
      setUsers((old) => [...old, ...created]);
    });
    provisionQueue.current = task.catch(() => {});
    return task;
  }
  return {
    api,
    clearSession,
    requirePasswordChange,
    provisionAccounts,
    session,
    role,
    logged,
    login,
    logout,
    users,
    setUsers,
    changePassword,
    resetPassword,
  };
}
const AuthContext = createContext<ReturnType<typeof useAuthState> | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const state = useAuthState();
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth phải được dùng bên trong AuthProvider.");
  return context;
}
