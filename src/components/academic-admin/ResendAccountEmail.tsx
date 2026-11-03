import { useState } from "react";
import { useAcademic } from "../../context/AcademicContext";
import { useManagement } from "../../context/ManagementContext";
import { useUI } from "../../context/UIContext";
import { resendAccountEmail } from "../../services/academic/integrations";
export function ResendAccountEmail({ username }: { username: string }) {
  const a = useAcademic(),
    { log } = useManagement(),
    { notify, notifyError } = useUI(),
    [busy, setBusy] = useState(false);
  return (
    <button
      className="btn"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await resendAccountEmail(username);
          a.setPeople((old) => ({
            ...old,
            [username]: { ...old[username], emailStatus: "Đã gửi email" },
          }));
          log("Admin học vụ", "Gửi lại email", username);
          notify("Đã gửi lại email cấp tài khoản.");
        } catch (e) {
          const message =
            e instanceof Error ? e.message : "Không thể gửi email.";
          a.setPeople((old) => ({
            ...old,
            [username]: { ...old[username], emailStatus: message },
          }));
          log("Admin học vụ", "Gửi email chưa thành công", username);
          notifyError(message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Đang gửi…" : "Gửi lại email cấp tài khoản"}
    </button>
  );
}
