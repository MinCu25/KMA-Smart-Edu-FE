import { useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { createAiApi } from "../../services/api/aiApi";
import { ApiError } from "../../services/api/httpClient";
export function useAiApi() {
  const { session, clearSession, requirePasswordChange } = useAuth();
  return useMemo(() => {
    const api = createAiApi(session?.accessToken ?? "");
    async function call<T>(action: () => Promise<T>) {
      if (!session) throw Error("Phiên đăng nhập đã hết hạn.");
      try {
        return await action();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401 && e.code !== 4003)
          clearSession();
        if (e instanceof ApiError && e.status === 403 && e.code === 4006)
          requirePasswordChange();
        throw e;
      }
    }
    return {
      chat: (...args: Parameters<typeof api.chat>) =>
        call(() => api.chat(...args)),
      sessions: (page: number) => call(() => api.sessions(page)),
      session: (id: string) => call(() => api.session(id)),
      upload: (file: File) => call(() => api.upload(file)),
    };
  }, [session, clearSession, requirePasswordChange]);
}
