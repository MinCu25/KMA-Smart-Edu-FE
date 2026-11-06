import { X } from "lucide-react";
import { useUI } from "../../context/UIContext";
import { useAuth } from "../../context/AuthContext";
import "./admin-dialog.css";
export function AppDialog() {
  const { dialog, setDialog, notifyError } = useUI();
  const { role } = useAuth();
  const admin = role === "academic-admin" || role === "system-admin";
  if (!dialog) return null;
  return (
    <div className={"dialog-backdrop" + (admin ? " admin-dialog-backdrop" : "")} onClick={() => setDialog(null)}>
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") setDialog(null);
        }}
      >
        <button
          autoFocus
          className="close-dialog"
          aria-label="Đóng"
          onClick={() => setDialog(null)}
        >
          <X size={18} />
        </button>
        <h2 id="dialog-title">{dialog.title}</h2>
        {dialog.content || (
          <>
            <p>{dialog.body}</p>
            <div className="dialog-actions">
              <button className="btn" onClick={() => setDialog(null)}>
                {dialog.action ? "Hủy" : "Đóng"}
              </button>
              {dialog.action && (
                <button
                  className="btn primary"
                  onClick={() => {
                    try {
                      dialog.action?.();
                      setDialog(null);
                    } catch (error) {
                      notifyError(
                        error instanceof Error
                          ? error.message
                          : "Thao tác thất bại. Vui lòng thử lại.",
                      );
                    }
                  }}
                >
                  {dialog.confirm || "Xác nhận"}
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
