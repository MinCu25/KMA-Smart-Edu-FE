import type {
  ChangePasswordRequest,
  CreateSubjectRequest,
  UpdateSubjectRequest,
  SetPrerequisiteRequest,
} from "../../types/dto";
export function subjectRequest(
  data: FormData,
  editing: boolean,
): CreateSubjectRequest | UpdateSubjectRequest {
  const subjectCode = String(data.get("subjectCode") ?? "").trim();
  const subjectName = String(data.get("subjectName") ?? "").trim();
  const credits = Number(data.get("credits"));
  if (!subjectName) throw Error("Vui lòng nhập tên học phần.");
  if (!Number.isInteger(credits) || credits < 1 || credits > 5)
    throw Error("Số tín chỉ phải là số nguyên từ 1 đến 5.");
  if (!editing && !subjectCode) throw Error("Vui lòng nhập mã học phần.");
  return {
    ...(subjectCode ? { subjectCode } : {}),
    subjectName,
    credits,
    description: String(data.get("description") ?? "").trim(),
  } as CreateSubjectRequest | UpdateSubjectRequest;
}
export function prerequisiteRequest(ids: number[]): SetPrerequisiteRequest {
  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0))
    throw Error("ID học phần tiên quyết không hợp lệ.");
  return { prerequisiteSubjectIds: [...new Set(ids)] };
}
export function passwordRequest(
  data: FormData,
  firstLogin: boolean,
): ChangePasswordRequest {
  return {
    currentPassword: firstLogin
      ? null
      : String(data.get("currentPassword") ?? ""),
    newPassword: String(data.get("newPassword") ?? ""),
    confirmPassword: String(data.get("confirmPassword") ?? ""),
  };
}
