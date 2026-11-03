import {
  prepareAccounts,
  authenticateAccount,
} from "../services/mock/accountProvisioning";
import { usePersistentState } from "../hooks/usePersistentState";
import { userResponses } from "../data/mock/dtoFixtures";
import { readStorage } from "../services/mock/storage";
import { verifyPassword, storePassword } from "../services/mock/passwordStore";
import { requestPasswordReset } from "../services/api/passwordReset";
import type {
  ChangePasswordRequest,
  ResetPasswordRequest,
  UserInfoResponse,
} from "../types/dto";
import type { Role } from "../types/navigation";
import { DEMO_ACCOUNTS } from "../services/mock/authService";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { loginDemo } from "../services/mock/dtoService";
import type { LoginResponse } from "../types/dto";

function useAuthState() {
  // Phiên đăng nhập mô phỏng; backend phải xác thực và phân quyền khi tích hợp thật.
  const [users, setUsers] = usePersistentState<UserInfoResponse[]>(
    "kma-users-v1",
    readStorage<{ accounts: UserInfoResponse[] }>("kma-dto-management-v3", {
      accounts: userResponses,
    }).accounts,
  );
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [logged, setLogged] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [role, setRole] = useState<Role>("student");
  async function login(
    username: string,
    password: string,
    selectedRole: Role = "student",
  ) {
    try {
      const data = await authenticateAccount(
        users,
        username,
        password,
        DEMO_ACCOUNTS[selectedRole].wireRole,
      );
      setRole(selectedRole);
      setSession(data);
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : "Đăng nhập thất bại.",
      );
      return error instanceof Error ? error.message : "Đăng nhập thất bại.";
    }
    setLogged(true);
    setLoginError("");
    return null;
  }
  function logout() {
    setSession(null);
    setLogged(false);
    setLoginError("");
  }
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(logout, session.expiresIn * 1000);
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
            logout();
        } else {
          const current = (after as UserInfoResponse[] | null)?.find(
            (u) => u.id === session.user.id,
          );
          if (
            !current ||
            current.status !== "ACTIVE" ||
            current.firstLogin !== session.user.firstLogin
          )
            logout();
        }
      } catch {
        logout();
      }
    };
    window.addEventListener("storage", invalidate);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", invalidate);
    };
  }, [session]);
  useEffect(() => {
    if (
      session &&
      users.find((u) => u.id === session.user.id)?.status !== "ACTIVE"
    )
      logout();
  }, [users]);
  async function changePassword(request: ChangePasswordRequest) {
    if (!session) throw Error("Phiên đăng nhập đã hết hạn.");
    if (!request.newPassword.trim() || request.newPassword.length < 8)
      throw Error("Mật khẩu mới phải có ít nhất 8 ký tự.");
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
      throw Error("Mật khẩu mới phải khác mật khẩu hiện tại.");
    await storePassword(session.user.username, request.newPassword);
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
    const created = await prepareAccounts(users, entries);
    setUsers((old) => [...old, ...created]);
  }
  return {
    provisionAccounts,
    session,
    role,
    logged,
    loginError,
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
