import type { PageProps } from "../../types/navigation";
import { useState } from "react";
import { useAcademic, today } from "../../context/AcademicContext";
import { useManagement } from "../../context/ManagementContext";
import { useUI } from "../../context/UIContext";
import { exportCsv } from "../../utils/exportCsv";
import {
  addDays,
  monday,
  termWeeks,
  weeklyClasses,
} from "../../utils/timetable";
const displayDate = (day: string) => day.split("-").reverse().join("/");
export default function TimetablePage({ onNavigate }: Partial<PageProps> = {}) {
  const a = useAcademic(),
    m = useManagement(),
    { notify, notifyError, setScheduleTarget } = useUI();
  const [termId, setTermId] = useState(m.semester.id),
    [teacher, setTeacher] = useState(""),
    [room, setRoom] = useState(""),
    [query, setQuery] = useState(""),
    [selectedWeek, setSelectedWeek] = useState(monday(today()));
  const term = a.terms.find((t) => t.id === termId) ?? a.terms[0];
  const weeks = termWeeks(term);
  const week = weeks.includes(selectedWeek) ? selectedWeek : weeks[0];
  const index = weeks.indexOf(week);
  const classes = a.data.classes.filter(
    (c) =>
      c.semesterCode === term?.semesterCode &&
      c.status !== "CANCELLED" &&
      (!teacher ||
        String(c.lecturerId ?? a.classMeta[c.id]?.lecturerId) === teacher) &&
      `${c.moduleClassCode} ${c.subjectCode} ${c.subjectName}`
        .toLocaleLowerCase("vi")
        .includes(query.trim().toLocaleLowerCase("vi")),
  );
  const rows =
    term && week
      ? weeklyClasses(classes, week, term).filter(
          ({ s }) => !room || s.roomCode === room,
        )
      : [];
  const unscheduled = classes.filter((c) => !c.schedules.length);
  function download() {
    try {
      exportCsv(`thoi-khoa-bieu-${term.semesterCode}-${week}.csv`, [
        [
          "Ngày",
          "Thứ",
          "Tiết đầu",
          "Tiết cuối",
          "Mã lớp",
          "Học phần",
          "Giảng viên",
          "Phòng",
          "Sĩ số",
          "Sức chứa",
        ],
        ...rows.map(({ c, s, date }) => [
          date,
          s.dayOfWeek!,
          s.lessonOrderStart!,
          s.lessonOrderEnd!,
          c.moduleClassCode,
          c.subjectName,
          c.lecturerName || "Chưa phân công",
          s.roomCode,
          c.currentSize,
          c.maxCapacity,
        ]),
      ]);
      notify("Đã xuất thời khóa biểu của tuần đang xem.");
    } catch {
      notifyError("Không thể xuất thời khóa biểu. Vui lòng thử lại.");
    }
  }
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Thời khóa biểu</h1>
          <p>Lịch theo tuần của các lớp học phần trong kỳ.</p>
        </div>
        <button className="btn" disabled={!rows.length} onClick={download}>
          Xuất lịch tuần CSV
        </button>
      </div>
      <section className="card">
        <div className="admin-filter">
          <label>
            Kỳ học
            <select
              value={term?.id ?? ""}
              onChange={(e) => {
                setTermId(+e.target.value);
                setSelectedWeek("");
              }}
            >
              {a.terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.semesterName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mã lớp / học phần
            <input
              value={query}
              placeholder="Nhập mã lớp, mã hoặc tên học phần"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label>
            Giảng viên
            <select
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
            >
              <option value="">Tất cả giảng viên</option>
              {a.data.teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.lecturerCode} · {t.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Phòng học
            <select value={room} onChange={(e) => setRoom(e.target.value)}>
              <option value="">Tất cả phòng</option>
              {a.rooms.map((r) => (
                <option key={r.id} value={r.roomCode}>
                  {r.roomCode}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="academic-toolbar week-navigation">
          <button
            className="btn"
            disabled={index <= 0}
            onClick={() => setSelectedWeek(weeks[index - 1])}
          >
            ← Tuần trước
          </button>
          <label>
            Tuần học
            <select
              aria-label="Tuần học"
              value={week ?? ""}
              onChange={(e) => setSelectedWeek(e.target.value)}
            >
              {weeks.map((w, i) => (
                <option value={w} key={w}>
                  Tuần {i + 1} · {displayDate(w)} – {displayDate(addDays(w, 6))}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn"
            disabled={index < 0 || index >= weeks.length - 1}
            onClick={() => setSelectedWeek(weeks[index + 1])}
          >
            Tuần sau →
          </button>
        </div>
        {week ? (
          <>
            <p className="timetable-summary" role="status">
              {rows.length} buổi học trong tuần ·{" "}
              {new Set(rows.map((r) => r.c.id)).size} lớp học phần
            </p>
            <div className="academic-week timetable-week">
              {Array.from({ length: 7 }, (_, i) => (
                <section key={i}>
                  <h3>
                    {i === 6 ? "Chủ nhật" : `Thứ ${i + 2}`}
                    <small>{displayDate(addDays(week, i))}</small>
                  </h3>
                  {rows
                    .filter(({ s }) => s.dayOfWeek === i + 2)
                    .sort(
                      (x, y) => x.s.lessonOrderStart! - y.s.lessonOrderStart!,
                    )
                    .map(({ c, s }) => (
                      <article key={`${c.id}-${s.id}`}>
                        <b>
                          Tiết {s.lessonOrderStart}–{s.lessonOrderEnd}
                        </b>
                        <strong>{c.subjectName}</strong>
                        <span>{c.moduleClassCode}</span>
                        <span>
                          {c.lecturerName || "Chưa phân công giảng viên"}
                        </span>
                        <span>Phòng {s.roomCode}</span>
                        <span>
                          Sĩ số {c.currentSize}/{c.maxCapacity}
                        </span>
                        {a.classMeta[c.id]?.changedAt && (
                          <small className="schedule-changed">
                            Lịch đã cập nhật{" "}
                            {new Date(
                              a.classMeta[c.id].changedAt!,
                            ).toLocaleDateString("vi-VN")}
                          </small>
                        )}
                      </article>
                    ))}
                </section>
              ))}
              {!rows.length && (
                <p className="empty-state timetable-empty">
                  Không có buổi học trong tuần này phù hợp với bộ lọc.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="empty-state">
            Chưa có kỳ học hoặc khoảng ngày hợp lệ để hiển thị lịch.
          </p>
        )}
      </section>
      <section className="card admissions-card">
        <h2>Chưa xếp lịch ({unscheduled.length})</h2>
        <p className="muted">
          Các lớp chưa có buổi học trong kỳ, theo bộ lọc học phần và giảng viên.
          Bộ lọc phòng không áp dụng cho danh sách này.
        </p>
        {unscheduled.length ? (
          <div className="table-scroll">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Mã lớp</th>
                  <th>Học phần</th>
                  <th>Giảng viên</th>
                  <th>Sĩ số</th>
                  <th>Xếp lịch</th>
                </tr>
              </thead>
              <tbody>
                {unscheduled.map((c) => (
                  <tr key={c.id}>
                    <td>{c.moduleClassCode}</td>
                    <td>{c.subjectName}</td>
                    <td>{c.lecturerName || "Chưa phân công"}</td>
                    <td>
                      {c.currentSize}/{c.maxCapacity}
                    </td>
                    <td>
                      <button
                        className="btn"
                        disabled={!a.editable(c) || !onNavigate}
                        onClick={() => {
                          setScheduleTarget(c.id);
                          onNavigate?.("classes");
                        }}
                      >
                        {a.editable(c)
                          ? "Đi đến xếp lịch"
                          : "Kỳ đã khóa / kết thúc"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">Không có lớp chưa xếp lịch phù hợp.</p>
        )}
      </section>
    </>
  );
}
