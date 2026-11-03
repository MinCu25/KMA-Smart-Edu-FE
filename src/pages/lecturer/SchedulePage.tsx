import { useTeaching } from "../../hooks/useTeaching";
import { useManagement } from "../../context/ManagementContext";
import { ManagementHeading } from "../../components/common/ManagementHeading";
import { exportCsv } from "../../utils/exportCsv";
export default function SchedulePage() {
  const {
    records,
    liveClasses,
    historical,
    classes: assigned,
    periods,
    teachingTerm,
    changePeriod,
    periodName,
  } = useTeaching();
  const classes = historical
    ? assigned.filter((c) => Number(c.start) > 0)
    : liveClasses.flatMap((c) =>
        c.schedules.map((s) => ({
          id: c.moduleClassCode,
          scheduleId: s.id,
          subject: c.subjectCode,
          day: s.dayOfWeek === 8 ? "Chủ nhật" : `Thứ ${s.dayOfWeek}`,
          start: String(s.lessonOrderStart),
          end: String(s.lessonOrderEnd),
          room: s.roomCode,
          from: s.startDate,
          to: s.endDate,
        })),
      );
  return (
    <>
      <ManagementHeading
        title="Lịch giảng dạy"
        description={periodName + " · Lịch giảng dạy theo khoảng ngày áp dụng"}
      >
        <button
          className="btn"
          onClick={() =>
            exportCsv(`lich-giang-day-${teachingTerm}.csv`, [
              [
                "Lớp",
                "Ngày",
                "Từ tiết",
                "Đến tiết",
                "Phòng",
                "Từ ngày",
                "Đến ngày",
              ],
              ...classes.map((c) => [
                c.id,
                c.day,
                c.start,
                c.end,
                c.room,
                "from" in c ? (c.from ?? "") : "",
                "to" in c ? (c.to ?? "") : "",
              ]),
            ])
          }
        >
          Xuất lịch CSV
        </button>
      </ManagementHeading>
      <section className="card management-toolbar">
        <label>
          Kỳ học
          <select
            value={teachingTerm}
            onChange={(e) => changePeriod(e.target.value)}
          >
            {periods.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </section>
      <section className="card">
        <div className="teaching-calendar">
          {[
            "Thứ 2",
            "Thứ 3",
            "Thứ 4",
            "Thứ 5",
            "Thứ 6",
            "Thứ 7",
            "Chủ nhật",
          ].map((day) => (
            <div key={day}>
              <h2>{day}</h2>
              {classes
                .filter((c) => c.day === day)
                .map((c) => (
                  <article
                    key={
                      c.id +
                      c.day +
                      c.start +
                      c.room +
                      ("from" in c ? c.from : "")
                    }
                  >
                    <b>
                      {records.subjects.find((s) => s.id === c.subject)?.name}
                    </b>
                    <p>{c.id}</p>
                    <small>
                      Tiết {c.start}–{c.end}
                    </small>
                    <small>Phòng {c.room}</small>
                    <small>
                      {"from" in c && c.from && c.to
                        ? `${c.from} – ${c.to}`
                        : "Chưa có khoảng ngày áp dụng"}
                    </small>
                  </article>
                ))}
              {!classes.some((c) => c.day === day) && (
                <p className="no-lesson">Không có lịch dạy</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
