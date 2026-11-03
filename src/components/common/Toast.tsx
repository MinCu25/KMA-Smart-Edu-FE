import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { useUI } from "../../context/UIContext";
export function Toast() {
  const { toast, dismissToast } = useUI();
  if (!toast) return null;
  const Icon =
    toast.tone === "success"
      ? CheckCircle2
      : toast.tone === "info"
        ? Info
        : AlertCircle;
  const title =
    toast.title ??
    {
      success: "Thành công",
      error: "Không thành công",
      info: "Thông báo",
      warning: "Cần lưu ý",
    }[toast.tone];
  return (
    <div
      className={`toast toast-${toast.tone}`}
      role={toast.tone === "error" ? "alert" : "status"}
      aria-live={toast.tone === "error" ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <Icon size={21} aria-hidden="true" />
      <div>
        {title && <strong>{title}</strong>}
        <div>{toast.message}</div>
      </div>
      <button onClick={dismissToast} aria-label="Đóng thông báo">
        <X size={18} />
      </button>
    </div>
  );
}
