import { useState } from "react";
import { useManagement } from "../../context/ManagementContext";
import { useUI } from "../../context/UIContext";
import { ManagementHeading } from "../../components/common/ManagementHeading";
export default function SettingsPage() {
  const { settings, setSettings, log } = useManagement();
  const { notify } = useUI();
  const [draft, setDraft] = useState(settings);
  return (
    <>
      <ManagementHeading
        title="Cấu hình hệ thống"
        description="Lưu cấu hình để chuẩn bị tích hợp dịch vụ backend."
      />
      <section className="card settings-card">
        <h2>Thông tin cổng học vụ</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSettings(draft);
            log("Admin hệ thống", "Lưu cấu hình", JSON.stringify(draft));
            notify("Đã lưu cấu hình.");
          }}
        >
          <label>
            Tên hệ thống
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            Email hỗ trợ
            <input
              type="email"
              required
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </label>
          <label>
            Giới hạn tín chỉ đề xuất
            <input
              type="number"
              required
              min={1}
              max={40}
              value={draft.maxCredits}
              onChange={(e) =>
                setDraft({ ...draft, maxCredits: e.target.value })
              }
            />
          </label>
          <div className="notice blue">
            Các giá trị này chỉ được lưu như cấu hình, chưa thay đổi quy tắc
            đăng ký hoặc gửi email.
          </div>
          <button className="btn primary">Lưu cấu hình</button>
        </form>
      </section>
    </>
  );
}
