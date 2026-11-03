import { validateTarget } from "../../utils/profileValidation";
import { useEffect, useRef, useState } from "react";
import { Card, Notice } from "../../components/common";
import { Send, Plus, MessageSquare, History } from "lucide-react";
import { useChat, type ChatKind } from "../../context/ChatContext";
import { useDemoData } from "../../context/DemoDataContext";
import type { Page, PageProps } from "../../types/navigation";
export default function ChatPage({
  page,
  onNavigate,
}: PageProps & { page: Page }) {
  const chat = useChat();
  const { target, setTarget } = useDemoData();
  const [targetDrafts, setTargetDrafts] = useState<Record<string, string>>({});
  const [targetErrors, setTargetErrors] = useState<Record<string, string>>({});
  const draftTarget = targetDrafts[chat.owner] ?? target;
  function send(message: string) {
    if (kind === "graduation") {
      const error = validateTarget(draftTarget);
      setTargetErrors((old) => ({ ...old, [chat.owner]: error }));
      if (error) return;
      setTarget(draftTarget);
    }
    return chat.send(kind, message, draftTarget);
  }
  const history = page === "chat-history";
  const kind: ChatKind = page === "chat-graduation" ? "graduation" : "general";
  const c = chat.active(kind);
  const messages = c?.messages ?? [];
  const pending = !!c && chat.pendingIds.includes(c.id);
  const error = chat.errors[c?.id ?? `${chat.owner}:${kind}:new`];
  const bottom = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [c?.id, messages.length, pending]);
  const title = history
    ? "Lịch sử hỏi đáp"
    : kind === "graduation"
      ? "Tư vấn tốt nghiệp"
      : "Hỏi đáp thông thường";
  function create() {
    chat.newConversation(history ? "general" : kind);
    onNavigate(history ? "chat" : page);
  }
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Trợ lý AI</h1>
          <p>Hỏi đáp học vụ và tư vấn lộ trình học tập.</p>
        </div>
        <button className="btn" onClick={create}>
          <Plus size={16} />
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
            className={page === id ? "selected" : ""}
            aria-current={page === id ? "page" : undefined}
            onClick={() => onNavigate(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {history ? (
        <Card title={title}>
          <label>
            Tìm cuộc trò chuyện
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tiêu đề hoặc nội dung…"
            />
          </label>
          <p className="history-hint">
            Lịch sử được lưu trên trình duyệt này, theo tài khoản.
          </p>
          <div className="conversation-list">
            {chat.conversations
              .filter((c) =>
                (c.title + " " + c.messages.map((m) => m.text).join(" "))
                  .toLocaleLowerCase()
                  .includes(search.toLocaleLowerCase()),
              )
              .map((c) => (
                <button
                  className="conversation-item"
                  key={c.id}
                  onClick={() => {
                    chat.openConversation(c.id);
                    onNavigate(
                      c.kind === "general" ? "chat" : "chat-graduation",
                    );
                  }}
                >
                  <MessageSquare size={20} />
                  <span>
                    <b>{c.title}</b>
                    <small>
                      {c.kind === "general" ? "Hỏi đáp" : "Tư vấn tốt nghiệp"} ·{" "}
                      {new Date(c.updatedAt).toLocaleString("vi-VN")} ·{" "}
                      {c.messages.length} tin nhắn
                    </small>
                    <p>
                      {c.messages.at(-1)?.text.slice(0, 140) ??
                        "Chưa có tin nhắn"}
                    </p>
                  </span>
                  <span>Xem →</span>
                </button>
              ))}
          </div>
          {!chat.conversations.length && (
            <div className="empty-state">
              <History size={24} />
              <p>
                Chưa có cuộc trò chuyện nào. Bắt đầu hỏi đáp để lưu lịch sử tại
                đây.
              </p>
            </div>
          )}
        </Card>
      ) : (
        <>
          {kind === "graduation" && (
            <Card title="Mục tiêu tốt nghiệp">
              <p>
                Đặt GPA mục tiêu rồi hỏi trợ lý về điểm cần đạt và lộ trình học
                tập.
              </p>
              <label>
                GPA mục tiêu (thang 4)
                <input
                  aria-label="GPA mục tiêu"
                  type="number"
                  min={0}
                  max={4}
                  step={0.01}
                  value={draftTarget}
                  aria-invalid={!!targetErrors[chat.owner]}
                  aria-describedby={
                    targetErrors[chat.owner] ? "chat-target-error" : undefined
                  }
                  onChange={(e) => {
                    setTargetDrafts((old) => ({
                      ...old,
                      [chat.owner]: e.target.value,
                    }));
                    setTargetErrors((old) => ({ ...old, [chat.owner]: "" }));
                  }}
                />
                {targetErrors[chat.owner] && (
                  <div id="chat-target-error" className="field-error">
                    {targetErrors[chat.owner]}
                  </div>
                )}
              </label>
            </Card>
          )}
          <Card className="chat-card" title={title}>
            <div className="chat-messages" aria-live="polite">
              {!messages.length ? (
                <>
                  <div className="message assistant">
                    <p>
                      {kind === "general"
                        ? "Chào bạn! Bạn muốn tìm hiểu điều gì về học vụ?"
                        : "Bạn muốn đạt GPA bao nhiêu khi tốt nghiệp? Mình sẽ hỗ trợ tính toán lộ trình."}
                    </p>
                  </div>
                  <div className="suggestions">
                    {(kind === "general"
                      ? ["Hướng dẫn đăng ký học phần", "Lịch học của tôi"]
                      : [
                          "Tôi cần GPA bao nhiêu để đạt mục tiêu?",
                          "Tư vấn lộ trình tốt nghiệp",
                        ]
                    ).map((q) => (
                      <button
                        className="btn"
                        key={q}
                        disabled={pending}
                        onClick={() => send(q)}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                messages.map((m, i) => (
                  <div className={`message ${m.role}`} key={i}>
                    <p>{m.text}</p>
                    {!!m.citations?.length && (
                      <details>
                        <summary>Nguồn tham khảo</summary>
                        {m.citations.map((source, index) => (
                          <div key={index}>
                            <b>{source.sourceTitle}</b>
                            <p>
                              {source.sectionTitle}
                              {source.pageNumber != null
                                ? ` · Trang ${source.pageNumber}`
                                : ""}
                            </p>
                            <p>{source.snippet}</p>
                          </div>
                        ))}
                      </details>
                    )}
                    {m.scenario && (
                      <div className="notice">
                        <p>
                          GPA mục tiêu: {m.scenario.targetGpa ?? "—"} · GPA hiện
                          tại: {m.scenario.currentGpa ?? "—"}
                        </p>
                        <p>
                          GPA cần đạt: {m.scenario.requiredGpa ?? "—"} · GPA tối
                          đa có thể đạt: {m.scenario.maxPossibleGpa ?? "—"}
                        </p>
                        <p>
                          Khả thi:{" "}
                          {(
                            {
                              VIABLE: "Có thể đạt",
                              NOT_VIABLE: "Chưa khả thi",
                              CERTAIN: "Đã bảo đảm",
                            } as Record<string, string>
                          )[m.scenario.viabilityStatus] ??
                            m.scenario.viabilityStatus}
                        </p>
                      </div>
                    )}
                    {m.role === "assistant" && (
                      <small>Thông tin mang tính tham khảo.</small>
                    )}
                  </div>
                ))
              )}
              {pending && <p className="typing">Đang soạn phản hồi…</p>}
              <div ref={bottom} />
            </div>
            {error && <Notice tone="red">{error}</Notice>}
            <form
              className="chat-form"
              onSubmit={(e) => {
                e.preventDefault();
                send(chat.draft(kind));
              }}
            >
              <input
                maxLength={2000}
                aria-label="Nhập câu hỏi"
                value={chat.draft(kind)}
                onChange={(e) => chat.setDraft(kind, e.target.value)}
                placeholder={
                  kind === "general"
                    ? "Nhập câu hỏi của bạn…"
                    : "Hỏi về GPA và lộ trình tốt nghiệp…"
                }
              />
              <button
                className="btn primary"
                disabled={!chat.draft(kind).trim() || pending}
              >
                Gửi <Send size={14} />
              </button>
            </form>
          </Card>
        </>
      )}
    </>
  );
}
