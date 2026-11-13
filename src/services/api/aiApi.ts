import { apiRequest } from "./httpClient";
import type { PageResponse } from "./backendContract";

// Source: CanhhTran-01/edu-hub, feature/ai-assistant-01, commit 3cbf6f905be02fae2b26481d6aa80c758d77d041.
export interface AiCitation {
  sourceTitle: string | null;
  sectionTitle: string | null;
  pageNumber: number | null;
  snippet: string | null;
}
export interface AiMessage {
  messageId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  intent: string | null;
  createdAt: string;
  citations: AiCitation[];
}
export interface AiAnswer {
  sessionId: string;
  messageId: string;
  content: string;
  intent: string;
  citations: AiCitation[];
  scenario: unknown | null;
}
export interface AiSession {
  sessionId: string;
  createdAt: string;
  lastMessageAt: string;
  lastMessage: string | null;
}
export interface AiDetail {
  sessionId: string;
  createdAt: string;
  messages: AiMessage[];
}
export interface AiUpload {
  sourceTitle: string;
  chunkCount: number;
}
export const AI_PATHS = {
  chat: "/api/v1/ai/chat",
  sessions: "/api/v1/ai/sessions",
  documents: "/api/v1/ai/documents",
} as const;
export function sessionPath(id: string) {
  // IDs are strings in the Java DTO; never coerce a Long to a JS Number.
  if (!/^[1-9]\d*$/.test(id) || BigInt(id) > 9223372036854775807n)
    throw Error("Mã cuộc trò chuyện không hợp lệ.");
  return AI_PATHS.sessions + "/" + encodeURIComponent(id);
}
export function questionError(message: string) {
  if (!message.trim()) return "Vui lòng nhập câu hỏi.";
  if (message.length > 2000) return "Câu hỏi không được vượt quá 2.000 ký tự.";
  return "";
}
export async function documentError(file: File | null) {
  if (!file) return "Vui lòng chọn tài liệu.";
  if (!file.name.toLowerCase().endsWith(".txt"))
    return "Chỉ chấp nhận file TXT mã hóa UTF-8.";
  if (!file.size) return "Tài liệu không được rỗng.";
  if (file.size > 20 * 1024 * 1024) return "Tài liệu tối đa 20 MB.";
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(
      await file.arrayBuffer(),
    );
    if (!text.trim()) return "Tài liệu không có nội dung.";
  } catch {
    return "Không đọc được văn bản UTF-8. Hãy lưu lại file bằng mã hóa UTF-8.";
  }
  return "";
}
export function createAiApi(token: string) {
  async function read<T>(path: string, init: RequestInit = {}) {
    const data = await apiRequest<T>(path, init, token);
    if (data == null) throw Error("Backend chưa trả dữ liệu AI.");
    return data;
  }
  return {
    async chat(message: string, sessionId: string | null): Promise<AiAnswer> {
      const error = questionError(message);
      if (error) throw Error(error);
      if (sessionId !== null) sessionPath(sessionId);
      return read<AiAnswer>(AI_PATHS.chat, {
        method: "POST",
        body: JSON.stringify({ message, sessionId }),
      });
    },
    sessions(page: number) {
      return read<PageResponse<AiSession>>(
        `${AI_PATHS.sessions}?page=${page}&size=20`,
      );
    },
    session(id: string) {
      return read<AiDetail>(sessionPath(id));
    },
    async upload(file: File) {
      const error = await documentError(file);
      if (error) throw Error(error);
      const body = new FormData();
      body.append("file", file);
      return read<AiUpload>(AI_PATHS.documents, { method: "POST", body });
    },
  };
}
