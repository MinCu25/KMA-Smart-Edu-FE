import type { ResetPasswordRequest } from "../../types/dto";

/** Integration boundary: no reset endpoint or email delivery is connected yet.
 * Backend must generate the temporary password, deliver it to the registered
 * address and set requirePasswordChange. Never accept a password from admin.
 */
export async function requestPasswordReset(
  request: ResetPasswordRequest,
): Promise<void> {
  if (!Number.isInteger(request.userId) || request.userId <= 0)
    throw Error("Tài khoản cần đặt lại mật khẩu không hợp lệ.");
  throw Error(
    "Chưa thể đặt lại mật khẩu vì chức năng gửi email chưa được kết nối. Mật khẩu hiện tại của người dùng vẫn được giữ nguyên.",
  );
}
