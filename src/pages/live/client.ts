import { useAuth } from "../../context/AuthContext";
import { apiRequest, ApiError } from "../../services/api/httpClient";
import { ENDPOINTS } from "../../services/api/backendContract";
import type { Op } from "./catalog";
import { useCallback } from "react";
export function useLiveRequest() {
  const { session, clearSession, requirePasswordChange } = useAuth();
  return useCallback(
    async function request<T>(
      op: Op,
      id?: number | string,
      body?: unknown,
      query?: URLSearchParams,
    ): Promise<T> {
      const { url, method } = ENDPOINTS[op];
      if (typeof url === "function" && id == null)
        throw Error("Thiếu mã bản ghi.");
      const numericId = Number(id);
      if (
        typeof url === "function" &&
        (!Number.isSafeInteger(numericId) || numericId <= 0)
      )
        throw Error("ID bản ghi phải là số nguyên dương an toàn.");
      const path = typeof url === "string" ? url : url(numericId);
      if (!session) throw Error("Phiên đăng nhập đã hết hạn.");
      try {
        const data = await apiRequest<T>(
          path + (query?.size ? "?" + query : ""),
          {
            method,
            body: body instanceof FormData ? body : JSON.stringify(body),
          },
          session.accessToken,
        );
        if (
          data == null &&
          ![
            "adminUserLock",
            "adminUserUnlock",
            "adminUserResetPassword",
            "subjectDelete",
            "roomDelete",
          ].includes(op)
        )
          throw Error("Backend chưa trả dữ liệu.");
        return data as T;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401 && e.code !== 4003)
          clearSession();
        if (e instanceof ApiError && e.status === 403 && e.code === 4006)
          requirePasswordChange();
        throw e;
      }
    },
    [session, clearSession, requirePasswordChange],
  );
}

export async function readAllPages<T>(
  request: ReturnType<typeof useLiveRequest>,
  op: Op,
  filters = new URLSearchParams(),
  active = () => true,
) {
  const rows: T[] = [];
  const q = new URLSearchParams(filters);
  q.set("size", "100");
  for (let page = 0; active(); page++) {
    q.set("page", String(page));
    const r = await request<
      import("../../services/api/backendContract").PageResponse<T>
    >(op, undefined, undefined, q);
    rows.push(...r.content);
    if (r.last || page + 1 >= r.totalPages) break;
  }
  return rows;
}
