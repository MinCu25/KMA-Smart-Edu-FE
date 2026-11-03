import {
  ArrowUpRight,
  BookOpen,
  Users,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
import { useManagement } from "../../context/ManagementContext";
import { useDemoData } from "../../context/DemoDataContext";
import { ManagementHeading } from "../../components/common/ManagementHeading";
import type { Navigate, Role, Page } from "../../types/navigation";
export default function ManagementDashboard({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate: Navigate;
}) {
  const { records, term, audit } = useManagement();
  const { studentData } = useDemoData();
  const lecturer = role === "lecturer",
    system = role === "system-admin";
  const own = records.classes.filter((r) => r.teacher === "GV001");
  const cards = system
    ? [
        ["Tài khoản", records.accounts.length, Users],
        [
          "Đang hoạt động",
          records.accounts.filter((r) => r.status === "Đang hoạt động").length,
          ShieldCheck,
        ],
        ["Nhóm vai trò", 4, BookOpen],
        ["Thao tác đã ghi", audit.length, CalendarDays],
      ]
    : lecturer
      ? [
          ["Lớp phụ trách", own.length, BookOpen],
          [
            "Buổi dạy / tuần",
            own.filter((r) => r.status === "Đang mở").length,
            CalendarDays,
          ],
          ["Kỳ đang giảng dạy", 1, Users],
          ["Cập nhật điểm", term.locked ? "Đã khóa" : "Đang mở", ShieldCheck],
        ]
      : [
          ["Sinh viên", studentData.length, Users],
          ["Giảng viên", records.teachers.length, Users],
          ["Học phần", records.subjects.length, BookOpen],
          ["Lớp học phần", records.classes.length, CalendarDays],
        ];
  const shortcuts: [string, string, Page][] = system
    ? [
        [
          "Quản lý tài khoản",
          "Tìm kiếm, thêm và cập nhật vai trò người dùng.",
          "accounts",
        ],
        [
          "Ma trận phân quyền",
          "Xem và cấu hình quyền theo từng vai trò.",
          "permissions",
        ],
        [
          "Nhật ký hoạt động",
          "Theo dõi những thay đổi trong phiên đăng nhập.",
          "audit",
        ],
      ]
    : lecturer
      ? [
          [
            "Lớp học phần của tôi",
            "Xem danh sách sinh viên và xuất danh sách lớp.",
            "teaching-classes",
          ],
          [
            "Nhập điểm quá trình",
            "Cập nhật TP1, TP2 và ghi chú cho sinh viên.",
            "grades",
          ],
          [
            "Lịch giảng dạy",
            "Xem lịch dạy theo lớp được phân công.",
            "teaching-schedule",
          ],
        ]
      : [
          [
            "Quản lý sinh viên",
            "Tra cứu và cập nhật hồ sơ sinh viên.",
            "admin",
          ],
          [
            "Lớp học phần & lịch học",
            "Phân công giảng viên, phòng và kiểm tra trùng lịch.",
            "classes",
          ],
          [
            "Điều hành kỳ học",
            "Công bố đăng ký và khóa cập nhật điểm.",
            "terms",
          ],
        ];
  return (
    <>
      <ManagementHeading
        title={
          lecturer
            ? "Xin chào, thầy Nguyễn Minh Tuấn"
            : system
              ? "Tổng quan hệ thống"
              : "Tổng quan học vụ"
        }
        description={
          term.name +
          " · Không gian " +
          (lecturer ? "giảng viên" : system ? "quản trị hệ thống" : "đào tạo")
        }
      />
      <section className="management-hero">
        <div>
          <span>KMA SMART EDU</span>
          <h2>
            {lecturer
              ? "Mỗi giờ học, một bước tiến."
              : system
                ? "Quản trị tập trung. Vận hành rõ ràng."
                : "Kết nối giảng dạy và học tập."}
          </h2>
          <p>
            {lecturer
              ? "Theo dõi lớp phụ trách, lịch dạy và kết quả quá trình tại một nơi."
              : "Theo dõi dữ liệu và xử lý công việc hằng ngày trên cùng một cổng quản lý."}
          </p>
        </div>
        <div className="hero-mark">
          <BookOpen size={62} />
        </div>
      </section>
      <div className="management-stats">
        {cards.map(([label, value, Icon]) => {
          const I = Icon as typeof Users;
          return (
            <section className="card" key={String(label)}>
              <div className="stat-top">
                <span>{String(label)}</span>
                <I size={19} />
              </div>
              <strong>{String(value)}</strong>
            </section>
          );
        })}
      </div>
      <div className="management-grid">
        <section className="card">
          <h2>Truy cập nhanh</h2>
          {shortcuts.map(([title, desc, page]) => (
            <button
              className="shortcut"
              key={page}
              onClick={() => onNavigate(page)}
            >
              <div>
                <b>{title}</b>
                <small>{desc}</small>
              </div>
              <ArrowUpRight size={19} />
            </button>
          ))}
        </section>
        <section className="card">
          <div className="card-heading">
            <h2>{lecturer ? "Lịch dạy sắp tới" : "Hoạt động gần đây"}</h2>
            <span className="badge blue">
              {lecturer ? "Hằng tuần" : "Hoạt động"}
            </span>
          </div>
          {lecturer ? (
            own.map((c) => (
              <div className="activity-row" key={c.id}>
                <b>{records.subjects.find((s) => s.id === c.subject)?.name}</b>
                <small>
                  {c.day} · Tiết {c.start}–{c.end} · {c.room}
                </small>
              </div>
            ))
          ) : audit.length ? (
            audit.slice(0, 4).map((a) => (
              <div className="activity-row" key={a.id}>
                <b>
                  {a.action} · {a.detail}
                </b>
                <small>
                  {a.actor} · {new Date(a.time).toLocaleString("vi-VN")}
                </small>
              </div>
            ))
          ) : (
            <div className="empty-state">
              Chưa có thay đổi. Các thao tác quản lý mới sẽ được ghi tại đây.
            </div>
          )}
        </section>
      </div>
    </>
  );
}
