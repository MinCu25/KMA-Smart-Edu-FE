import { validateEmail } from "../../utils/profileValidation";
import { ApiError } from "../api/httpClient";
import type { UserInfoResponse } from "../../types/dto";
import type {
  LoginResponse,
  RoleName,
  UserStatus,
} from "../api/backendContract";
import { verifyPassword, storePassword } from "./passwordStore";
export async function prepareAccounts(
  users: UserInfoResponse[],
  entries: {
    username: string;
    fullName: string;
    role: string;
    email?: string | null;
  }[],
) {
  const seenEmails = new Set(
    users
      .filter((u) => u.role === "LECTURER")
      .map((u) => (u.email ?? "").trim().toLowerCase())
      .filter(Boolean),
  );
  for (const entry of entries) {
    const email = (entry.email ?? "").trim().toLowerCase();
    const message =
      entry.role === "LECTURER"
        ? validateEmail(email)
        : email
          ? validateEmail(email)
          : "";
    if (
      message ||
      (entry.role === "LECTURER" && email && seenEmails.has(email))
    )
      throw new ApiError(message || "Email đã được sử dụng.", 400, undefined, [
        { field: "email", message: message || "Email đã được sử dụng." },
      ]);
    if (entry.role === "LECTURER" && email) seenEmails.add(email);
  }
  const names = entries.map((x) => x.username);
  if (
    new Set(names).size !== names.length ||
    names.some((n) => users.some((u) => u.username === n))
  )
    throw Error("Tên đăng nhập đã tồn tại. Không tạo trùng tài khoản.");
  let id = Math.max(0, ...users.map((u) => u.id));
  const created = entries.map((x) => ({
    ...x,
    email: x.email?.trim().toLowerCase() || null,
    id: ++id,
    firstLogin: true,
    status: "ACTIVE",
  }));
  for (const entry of entries) await storePassword(entry.username, "12345");
  return created;
}
export async function authenticateAccount(
  users: UserInfoResponse[],
  username: string,
  password: string,
): Promise<LoginResponse> {
  const user = users.find((u) => u.username === username);
  if (!user || !(await verifyPassword(username, password)))
    throw Error("Tài khoản hoặc mật khẩu không đúng.");
  if (user.status !== "ACTIVE")
    throw Error("Tài khoản đã bị khóa hoặc ngừng hoạt động.");
  return {
    accessToken: "local-session",
    refreshToken: "local-session",
    tokenType: "Bearer",
    expiresIn: 3600,
    user: {
      ...user,
      role: user.role as RoleName,
      status: user.status as UserStatus,
    },
    requirePasswordChange: user.firstLogin,
  };
}
