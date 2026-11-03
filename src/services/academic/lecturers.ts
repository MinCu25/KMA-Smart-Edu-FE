import type { LecturerResponse, UserInfoResponse } from "../../types/dto";
import { validateEmail } from "../../utils/profileValidation";
export const normalizeEmail = (email?: string | null) =>
  (email ?? "").trim().toLowerCase();
export function lecturerEmailError(
  email: string,
  code: string,
  teachers: LecturerResponse[],
  users: UserInfoResponse[],
) {
  const value = normalizeEmail(email);
  const invalid = validateEmail(value);
  if (invalid) return invalid;
  if (
    teachers.some(
      (t) => t.lecturerCode !== code && normalizeEmail(t.email) === value,
    ) ||
    users.some((u) => u.username !== code && normalizeEmail(u.email) === value)
  )
    return "Email đã được sử dụng. Vui lòng nhập email khác.";
  return "";
}
/** Reconcile browser fixtures by lecturer code, never by array index or display name.
 * Account status, first-login state, IDs and password verifiers are preserved. */
export function syncLecturerAccounts(
  users: UserInfoResponse[],
  teachers: LecturerResponse[],
) {
  let nextId = Math.max(0, ...users.map((u) => u.id));
  const result = [...users];
  for (const teacher of teachers) {
    if (!normalizeEmail(teacher.email)) {
      const index = result.findIndex(
        (u) => u.role === "LECTURER" && u.username === teacher.lecturerCode,
      );
      // Quarantine invalid legacy identities; retain IDs/history, never delete grades.
      if (index >= 0 && result[index].status === "ACTIVE")
        result[index] = { ...result[index], status: "DISABLED" };
      continue;
    }
    const index = result.findIndex((u) => u.username === teacher.lecturerCode);
    if (index >= 0) {
      const old = result[index];
      // A conflicting non-lecturer identity must not be reassigned to another role.
      if (old.role !== "LECTURER") continue;
      const email = normalizeEmail(teacher.email) || null;
      if (old.fullName !== teacher.fullName || old.email !== email)
        result[index] = { ...old, fullName: teacher.fullName, email };
    } else {
      result.push({
        id: ++nextId,
        username: teacher.lecturerCode,
        fullName: teacher.fullName,
        email: normalizeEmail(teacher.email) || null,
        role: "LECTURER",
        status: teacher.status === "ACTIVE" ? "ACTIVE" : "DISABLED",
        firstLogin: true,
      });
    }
  }
  return result.length === users.length &&
    result.every((u, i) => u === users[i])
    ? users
    : result;
}
/** Only restore known fixture contacts. Never invent email addresses for user-created records. */
export function repairSeedLecturerEmails(
  teachers: LecturerResponse[],
  seeds: LecturerResponse[],
  users: UserInfoResponse[],
) {
  let changed = false;
  const result = [...teachers];
  for (let i = 0; i < result.length; i++) {
    const t = result[i];
    // Empty-email records are excluded by request, not restored from fixture data.
    if (!normalizeEmail(t.email)) continue;
    if (!lecturerEmailError(t.email ?? "", t.lecturerCode, result, users))
      continue;
    const seed = seeds.find(
      (s) => s.lecturerCode === t.lecturerCode && s.fullName === t.fullName,
    );
    if (!seed || lecturerEmailError(seed.email, t.lecturerCode, result, users))
      continue;
    result[i] = { ...t, email: seed.email };
    changed = true;
  }
  return changed ? result : teachers;
}
