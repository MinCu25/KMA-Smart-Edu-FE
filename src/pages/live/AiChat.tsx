import { useEffect, useRef, useState } from "react";
import type { Page, PageProps } from "../../types/navigation";
import type {
  AiMessage,
  AiCitation,
  AiSession,
} from "../../services/api/aiApi";
import { questionError } from "../../services/api/aiApi";
import type { PageResponse } from "../../services/api/backendContract";
import { useAiApi } from "./useAiApi";
import { ApiError } from "../../services/api/httpClient";
import "./ai.css";
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "Không thể thực hiện yêu cầu.";
export function AiCitations({ items }: { items: AiCitation[] }) {
  if (!items.length) return null;
  return (
    <details className="ai-citations">
      <summary>Nguồn tham khảo ({items.length})</summary>
      {items.map((c, i) => (
        <article key={i}>
          <strong>{c.sourceTitle || "Tài liệu tham khảo"}</strong>
          {c.sectionTitle && <p>{c.sectionTitle}</p>}
          {c.pageNumber != null && <p>Trang {c.pageNumber}</p>}
          {c.snippet && <blockquote>{c.snippet}</blockquote>}
        </article>
      ))}
    </details>
  );
}
export function AiChat({ page, onNavigate }: { page: Page } & PageProps) {
  const api = useAiApi();
  const [sessions, setSessions] = useState<PageResponse<AiSession>>();
  const [index, setIndex] = useState(0),
    [revision, refresh] = useState(0);
  const [historyError, setHistoryError] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [question, setQuestion] = useState(""),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false);
  const generation = useRef(0),
    pending = useRef(false),
    bottom = useRef<HTMLDivElement>(null);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy]);
  useEffect(() => {
    if (page !== "chat-history") return;
    let active = true;
    setSessions(undefined);
    setHistoryError("");
    api
      .sessions(index)
      .then((r) => {
        if (active) {
          if (index > 0 && index >= r.totalPages)
            setIndex(Math.max(0, r.totalPages - 1));
          else setSessions(r);
        }
      })
      .catch((e) => {
        if (active) setHistoryError(errorText(e));
      });
    return () => {
      active = false;
    };
  }, [api, index, page, revision]);
  function reset() {
    if (pending.current) return;
    generation.current++;
    setSessionId(null);
    setMessages([]);
    setQuestion("");
    setError("");
    setLoading(false);
    onNavigate("chat");
  }
  async function open(id: string) {
    if (pending.current) return;
    const request = ++generation.current;
    setLoading(true);
    setError("");
    setSessionId(null);
    setMessages([]);
    try {
      const r = await api.session(id);
      if (request === generation.current) {
        setSessionId(r.sessionId);
        setMessages(r.messages);
        setQuestion("");
      }
    } catch (e) {
      if (request === generation.current) setError(errorText(e));
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending.current || loading) return;
    const validation = questionError(question);
    setError(validation);
    if (validation) return;
    pending.current = true;
    setBusy(true);
    const request = generation.current;
    const text = question;
    try {
      const r = await api.chat(text, sessionId);
      if (request !== generation.current) return;
      setSessionId(r.sessionId);
      setMessages((old) => [
        ...old,
        {
          messageId: `local-${r.messageId}`,
          role: "USER",
          content: text,
          intent: null,
          createdAt: "",
          citations: [],
        },
        {
          messageId: r.messageId,
          role: "ASSISTANT",
          content: r.content,
          intent: r.intent,
          createdAt: "",
          citations: r.citations ?? [],
        },
      ]);
      setQuestion("");
      refresh((n) => n + 1);
    } catch (e) {
      if (request === generation.current) {
        const detail =
          e instanceof ApiError ? e.errors.map((x) => x.message).join(" ") : "";
        setError(detail || errorText(e));
      }
    } finally {
      pending.current = false;
      if (request === generation.current) setBusy(false);
    }
  }
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Trợ lý AI</h1>
          <p>Tra cứu thông tin từ tài liệu của nhà trường.</p>
        </div>
        <button className="btn primary" disabled={busy} onClick={reset}>
          Cuộc trò chuyện mới
        </button>
      </div>
      <nav className="chat-tabs" aria-label="Chức năng trợ lý AI">
        {(
          [
            ["chat", "Hỏi đáp thông thường"],
            ["chat-graduation", "Tư vấn tốt nghiệp"],
            ["chat-history", "Lịch sử hỏi đáp"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            disabled={busy}
            className={page === id ? "selected" : ""}
            onClick={() => onNavigate(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {page === "chat-graduation" ? (
        <section className="card">
          <h2>Tư vấn tốt nghiệp</h2>
          <p>
            Chưa hỗ trợ tính GPA và lập lộ trình tốt nghiệp theo hồ sơ học tập.
            Bạn có thể hỏi về quy định tốt nghiệp trong mục Hỏi đáp thông
            thường.
          </p>
          <button className="btn" onClick={() => onNavigate("chat")}>
            Hỏi về quy định
          </button>
        </section>
      ) : (
        <div
          className={
            page === "chat-history" ? "ai-workspace" : "ai-workspace single"
          }
        >
          {page === "chat-history" && (
            <aside className="card ai-history">
              <h2>Lịch sử hỏi đáp</h2>
              {historyError ? (
                <p role="alert">
                  {historyError}{" "}
                  <button className="btn" onClick={() => refresh((n) => n + 1)}>
                    Thử lại
                  </button>
                </p>
              ) : !sessions ? (
                <p role="status">Đang tải lịch sử…</p>
              ) : (
                <>
                  {!sessions.content.length && <p>Chưa có cuộc trò chuyện.</p>}
                  {sessions.content.map((s) => (
                    <button
                      className={
                        "ai-session " +
                        (sessionId === s.sessionId ? "active" : "")
                      }
                      key={s.sessionId}
                      disabled={busy}
                      onClick={() => void open(s.sessionId)}
                    >
                      <strong>Cuộc trò chuyện #{s.sessionId}</strong>
                      <span>{s.lastMessage || "Chưa có tin nhắn"}</span>
                      <small>
                        {new Date(s.lastMessageAt).toLocaleString("vi-VN")}
                      </small>
                    </button>
                  ))}
                  <div className="ai-pagination">
                    <button
                      className="btn"
                      disabled={!index || busy}
                      onClick={() => setIndex((n) => n - 1)}
                    >
                      Trước
                    </button>
                    <span>
                      {index + 1}/{Math.max(1, sessions.totalPages)}
                    </span>
                    <button
                      className="btn"
                      disabled={index + 1 >= sessions.totalPages || busy}
                      onClick={() => setIndex((n) => n + 1)}
                    >
                      Sau
                    </button>
                  </div>
                </>
              )}
            </aside>
          )}
          <section className="card ai-conversation">
            <h2>
              {sessionId
                ? "Cuộc trò chuyện #" + sessionId
                : page === "chat-history"
                  ? "Nội dung cuộc trò chuyện"
                  : "Hỏi đáp thông thường"}
            </h2>
            <div
              className="ai-messages"
              aria-live="polite"
              aria-busy={busy || loading}
            >
              {loading ? (
                <p>Đang tải cuộc trò chuyện…</p>
              ) : !messages.length ? (
                <p className="empty-state">
                  {page === "chat-history"
                    ? "Chọn một cuộc trò chuyện để xem lại."
                    : "Nhập câu hỏi để bắt đầu cuộc trò chuyện."}
                </p>
              ) : (
                messages.map((m) => (
                  <article
                    key={m.messageId}
                    className={
                      "ai-message " + (m.role === "USER" ? "user" : "assistant")
                    }
                  >
                    <strong>{m.role === "USER" ? "Bạn" : "Trợ lý AI"}</strong>
                    <div className="ai-content">{m.content}</div>
                    <AiCitations items={m.citations ?? []} />
                  </article>
                ))
              )}
              {busy && (
                <p role="status">Đang tìm tài liệu và tạo câu trả lời…</p>
              )}
              <div ref={bottom} />
            </div>
            <form className="ai-compose" onSubmit={send} noValidate>
              <label htmlFor="ai-question">Câu hỏi</label>
              <textarea
                id="ai-question"
                value={question}
                disabled={
                  busy || loading || (page === "chat-history" && !sessionId)
                }
                aria-invalid={!!error}
                aria-describedby={error ? "ai-error" : undefined}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  setError("");
                }}
                placeholder="Nhập câu hỏi về quy định học vụ…"
                rows={3}
              />
              <div className="ai-compose-footer">
                <small>{question.length}/2.000 ký tự</small>
                <button
                  className="btn primary"
                  disabled={
                    busy || loading || (page === "chat-history" && !sessionId)
                  }
                >
                  {busy ? "Đang gửi…" : "Gửi"}
                </button>
              </div>
              {error && (
                <p id="ai-error" className="field-error" role="alert">
                  {error}
                </p>
              )}
            </form>
          </section>
        </div>
      )}
    </>
  );
}
