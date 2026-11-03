import { useAcademic } from "../../context/AcademicContext";
import { useManagement } from "../../context/ManagementContext";
import { scheduleEntries } from "../../utils/classSchedules";
import { Badge, Notice, Card } from "../../components/common";
import { useState } from "react";
import { addDays, monday, termWeeks } from "../../utils/timetable";
import { today } from "../../context/AcademicContext";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useDemoData } from "../../context/DemoDataContext";
import { useUI } from "../../context/UIContext";
import { exportScheduleCsv } from "../../utils/exportSchedule";
export default function SchedulePage() {
  const { selected } = useDemoData();
  const a = useAcademic(),
    { semester } = useManagement();
  const changed = selected.filter((c) => a.classMeta[c.dto.id]?.changedAt);
  const { setDialog, notify } = useUI();
  const weeks = termWeeks(semester);
  const defaultWeek = weeks.includes(monday(today()))
    ? monday(today())
    : (weeks[0] ?? monday(today()));
  const [chosenWeek, setChosenWeek] = useState("");
  const weekStart = weeks.includes(chosenWeek) ? chosenWeek : defaultWeek;
  const weekIndex = weeks.indexOf(weekStart);
  const entries = scheduleEntries(selected, weekStart);
  const lastLesson = Math.max(9, ...entries.map((c) => c.end));
  const exportSchedule = () => {
    exportScheduleCsv(selected, weekStart);
  };
  return (
    <>
      {!!changed.length && (
        <p className="notice">
          Lịch đã được cập nhật: {changed.map((c) => c.id).join(", ")}. Vui lòng
          kiểm tra lại buổi học.
        </p>
      )}
      <div className="page-title">
        <div>
          <h1>Thời khóa biểu</h1>
          <p>Lịch học theo tuần · {semester.semesterName}</p>
        </div>
        <button className="btn primary" onClick={exportSchedule}>
          <Download size={14} />
          Xuất lịch
        </button>
      </div>
      <Card>
        <div className="calendar-controls">
          <div>
            <button
              className="btn"
              aria-label="Tuần trước"
              disabled={weekIndex <= 0}
              onClick={() => setChosenWeek(weeks[weekIndex - 1])}
            >
              <ChevronLeft size={15} />
            </button>
            <button className="btn" onClick={() => setChosenWeek(defaultWeek)}>
              Tuần học
            </button>
            <button
              className="btn"
              aria-label="Tuần sau"
              disabled={weekIndex < 0 || weekIndex >= weeks.length - 1}
              onClick={() => setChosenWeek(weeks[weekIndex + 1])}
            >
              <ChevronRight size={15} />
            </button>
          </div>
          <b>
            {new Date(weekStart).toLocaleDateString("vi-VN")} –{" "}
            {new Date(
              new Date(weekStart).getTime() + 6 * 86400000,
            ).toLocaleDateString("vi-VN")}
          </b>
          <span>
            <Badge tone="blue">Học trực tiếp</Badge>
          </span>
        </div>
        <div className="table-scroll">
          <div
            className="calendar"
            style={{
              gridTemplateColumns: "48px repeat(7, minmax(120px, 1fr))",
            }}
          >
            <div className="calendar-head">Tiết</div>
            {[2, 3, 4, 5, 6, 7, 8].map((d) => (
              <div className="calendar-head" key={d}>
                {d === 8 ? "Chủ nhật" : `Thứ ${d}`}
                <small>
                  {new Date(
                    addDays(weekStart, d - 2) + "T12:00:00",
                  ).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </small>
              </div>
            ))}
            {Array.from({ length: lastLesson }, (_, i) => i + 1).map((slot) => (
              <div
                key={`time${slot}`}
                className="calendar-period"
                style={{ gridColumn: 1, gridRow: slot + 2 }}
              >
                {slot}
              </div>
            ))}
            {[2, 3, 4, 5, 6, 7, 8].flatMap((day) =>
              Array.from({ length: lastLesson }, (_, i) => (
                <div
                  key={`${day}-${i}`}
                  className="calendar-cell"
                  style={{ gridColumn: day, gridRow: i + 2 }}
                />
              )),
            )}
            {entries.map((c, i) => (
              <button
                key={`${c.id}-${c.scheduleId}`}
                className={`calendar-course course-${i % 4}`}
                style={{
                  gridColumn: c.day,
                  gridRow: `${c.start + 1} / span ${c.end - c.start + 1}`,
                }}
                onClick={() =>
                  setDialog({
                    title: c.name,
                    body: `${c.id}\n${c.day === 8 ? "Chủ nhật" : `Thứ ${c.day}`}, tiết ${c.start}-${c.end}\nGiảng viên: ${c.teacher}\nPhòng ${c.room}\nLịch lặp lại hàng tuần trong dữ liệu.`,
                  })
                }
              >
                <b>{c.id}</b>
                <span>{c.name}</span>
                <span>
                  {c.room} · {c.teacher}
                </span>
              </button>
            ))}
          </div>
        </div>
        <Notice>
          Lịch học được cập nhật theo các lớp đã đăng ký. Lịch hiển thị theo
          ngày bắt đầu và kết thúc của từng buổi học.
        </Notice>
      </Card>
    </>
  );
}
