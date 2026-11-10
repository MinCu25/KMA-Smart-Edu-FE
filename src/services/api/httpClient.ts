import type { ApiResponse, FieldErrorDetail } from "./backendContract";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
export const backendEnabled = import.meta.env?.VITE_AUTH_MODE === "api";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: number,
    public errors: FieldErrorDetail[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}
/** Paths/methods must come from the backend Controller once implemented. */
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<T | undefined> {
  if (!API_BASE_URL) throw new Error("Chưa cấu hình VITE_API_BASE_URL.");
  const headers = new Headers(init.headers);
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  )
    headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/${path.replace(/^\//, "")}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiError(
      "Không kết nối được backend. Kiểm tra địa chỉ API và CORS.",
      0,
    );
  }
  if (response.status === 204) return undefined;
  let body: ApiResponse<T>;
  try {
    body = await response.json();
  } catch {
    throw new ApiError("Backend không trả về JSON hợp lệ.", response.status);
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new ApiError(
      "Backend trả dữ liệu không đúng định dạng.",
      response.status,
    );
  if (!response.ok || body.success === false)
    throw new ApiError(
      typeof body.message === "string" && body.message
        ? body.message
        : `Lỗi HTTP ${response.status}`,
      response.status,
      "code" in body ? body.code : undefined,
      "errors" in body && Array.isArray(body.errors)
        ? body.errors.filter(
            (item) =>
              item &&
              typeof item.field === "string" &&
              typeof item.message === "string",
          )
        : [],
    );
  if (body.success !== true)
    throw new ApiError(
      "Response không đúng cấu trúc ApiResponse.",
      response.status,
    );
  return body.data;
}

/** Binary endpoints return JSON only on failure. Never interpret an error as an XLSX. */
export async function downloadApiFile(
  path: string,
  accessToken: string | undefined,
  filename: string,
) {
  if (!API_BASE_URL) throw new Error("Chưa cấu hình VITE_API_BASE_URL.");
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/${path.replace(/^\//, "")}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
  } catch {
    throw new ApiError("Không kết nối được backend để tải file.", 0);
  }
  if (!response.ok || response.headers.get("Content-Type")?.includes("json")) {
    let payload: {
      message?: string;
      code?: number;
      errors?: FieldErrorDetail[];
    } = {};
    try {
      payload = await response.json();
    } catch {
      /* fallback below */
    }
    throw new ApiError(
      payload?.message || "Không tải được file danh sách.",
      response.status,
      payload?.code,
      Array.isArray(payload?.errors) ? payload.errors : [],
    );
  }
  const blob = await response.blob();
  if (!blob.size) throw new Error("Backend trả file rỗng.");
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
