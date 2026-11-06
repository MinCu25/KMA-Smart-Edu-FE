import { Card } from "../../components/common";
import type { Page, PageProps } from "../../types/navigation";
const pages: Record<
  string,
  {
    title: string;
    section: string;
    filters?: string[];
    columns?: string[];
    button?: string;
  }
> = {
  register: {
    title: "Đăng ký học phần",
    section: "Lớp học phần đang mở",
    filters: ["Học phần", "Giảng viên"],
    columns: [
      "Mã lớp",
      "Học phần",
      "TC",
      "Giảng viên",
      "Lịch học",
      "Sĩ số",
      "Điều kiện",
    ],
  },
  schedule: {
    title: "Thời khóa biểu",
    section: "Lịch học theo tuần",
    filters: ["Tuần học"],
    button: "Xuất lịch tuần CSV",
  },
  academic: {
    title: "Học vụ cá nhân",
    section: "Kết quả học tập",
    filters: ["Kỳ học"],
    columns: [
      "Học phần",
      "TC",
      "Điểm quá trình",
      "Tổng kết (10)",
      "Thang 4",
      "Điểm chữ",
      "Trạng thái",
    ],
  },
  "teaching-classes": {
    title: "Lớp học phần của tôi",
    section: "Lớp được phân công",
    filters: ["Kỳ học"],
    columns: ["Mã lớp học phần", "Học phần", "Sĩ số", "Lịch học", "Phòng học", "Thao tác"],
  },
  "teaching-schedule": {
    title: "Lịch giảng dạy",
    section: "Lịch theo tuần",
    filters: ["Kỳ học", "Tuần học"],
  },
  grades: {
    title: "Quản lý điểm quá trình",
    section: "Danh sách sinh viên",
    filters: ["Kỳ học", "Lớp học phần"],
    columns: ["MSSV", "Họ và tên", "TP1", "TP2", "Ghi chú"],
    button: "Xuất CSV (điểm đã lưu)",
  },
  "academic-timetable": {
    title: "Thời khóa biểu",
    section: "Lịch theo tuần",
    filters: [
      "Kỳ học",
      "Mã lớp / học phần",
      "Giảng viên",
      "Phòng học",
      "Tuần học",
    ],
    button: "Xuất lịch tuần CSV",
  },
  knowledge: {
    title: "Nguồn tri thức AI",
    section: "Danh sách tài liệu",
    filters: ["Tìm kiếm", "Trạng thái"],
    button: "Thêm tài liệu",
  },
  chat: {
    title: "Trợ lý AI",
    section: "Hỏi đáp thông thường",
    button: "Cuộc trò chuyện mới",
  },
  "chat-graduation": {
    title: "Trợ lý AI",
    section: "Tư vấn tốt nghiệp",
    button: "Cuộc trò chuyện mới",
  },
  "chat-history": {
    title: "Trợ lý AI",
    section: "Lịch sử hỏi đáp",
    button: "Cuộc trò chuyện mới",
  },
};
export function PendingPage({ page, onNavigate }: { page: Page } & PageProps) {
  const config = pages[page];
  if (!config) return null;
  const chat = page.startsWith("chat");
  const panel = (
    <Card title={config.section}>
      {config.filters && (
        <div className="management-toolbar">
          {config.filters.map((f) => (
            <label key={f}>
              {f}
              <select disabled>
                <option>Chưa có dữ liệu</option>
              </select>
            </label>
          ))}
        </div>
      )}
      {config.columns && (
        <div className="table-scroll">
          <table className="management-table">
            <thead>
              <tr>
                {config.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
      )}
      <p className="empty-state" role="status">
        Chức năng {config.section.toLowerCase()} đang chờ API từ backend.
      </p>
      {chat && page !== "chat-history" && (
        <div className="form-row">
          <input disabled placeholder="Nhập câu hỏi…" aria-label="Câu hỏi" />
          <button className="btn primary" disabled>
            Gửi
          </button>
        </div>
      )}
    </Card>
  );
  return (
    <>
      <div className="page-title">
        <div>
          <h1>{config.title}</h1>
        </div>
        {config.button && (
          <button className="btn" disabled>
            {config.button}
          </button>
        )}
      </div>
      {chat && (
        <nav className="chat-tabs">
          {(["chat", "chat-graduation", "chat-history"] as const).map((id) => (
            <button
              key={id}
              className={id === page ? "selected" : ""}
              onClick={() => onNavigate(id)}
            >
              {pages[id].section}
            </button>
          ))}
        </nav>
      )}
      {page === "register" ? (
        <div className="register-layout">
          {panel}
          <aside className="registration-side">
            <Card title="Tín chỉ kỳ này">Chờ dữ liệu đăng ký</Card>
            <Card title="Đã đăng ký">Chờ danh sách học phần</Card>
          </aside>
        </div>
      ) : (
        panel
      )}
      {page === "academic-timetable" && (
        <Card title="Chưa xếp lịch">Chờ dữ liệu lịch học</Card>
      )}
    </>
  );
}
