import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  notificationDuration,
  type Notification,
  type NotificationTone,
} from "../utils/notifications";
import type { Dialog } from "../types/ui";

function useUIState() {
  const [scheduleTarget, setScheduleTarget] = useState<number | null>(null);
  const [dialog, setDialogState] = useState<Dialog | null>(null);
  const [toast, setToast] = useState<Notification | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  function dismissToast() {
    clearTimeout(toastTimer.current);
    setToast(null);
  }
  function notify(
    message: string,
    tone: NotificationTone = "success",
    title?: string,
  ) {
    clearTimeout(toastTimer.current);
    setToast({ message, tone, title });
    const duration = notificationDuration(tone);
    if (duration !== null)
      toastTimer.current = setTimeout(() => setToast(null), duration);
  }
  function setDialog(value: Dialog | null) {
    if (value) dismissToast();
    setDialogState(value);
  }
  function notifyError(message: string) {
    notify(message, "error");
  }
  useEffect(() => {
    const receive = (event: Event) => {
      const { message, tone } = (event as CustomEvent<Notification>).detail;
      notify(message, tone);
    };
    window.addEventListener("kma:notification", receive);
    return () => {
      window.removeEventListener("kma:notification", receive);
      clearTimeout(toastTimer.current);
    };
  }, []);
  return {
    scheduleTarget,
    setScheduleTarget,
    dialog,
    setDialog,
    toast,
    dismissToast,
    notify,
    notifyError,
  };
}
const UIContext = createContext<ReturnType<typeof useUIState> | null>(null);
export function UIProvider({ children }: { children: ReactNode }) {
  const state = useUIState();
  return <UIContext.Provider value={state}>{children}</UIContext.Provider>;
}
export function useUI() {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI phải được dùng bên trong UIProvider.");
  return context;
}
