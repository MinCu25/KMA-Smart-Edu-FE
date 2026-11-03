import { useTeaching } from "../../hooks/useTeaching";
import { useState } from "react";
import { Download, Users, ArrowRight } from "lucide-react";
import { useDemoData } from "../../context/DemoDataContext";
import { exportCsv } from "../../utils/exportCsv";
import { ManagementHeading } from "../../components/common/ManagementHeading";
import type { PageProps } from "../../types/navigation";
export default function ClassesPage({ onNavigate }: PageProps) {
  const {
    lecturerCode,
    records,
    classes,
    selected,
    setSelected,
    rosters,
    periods,
    teachingTerm,
    changePeriod,
    periodName,
    readonly,
  } = useTeaching();
  const { studentData } = useDemoData();
  const [openedClass, setOpenedClass] = useState<string | null>(null);
  const roster = studentData.filter((s) =>
    (rosters[selected] ?? []).includes(s.id),
  );
  return (
    <>
      <ManagementHeading
        title="Lớp học phần của tôi"
        description={periodName + " · Giảng viên " + lecturerCode}
      />
      <section className="card management-toolbar">
        <label>
          Kỳ học
          <select
            value={teachingTerm}
            onChange={(e) => {
              setOpenedClass(null);
              changePeriod(e.target.value);
            }}
          >
            {periods.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </section>
      <div className="management-grid">
        {classes.map((c) => (
          <section className="card teaching-card" key={c.id}>
            <span className="badge blue">{c.id}</span>
            <h2>{records.subjects.find((s) => s.id === c.subject)?.name}</h2>
            <p>
              {c.day} · Tiết {c.start}–{c.end} · Phòng {c.room}
            </p>
            <div className="teaching-card-bottom">
              <span>
                <Users size={15} /> {(rosters[c.id] ?? []).length} sinh viên
              </span>
              <button
                className="btn"
                onClick={() => {
                  setSelected(c.id);
                  setOpenedClass(c.id);
                }}
              >
                Danh sách lớp <ArrowRight size={14} />
              </button>
            </div>
          </section>
        ))}
      </div>
      {!classes.length && (
        <div className="card empty-state">Chưa có lớp được phân công.</div>
      )}
      {openedClass === selected && (
        <section className="card">
          <div className="card-heading">
            <h2>Danh sách sinh viên · {selected}</h2>
            <div className="management-actions">
              <button
                className="btn"
                onClick={() =>
                  exportCsv(teachingTerm + "-" + selected + ".csv", [
                    ["MSSV", "Họ tên", "Lớp"],
                    ...roster.map((s) => [s.id, s.name, s.className]),
                  ])
                }
              >
                <Download size={14} />
                Xuất CSV
              </button>
              <button
                className="btn primary"
                onClick={() => onNavigate("grades")}
              >
                {readonly ? "Xem điểm" : "Nhập điểm"}
              </button>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>MSSV</th>
                  <th>Họ và tên</th>
                  <th>Lớp hành chính</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => (
                  <tr key={s.id}>
                    <td className="code-text">{s.id}</td>
                    <td>{s.name}</td>
                    <td>{s.className}</td>
                    <td>
                      <span className="badge blue">{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!roster.length && (
            <div className="empty-state">Lớp chưa có danh sách sinh viên.</div>
          )}
        </section>
      )}
    </>
  );
}
