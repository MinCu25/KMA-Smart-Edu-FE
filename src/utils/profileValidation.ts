export function validateEmail(value: string): string {
  const email = value.trim();
  if (!email) return "Vui lòng nhập email.";
  const parts = email.split("@");
  if (parts.length !== 2)
    return "Email không đúng định dạng (ví dụ: ten@example.com).";
  const [local, domain] = parts;
  if (
    email.length > 254 ||
    local.length > 64 ||
    !/^[A-Za-z0-9!#$%&'*+\/=?^_`{|}~.-]+$/.test(local) ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..") ||
    !/^(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/.test(
      domain,
    ) ||
    domain.split(".").some((part) => part.length > 63)
  )
    return "Email không đúng định dạng (ví dụ: ten@example.com).";
  return "";
}
export function normalizePhone(value: string): string {
  return value
    .trim()
    .replace(/[ .()-]/g, "")
    .replace(/^\+84/, "0");
}
export function validatePhone(value: string): string {
  if (!value.trim()) return "Vui lòng nhập số điện thoại.";
  if (
    !/^(0|\+84)(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/.test(
      value.trim(),
    )
  )
    return "Số điện thoại không đúng định dạng (ví dụ: 0912345678 hoặc +84912345678).";
  return "";
}
export function validateTarget(value: string): string {
  if (!value.trim()) return "Vui lòng nhập GPA mục tiêu.";
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 4)
    return "GPA mục tiêu phải nằm trong khoảng từ 0 đến 4.";
  if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-8)
    return "GPA mục tiêu chỉ được có tối đa 2 chữ số thập phân.";
  return "";
}

export function validateNewPassword(value: string): string[] {
  if (!value.trim()) return ["Vui lòng nhập mật khẩu mới."];
  const errors: string[] = [];
  if (/\s/.test(value)) errors.push("Mật khẩu không được chứa khoảng trắng.");
  if (value.length < 8) errors.push("Mật khẩu tối thiểu 8 ký tự.");
  if (!/[A-Z]/.test(value)) errors.push("Có ít nhất 1 ký tự in hoa.");
  if (!/[a-z]/.test(value)) errors.push("Có ít nhất 1 ký tự in thường.");
  if (!/\d/.test(value)) errors.push("Có ít nhất 1 chữ số.");
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value))
    errors.push('Có ít nhất 1 ký tự đặc biệt (!@#$%^&*(),.?":{}|<>).');
  return errors;
}
export function validatePasswordForm(
  data: FormData,
  firstLogin = false,
): Record<string, string[]> {
  const current = String(data.get("currentPassword") ?? "");
  const password = String(data.get("newPassword") ?? "");
  const confirm = String(data.get("confirmPassword") ?? "");
  return {
    currentPassword:
      firstLogin || current.trim() ? [] : ["Vui lòng nhập mật khẩu hiện tại."],
    newPassword: validateNewPassword(password),
    confirmPassword: !confirm.trim()
      ? ["Vui lòng nhập xác nhận mật khẩu."]
      : confirm !== password
        ? ["Mật khẩu chưa khớp."]
        : [],
  };
}
