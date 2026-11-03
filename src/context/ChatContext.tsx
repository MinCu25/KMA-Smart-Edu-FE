import { academicSummary } from "../data/mock/grades";
import { createId } from "../utils/id";
import { chatReply } from "../services/mock/dtoService";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useDemoData } from "./DemoDataContext";
import { useAuth } from "./AuthContext";
import { usePersistentState } from "../hooks/usePersistentState";
import { getDemoReply } from "../services/mock/chatService";
import type { ChatMessage } from "../types/chat";
export type ChatKind = "general" | "graduation";
export type Conversation = {
  id: string;
  owner: string;
  kind: ChatKind;
  title: string;
  createdAt: string;
  updatedAt: string;
  sessionId: string | null;
  messages: ChatMessage[];
};
function useChatState() {
  const { session } = useAuth();
  const owner = session?.user.username ?? "";
  const { target, selected, credits } = useDemoData();
  const [all, setAll] = usePersistentState<Conversation[]>(
    "kma-chat-conversations-v1",
    [],
  );
  const [activeIds, setActiveIds] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const busy = useRef(new Set<string>());
  const conversations = all
    .filter((c) => c.owner === owner)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  function active(kind: ChatKind) {
    return (
      conversations.find(
        (c) => c.id === activeIds[`${owner}:${kind}`] && c.kind === kind,
      ) ?? conversations.find((c) => c.kind === kind)
    );
  }
  function newConversation(kind: ChatKind) {
    const now = new Date().toISOString();
    const c: Conversation = {
      id: createId(),
      owner,
      kind,
      title:
        kind === "general" ? "Cuộc trò chuyện mới" : "Tư vấn tốt nghiệp mới",
      createdAt: now,
      updatedAt: now,
      sessionId: null,
      messages: [],
    };
    setAll((old) => [c, ...old]);
    setActiveIds((old) => ({ ...old, [`${owner}:${kind}`]: c.id }));
    return c;
  }
  function openConversation(id: string) {
    const c = conversations.find((c) => c.id === id);
    if (c) setActiveIds((old) => ({ ...old, [`${owner}:${c.kind}`]: c.id }));
    return c;
  }
  function draft(kind: ChatKind) {
    return drafts[active(kind)?.id ?? `${owner}:${kind}:new`] ?? "";
  }
  function setDraft(kind: ChatKind, text: string) {
    const key = active(kind)?.id ?? `${owner}:${kind}:new`;
    setDrafts((old) => ({ ...old, [key]: text }));
  }
  async function send(
    kind: ChatKind,
    message: string,
    requestedTarget = target,
  ) {
    const existing = active(kind);
    const key = existing?.id ?? `${owner}:${kind}:new`;
    if (
      kind === "graduation" &&
      (requestedTarget.trim() === "" ||
        !Number.isFinite(Number(requestedTarget)) ||
        Number(requestedTarget) < 0 ||
        Number(requestedTarget) > 4)
    ) {
      setErrors((old) => ({
        ...old,
        [key]: "Vui lòng nhập GPA mục tiêu từ 0 đến 4.",
      }));
      return;
    }
    if (!message.trim() || message.length > 2000) {
      setErrors((old) => ({
        ...old,
        [key]: "Tin nhắn phải có từ 1 đến 2000 ký tự.",
      }));
      return;
    }
    if (existing && busy.current.has(existing.id)) return;
    const c = existing ?? newConversation(kind);
    busy.current.add(c.id);
    setPendingIds((old) => [...old, c.id]);
    setErrors((old) => ({ ...old, [c.id]: "" }));
    setDrafts((old) => ({ ...old, [key]: "", [c.id]: "" }));
    const question = message.trim();
    setAll((old) =>
      old.map((x) =>
        x.id === c.id
          ? {
              ...x,
              title: x.messages.length ? x.title : question.slice(0, 70),
              updatedAt: new Date().toISOString(),
              messages: [...x.messages, { role: "user", text: question }],
            }
          : x,
      ),
    );
    try {
      const text = await getDemoReply({
        question:
          kind === "graduation" ? `Tư vấn tốt nghiệp: ${question}` : question,
        target: requestedTarget,
        selected,
        credits,
        summary:
          academicSummary.studentCode === owner ? academicSummary : undefined,
      });
      const reply = chatReply(
        { sessionId: c.sessionId, message: question },
        text,
      );
      // Capture the conversation ID: replies cannot jump to a newly opened conversation.
      setAll((old) =>
        old.map((x) =>
          x.id === c.id
            ? {
                ...x,
                sessionId: reply.sessionId,
                updatedAt: new Date().toISOString(),
                messages: [
                  ...x.messages,
                  {
                    role: "assistant",
                    text: reply.content,
                    messageId: reply.messageId,
                    intent: reply.intent,
                    citations: reply.citations,
                    scenario: reply.scenario,
                  },
                ],
              }
            : x,
        ),
      );
    } catch (error) {
      setErrors((old) => ({
        ...old,
        [c.id]:
          error instanceof Error
            ? error.message
            : "Không gửi được câu hỏi. Vui lòng thử lại.",
      }));
      setDrafts((old) => ({ ...old, [c.id]: question }));
    } finally {
      busy.current.delete(c.id);
      setPendingIds((old) => old.filter((id) => id !== c.id));
    }
  }
  return {
    conversations,
    active,
    newConversation,
    openConversation,
    draft,
    setDraft,
    send,
    pendingIds,
    errors,
    owner,
  };
}
const ChatContext = createContext<ReturnType<typeof useChatState> | null>(null);
export function ChatProvider({ children }: { children: ReactNode }) {
  const state = useChatState();
  return <ChatContext.Provider value={state}>{children}</ChatContext.Provider>;
}
export function useChat() {
  const value = useContext(ChatContext);
  if (!value) throw Error("ChatProvider required");
  return value;
}
