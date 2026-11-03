import { addDays, monday, termWeeks } from "../../utils/timetable";
import {
  buildOpeningRequest,
  MAX_CLASS_CAPACITY,
  publicationProblems,
  scheduleProblems,
} from "../../services/academic/classPlanning";
import { useDemoData } from "../../context/DemoDataContext";
import { demoRosters } from "../../data/mock/management";
import { studentScheduleConflicts } from "../../services/academic/domain";
import { useState, useEffect } from "react";
import { useAcademic, today } from "../../context/AcademicContext";
import { useManagement } from "../../context/ManagementContext";
import { useUI } from "../../context/UIContext";
import {
  EditForm,
  Pager,
  str,
  type Field,
} from "../../components/academic-admin/AcademicUI";
import { roomTypes } from "./RoomsPage";
import { conflicts, overlap } from "../../utils/academicRules";
import { exportCsv } from "../../utils/exportCsv";
import type {
  ModuleClassResponse,
  ClassScheduleResponse,
  CreateClassScheduleRequest,
  UpdateModuleClassRequest,
} from "../../types/dto";
const labels: Record<string, string> = {
  UNSCHEDULED: "Chưa xếp lịch",
  SCHEDULED: "Đã xếp lịch",
  OPEN: "Mở đăng ký",
  CANCELLED: "Đã hủy",
};
function Opening({ termId, close }: { termId: number; close: () => void }) {
  const a = useAcademic(),
    { log } = useManagement(),
    { notify } = useUI();
  const [subject, setSubject] = useState(""),
    [count, setCount] = useState(1),
    [draft, setDraft] = useState<
      {
        subjectId: number;
        lecturerId: string;
        maxCapacity: string;
        roomType: string;
      }[]
    >([]),
    [error, setError] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false);
  const term = a.terms.find((t) => t.id === termId)!;
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const errors: Record<string, string> = {};
        if (!draft.length)
          errors.list = "Vui lòng thêm ít nhất một lớp học phần.";
        draft.forEach((d, i) => {
          if (
            !a.data.subjects.some(
              (s) =>
                s.id === d.subjectId &&
                s.status === "ACTIVE" &&
                !a.deletedSubjects.includes(s.id),
            )
          )
            errors.list =
              "Có học phần không còn được sử dụng. Vui lòng bỏ khỏi danh sách.";
          if (
            !a.data.teachers.some(
              (t) => t.id === +d.lecturerId && t.status === "ACTIVE",
            )
          )
            errors[`teacher${i}`] = "Vui lòng chọn giảng viên đang hoạt động.";
          if (
            !Number.isInteger(+d.maxCapacity) ||
            +d.maxCapacity < 1 ||
            +d.maxCapacity > MAX_CLASS_CAPACITY
          )
            errors[`capacity${i}`] = "Sức chứa phải là số nguyên từ 1 đến 80.";
        });
        if (term.isLocked || term.endDate! < today())
          errors.list = "Kỳ học đã khóa hoặc kết thúc.";
        if (
          a.data.classes.some(
            (c) =>
              c.semesterCode === term.semesterCode &&
              c.status !== "CANCELLED" &&
              draft.some(
                (d) =>
                  a.data.subjects.find((s) => s.id === d.subjectId)
                    ?.subjectCode === c.subjectCode,
              ),
          ) &&
          new FormData(e.currentTarget).get("confirmed") !== "on"
        )
          errors.list =
            "Đã có học phần mở trong kỳ. Vui lòng xác nhận mở thêm lớp song song.";
        setError(errors);
        if (Object.keys(errors).length) return;
        setBusy(true);
        let nextId = Math.max(0, ...a.data.classes.map((c) => c.id));
        const created: ModuleClassResponse[] = [],
          meta = { ...a.classMeta };
        const request = buildOpeningRequest(
          draft,
          new FormData(e.currentTarget).get("confirmed") === "on",
        );
        // request is the batch HTTP body; lecturer/room choices are local assignment state, never serialized into it.
        void request;
        draft.forEach((d) => {
          const s = a.data.subjects.find((s) => s.id === d.subjectId)!,
            t = a.data.teachers.find((t) => t.id === +d.lecturerId)!;
          let n = 1,
            code = "";
          do {
            code = `MC_${term.id}_${s.subjectCode}_${String(n++).padStart(3, "0")}`;
          } while (
            [...a.data.classes, ...created].some(
              (c) => c.moduleClassCode === code,
            )
          );
          const id = ++nextId;
          created.push({
            id,
            semesterId: term.id,
            subjectId: s.id,
            lecturerId: t.id,
            classSequence: n - 1,
            dataSource: "LOCAL",
            moduleClassCode: code,
            subjectCode: s.subjectCode,
            subjectName: s.subjectName,
            credits: s.credits,
            lecturerName: t.fullName,
            semesterCode: term.semesterCode,
            maxCapacity: +d.maxCapacity,
            currentSize: 0,
            status: "UNSCHEDULED",
            schedules: [],
          });
          meta[id] = { lecturerId: t.id, roomType: d.roomType };
        });
        a.setData((old) => ({ ...old, classes: [...old.classes, ...created] }));
        a.setClassMeta(meta);
        log(
          "Admin học vụ",
          "Mở lớp học phần",
          created.map((p) => p.moduleClassCode).join(", "),
        );
        close();
        notify(
          `Đã tạo ${created.length} lớp học phần. Các lớp cần được xếp lịch và công bố trước khi đăng ký.`,
        );
      }}
    >
      <p>
        <b>{term.semesterName}</b> · Chọn học phần rồi nhập thông tin từng lớp.
      </p>
      <section className="opening-demand">
        <h3>Nhu cầu mở học phần trong kỳ</h3>
        {a.openingDemand[termId]?.length ? (
          <div className="table-scroll">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Học phần</th>
                  <th>Đúng tiến độ</th>
                  <th>Học lại</th>
                  <th>Chưa học</th>
                  <th>Tổng dự kiến</th>
                  <th>Lớp đề xuất / đã mở</th>
                  <th>Chọn</th>
                </tr>
              </thead>
              <tbody>
                {a.openingDemand[termId].map((d) => (
                  <tr key={d.subjectId}>
                    <td>
                      {d.subjectCode} · {d.subjectName}
                      {!d.historyComplete && (
                        <small>Chưa đủ lịch sử học tập</small>
                      )}
                    </td>
                    <td>{d.onTimeStudentCount}</td>
                    <td>{d.retakeStudentCount}</td>
                    <td>{d.missedStudentCount}</td>
                    <td>{d.expectedStudentCount}</td>
                    <td>
                      {d.recommendedClassCount} / {d.existingClassCount}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setSubject(String(d.subjectId));
                          setCount(
                            Math.max(1, Math.min(50, d.recommendedClassCount)),
                          );
                        }}
                      >
                        Chọn học phần
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">
            Chưa có dữ liệu nhu cầu mở học phần cho kỳ này. Hãy kiểm tra chương
            trình đào tạo và dữ liệu học tập trước khi chọn học phần bên dưới.
          </p>
        )}
      </section>
      <details className="curriculum-demand">
        <summary>Đối chiếu nhu cầu theo chương trình đào tạo</summary>
        {!a.curricula.length ? (
          <p>
            Chưa có dữ liệu chương trình đào tạo để xác định nhu cầu. Cần tải
            chương trình theo ngành, khóa và hệ đào tạo trước khi quyết định số
            lớp.
          </p>
        ) : (
          <div className="table-scroll">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Ngành / khóa / hệ</th>
                  <th>Học phần</th>
                  <th>Học kỳ đề xuất</th>
                  <th>Sinh viên đang học</th>
                </tr>
              </thead>
              <tbody>
                {a.curricula.flatMap((cur) =>
                  cur.subjects
                    .filter((s) => !subject || s.subjectId === +subject)
                    .map((s) => (
                      <tr key={`${cur.id}-${s.subjectId}`}>
                        <td>
                          {cur.majorName} · {cur.cohortCode} ·{" "}
                          {cur.trainingType}
                        </td>
                        <td>
                          {s.subjectCode} · {s.subjectName}
                        </td>
                        <td>{s.recommendSemester}</td>
                        <td>
                          {a.adminClasses
                            .filter(
                              (c) =>
                                c.majorName === cur.majorName &&
                                c.cohortCode === cur.cohortCode &&
                                c.trainingType === cur.trainingType,
                            )
                            .reduce((n, c) => n + (c.currentSize ?? 0), 0)}
                        </td>
                      </tr>
                    )),
                )}
              </tbody>
            </table>
            <small>
              Sĩ số theo chương trình không đồng nghĩa số người phải đăng ký học
              phần; còn cần kết quả học tập và nhu cầu đăng ký từ hệ thống.
            </small>
          </div>
        )}
      </details>
      <div className="academic-fields">
        <label>
          Học phần
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">Chọn học phần đang sử dụng</option>
            {a.data.subjects
              .filter(
                (s) =>
                  s.status === "ACTIVE" && !a.deletedSubjects.includes(s.id),
              )
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subjectCode} · {s.subjectName}
                </option>
              ))}
          </select>
          <span className="field-error">{error.subject}</span>
        </label>
        <label>
          Số lớp cần mở
          <input
            type="number"
            min="1"
            max="50"
            value={count}
            onChange={(e) => setCount(+e.target.value)}
          />
          <span className="field-error">{error.count}</span>
        </label>
      </div>
      <button
        type="button"
        className="btn"
        onClick={() => {
          if (!subject || !Number.isInteger(count) || count < 1 || count > 50) {
            setError({
              subject: !subject ? "Vui lòng chọn học phần." : "",
              count:
                !Number.isInteger(count) || count < 1 || count > 50
                  ? "Số lớp phải là số nguyên từ 1 đến 50."
                  : "",
            });
            return;
          }
          setDraft((old) => [
            ...old,
            ...Array.from({ length: count }, () => ({
              subjectId: +subject,
              lecturerId: "",
              maxCapacity: "80",
              roomType: "LECTURE",
            })),
          ]);
          setError({});
        }}
      >
        Thêm vào danh sách mở lớp
      </button>
      <p className="muted">
        Sức chứa mỗi lớp từ 1 đến 80 sinh viên. Mở thêm lớp của cùng học phần
        cần xác nhận bên dưới.
      </p>
      {draft.map((d, i) => (
        <fieldset className="opening-row" key={i}>
          <legend>
            {i + 1}.{" "}
            {a.data.subjects.find((s) => s.id === d.subjectId)?.subjectName}
          </legend>
          <div className="academic-fields">
            <label>
              Giảng viên
              <select
                value={d.lecturerId}
                onChange={(e) =>
                  setDraft((old) =>
                    old.map((x, n) =>
                      n === i ? { ...x, lecturerId: e.target.value } : x,
                    ),
                  )
                }
              >
                <option value="">Chọn giảng viên</option>
                {a.data.teachers
                  .filter((t) => t.status === "ACTIVE")
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.lecturerCode} · {t.fullName}
                    </option>
                  ))}
              </select>
              <span className="field-error">{error[`teacher${i}`]}</span>
            </label>
            <label>
              Sức chứa
              <input
                type="number"
                value={d.maxCapacity}
                onChange={(e) =>
                  setDraft((old) =>
                    old.map((x, n) =>
                      n === i ? { ...x, maxCapacity: e.target.value } : x,
                    ),
                  )
                }
              />
              <span className="field-error">{error[`capacity${i}`]}</span>
            </label>
            <label>
              Yêu cầu phòng
              <select
                value={d.roomType}
                onChange={(e) =>
                  setDraft((old) =>
                    old.map((x, n) =>
                      n === i ? { ...x, roomType: e.target.value } : x,
                    ),
                  )
                }
              >
                {roomTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => setDraft((old) => old.filter((_, n) => n !== i))}
          >
            Bỏ lớp này
          </button>
        </fieldset>
      ))}
      <label className="check-line">
        <input type="checkbox" name="confirmed" />
        Cho phép mở thêm lớp song song nếu học phần đã có lớp trong kỳ.
      </label>
      {error.list && <p className="field-error">{error.list}</p>}
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={close}>
          Hủy
        </button>
        <button className="btn primary" disabled={busy}>
          Tạo {draft.length} lớp học phần
        </button>
      </div>
    </form>
  );
}
function ScheduleEditor({
  cls,
  close,
}: {
  cls: ModuleClassResponse;
  close: () => void;
}) {
  const a = useAcademic(),
    { log } = useManagement(),
    { notify, notifyError } = useUI();
  const { registrations } = useDemoData();
  const allRegistrations: Record<string, string[]> = {};
  for (const [code, students] of Object.entries(demoRosters))
    for (const student of students)
      (allRegistrations[student] ??= []).push(code);
  Object.assign(allRegistrations, registrations);
  const current = a.data.classes.find((c) => c.id === cls.id)!;
  const [editing, setEditing] = useState<ClassScheduleResponse | undefined>(),
    [revision, setRevision] = useState(0),
    [preview, setPreview] = useState<FormData | null>(null);
  const term = a.termFor(current)!;
  const weeks = termWeeks(term);
  const fields: Field[] = [
    {
      key: "roomId",
      label: "Phòng học",
      required: true,
      value: a.rooms.find((r) => r.roomCode === editing?.roomCode)?.id,
      options: a.rooms
        .filter(
          (r) =>
            !r.deleted &&
            r.status === "ACTIVE" &&
            r.capacity >= current.maxCapacity &&
            (!a.classMeta[current.id] ||
              r.roomType === a.classMeta[current.id].roomType),
        )
        .map((r) => ({
          value: r.id,
          label: `${r.roomCode} · ${r.capacity} chỗ`,
        })),
    },
    {
      key: "dayOfWeek",
      label: "Thứ",
      required: true,
      value: editing?.dayOfWeek ?? "",
      options: Array.from({ length: 7 }, (_, i) => ({
        value: i + 2,
        label: i === 6 ? "Chủ nhật" : `Thứ ${i + 2}`,
      })),
    },
    {
      key: "lessonOrderStart",
      label: "Tiết bắt đầu",
      required: true,
      type: "number",
      min: 1,
      value: editing?.lessonOrderStart ?? "",
    },
    {
      key: "lessonOrderEnd",
      label: "Tiết kết thúc",
      required: true,
      type: "number",
      min: 1,
      value: editing?.lessonOrderEnd ?? "",
    },
    {
      key: "startWeek",
      label: "Tuần bắt đầu",
      required: true,
      type: "number",
      min: 1,
      max: weeks.length,
      value: editing?.startDate
        ? weeks.indexOf(monday(editing.startDate)) + 1
        : 1,
    },
    {
      key: "endWeek",
      label: "Tuần kết thúc",
      required: true,
      type: "number",
      min: 1,
      max: weeks.length,
      value: editing?.endDate
        ? weeks.indexOf(monday(editing.endDate)) + 1
        : weeks.length,
    },
    { key: "reason", label: "Lý do xếp hoặc thay đổi lịch", required: true },
  ];
  function schedule(f: FormData): ClassScheduleResponse {
    const r = a.rooms.find((r) => r.id === +str(f, "roomId"))!;
    return {
      id: editing?.id ?? Date.now(),
      moduleClassId: current.id,
      roomCode: r?.roomCode ?? "",
      buildingCode: r?.buildingCode ?? "",
      roomNumber: r?.roomNumber ?? "",
      dayOfWeek: +str(f, "dayOfWeek"),
      lessonOrderStart: +str(f, "lessonOrderStart"),
      lessonOrderEnd: +str(f, "lessonOrderEnd"),
      startDate: weeks[+str(f, "startWeek") - 1]
        ? [weeks[+str(f, "startWeek") - 1], term.startDate!].sort()[1]
        : "",
      endDate: weeks[+str(f, "endWeek") - 1]
        ? [addDays(weeks[+str(f, "endWeek") - 1], 6), term.endDate!].sort()[0]
        : "",
    };
  }
  return (
    <>
      <p>
        <b>
          {current.moduleClassCode} · {current.subjectName}
        </b>
        <br />
        {current.lecturerName || "Chưa phân công giảng viên"} ·{" "}
        {current.maxCapacity} chỗ
        <br />
        Tuần 1 bắt đầu {weeks[0]}; kỳ học từ {term.startDate} đến {term.endDate}
        .
      </p>
      <div className="schedule-list">
        {current.schedules.map((s) => (
          <div key={s.id}>
            <span>
              {s.dayOfWeek === 8 ? "Chủ nhật" : `Thứ ${s.dayOfWeek}`} · Tiết{" "}
              {s.lessonOrderStart}–{s.lessonOrderEnd} · {s.roomCode}
              <small>
                {s.startDate} → {s.endDate}
              </small>
            </span>
            <button
              className="btn"
              onClick={() => {
                setEditing(s);
                setPreview(null);
                setRevision((v) => v + 1);
              }}
            >
              Sửa
            </button>
            <button
              className="btn"
              onClick={() => {
                if (!a.editable(current)) {
                  notifyError("Kỳ học đã khóa/kết thúc hoặc lớp đã hủy.");
                  return;
                }
                if (current.currentSize && current.schedules.length === 1) {
                  notifyError(
                    "Không thể xóa buổi học cuối cùng khi lớp còn sinh viên đăng ký. Hãy cập nhật buổi học này.",
                  );
                  return;
                }
                a.setData((old) => ({
                  ...old,
                  classes: old.classes.map((c) =>
                    c.id === current.id
                      ? {
                          ...c,
                          schedules: c.schedules.filter((t) => t.id !== s.id),
                          status:
                            c.schedules.length === 1
                              ? "UNSCHEDULED"
                              : c.status === "OPEN"
                                ? "OPEN"
                                : "SCHEDULED",
                        }
                      : c,
                  ),
                }));
                a.setClassMeta((old) => ({
                  ...old,
                  [current.id]: {
                    ...old[current.id],
                    changedAt: new Date().toISOString(),
                  },
                }));
                if (editing?.id === s.id) {
                  setEditing(undefined);
                  setRevision((v) => v + 1);
                }
                log("Admin học vụ", "Xóa buổi học", current.moduleClassCode);
                notify(`Đã xóa buổi học của ${current.moduleClassCode}.`);
              }}
            >
              Xóa
            </button>
          </div>
        ))}
      </div>
      <h3>{editing ? "Cập nhật buổi học" : "Thêm buổi học"}</h3>
      {editing && (
        <button
          className="btn"
          onClick={() => {
            setEditing(undefined);
            setRevision((v) => v + 1);
          }}
        >
          Chuyển sang thêm buổi học
        </button>
      )}
      <EditForm
        key={revision}
        fields={fields}
        onValuesChange={setPreview}
        close={close}
        submit={editing ? "Cập nhật lịch" : "Thêm lịch"}
        validate={(f, e) => {
          if (!a.editable(current))
            e._form = ["Kỳ học đã khóa/kết thúc hoặc lớp đã hủy."];
          const problems = scheduleProblems(schedule(f), term);
          for (const [key, messages] of Object.entries(problems))
            e[
              key === "startDate"
                ? "startWeek"
                : key === "endDate"
                  ? "endWeek"
                  : key
            ] = messages;
          if (+str(f, "endWeek") < +str(f, "startWeek"))
            e.endWeek = ["Tuần kết thúc phải từ tuần bắt đầu trở đi."];
          const clashes = conflicts(
            a.data.classes,
            current,
            schedule(f),
            a.classMeta,
          );
          if (clashes.length) {
            const alternative = a.rooms.filter(
              (r) =>
                r.status === "ACTIVE" &&
                !r.deleted &&
                r.capacity >= current.maxCapacity &&
                (!a.classMeta[current.id] ||
                  r.roomType === a.classMeta[current.id].roomType) &&
                !conflicts(
                  a.data.classes,
                  current,
                  {
                    ...schedule(f),
                    roomCode: r.roomCode,
                  },
                  a.classMeta,
                ).length,
            );
            e._form = [
              `Trùng lịch với ${clashes.join("; ")}. ${alternative.length ? "Phòng trống phù hợp: " + alternative.map((r) => r.roomCode).join(", ") : "Không có phòng khác phù hợp trong khung giờ này; hãy đổi thời gian."}`,
            ];
          }
          const roster = Object.values(allRegistrations).filter((codes) =>
            codes.includes(current.moduleClassCode),
          );
          if (roster.length !== current.currentSize)
            e._form = [
              ...(e._form ?? []),
              "Chưa có đủ danh sách sinh viên của lớp để kiểm tra lịch. Cần tải đầy đủ danh sách đăng ký trước khi lưu.",
            ];
          else {
            const clashes = studentScheduleConflicts(
              a.data.classes,
              current,
              schedule(f),
              allRegistrations,
              overlap,
            );
            if (clashes.length)
              e._form = [
                ...(e._form ?? []),
                `Sinh viên trùng lịch: ${clashes.join("; ")}.`,
              ];
          }
          return e;
        }}
        save={(f) => {
          const p: CreateClassScheduleRequest = {
            moduleClassId: current.id,
            roomId: +str(f, "roomId"),
            dayOfWeek: +str(f, "dayOfWeek"),
            lessonOrderStart: +str(f, "lessonOrderStart"),
            lessonOrderEnd: +str(f, "lessonOrderEnd"),
            startDate: schedule(f).startDate!,
            endDate: schedule(f).endDate!,
          };
          const next = schedule(f);
          a.setClassMeta((old) => ({
            ...old,
            [current.id]: {
              ...a.classMeta[current.id],
              changedAt: new Date().toISOString(),
            },
          }));
          a.setData((old) => ({
            ...old,
            classes: old.classes.map((c) =>
              c.id === current.id
                ? {
                    ...c,
                    status: c.status === "OPEN" ? "OPEN" : "SCHEDULED",
                    schedules: editing
                      ? c.schedules.map((s) => (s.id === editing.id ? next : s))
                      : [...c.schedules, next],
                  }
                : c,
            ),
          }));
          log(
            "Admin học vụ",
            editing ? "Cập nhật lịch" : "Thêm lịch",
            `${current.moduleClassCode} · phòng ${p.roomId} · ${str(f, "reason")}`,
          );
          setEditing(undefined);
          setPreview(null);
          setRevision((v) => v + 1);
          notify(
            `Đã ${editing ? "cập nhật" : "thêm"} lịch cho ${current.moduleClassCode}.${current.status === "OPEN" ? " Thời khóa biểu được cập nhật; lớp vẫn mở đăng ký." : " Lớp đã xếp lịch, có thể kiểm tra công bố."}`,
          );
        }}
      >
        {preview &&
          str(preview, "dayOfWeek") &&
          str(preview, "lessonOrderStart") &&
          str(preview, "lessonOrderEnd") && (
            <p className="room-suggestions" role="status">
              <b>Phòng trống phù hợp: </b>
              {a.rooms
                .filter(
                  (r) =>
                    !r.deleted &&
                    r.status === "ACTIVE" &&
                    r.capacity >= current.maxCapacity &&
                    r.roomType === a.classMeta[current.id]?.roomType &&
                    !conflicts(
                      a.data.classes,
                      current,
                      { ...schedule(preview), roomCode: r.roomCode },
                      a.classMeta,
                    ).length,
                )
                .map((r) => r.roomCode)
                .join(", ") ||
                "Không có phòng phù hợp trong khung giờ này. Hãy đổi thứ, tiết hoặc tuần học."}
            </p>
          )}
      </EditForm>
      <p className="muted">
        Danh sách phòng chỉ gồm phòng đang sử dụng, đủ sức chứa và đúng loại.
        Khi lưu sẽ kiểm tra thêm trùng phòng và lịch giảng viên.
      </p>
    </>
  );
}
export default function ClassesPage() {
  const a = useAcademic(),
    m = useManagement(),
    { setDialog, notify, notifyError, scheduleTarget, setScheduleTarget } =
      useUI();
  const [tab, setTab] = useState<"list" | "schedule" | "publish">("list");
  const [termId, setTermId] = useState(m.semester.id),
    [q, setQ] = useState(""),
    [teacher, setTeacher] = useState(""),
    [subjectFilter, setSubjectFilter] = useState(""),
    [status, setStatus] = useState(""),
    [opening, setOpening] = useState(false),
    [selected, setSelected] = useState<number[]>([]),
    [page, setPage] = useState(0);
  const term = a.terms.find((t) => t.id === termId) ?? a.terms[0];
  const rows = a.data.classes.filter(
    (c) =>
      (tab === "list" || c.status !== "CANCELLED") &&
      c.semesterCode === term?.semesterCode &&
      (c.moduleClassCode + " " + c.subjectCode + " " + c.subjectName)
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (!teacher ||
        String(c.lecturerId ?? a.classMeta[c.id]?.lecturerId) === teacher) &&
      (!subjectFilter || c.subjectCode === subjectFilter) &&
      (!status || c.status === status),
  );
  const close = () => setDialog(null);
  function openSchedule(c: ModuleClassResponse) {
    setDialog({
      title: `Xếp lịch ${c.moduleClassCode}`,
      content: <ScheduleEditor cls={c} close={close} />,
    });
  }
  useEffect(() => {
    if (scheduleTarget === null) return;
    const target = a.data.classes.find((c) => c.id === scheduleTarget);
    setScheduleTarget(null);
    if (!target || !a.editable(target)) {
      notifyError("Lớp không còn khả dụng để xếp lịch.");
      return;
    }
    const targetTerm = a.termFor(target);
    if (targetTerm) setTermId(targetTerm.id);
    setTab("schedule");
    setQ(target.moduleClassCode);
    setTeacher("");
    setSubjectFilter("");
    setStatus("");
    setPage(0);
    setSelected([]);
    openSchedule(target);
  }, [scheduleTarget]);
  function changeTab(next: "list" | "schedule" | "publish") {
    setTab(next);
    setStatus("");
    setQ("");
    setTeacher("");
    setSubjectFilter("");
    setPage(0);
    setSelected([]);
    setOpening(false);
  }
  function edit(c: ModuleClassResponse) {
    setDialog({
      title: `Phân công / cập nhật ${c.moduleClassCode}`,
      content: (
        <EditForm
          fields={[
            {
              key: "lecturerId",
              label: "Giảng viên",
              required: true,
              value:
                c.lecturerId ??
                a.classMeta[c.id]?.lecturerId ??
                a.data.teachers.find((t) => t.fullName === c.lecturerName)?.id,
              options: a.data.teachers
                .filter((t) => t.status === "ACTIVE")
                .map((t) => ({
                  value: t.id,
                  label: t.lecturerCode + " · " + t.fullName,
                })),
            },
            {
              key: "maxCapacity",
              label: "Sức chứa",
              required: true,
              max: MAX_CLASS_CAPACITY,
              type: "number",
              min: Math.max(1, c.currentSize),
              value: c.maxCapacity,
            },
            { key: "reason", label: "Lý do thay đổi", required: true },
          ]}
          close={close}
          validate={(f, e) => {
            if (!a.editable(c))
              e._form = ["Kỳ học đã khóa/kết thúc hoặc lớp đã hủy."];
            const next = {
              ...c,
              lecturerName:
                a.data.teachers.find((t) => t.id === +str(f, "lecturerId"))
                  ?.fullName ?? "",
            };
            const clashes = c.schedules.flatMap((s) =>
              conflicts(
                a.data.classes.filter((t) => t.id !== c.id),
                next,
                s,
                {
                  ...a.classMeta,
                  [c.id]: {
                    ...a.classMeta[c.id],
                    lecturerId: +str(f, "lecturerId"),
                  },
                },
              ),
            );
            if (clashes.length)
              e.lecturerId = [`Giảng viên trùng lịch: ${clashes.join("; ")}.`];
            if (
              c.schedules.some(
                (s) =>
                  (a.rooms.find((r) => r.roomCode === s.roomCode)?.capacity ??
                    0) < +str(f, "maxCapacity"),
              )
            )
              e.maxCapacity = ["Sức chứa mới vượt quá sức chứa phòng đã xếp."];
            return e;
          }}
          save={(f) => {
            const request: UpdateModuleClassRequest = {
              maxCapacity: +str(f, "maxCapacity"),
              reason: str(f, "reason"),
            };
            const lecturer = a.data.teachers.find(
              (t) => t.id === +str(f, "lecturerId"),
            )!;
            a.setData((old) => ({
              ...old,
              classes: old.classes.map((x) =>
                x.id === c.id
                  ? {
                      ...x,
                      lecturerName: lecturer.fullName,
                      lecturerId: lecturer.id,
                      maxCapacity: request.maxCapacity,
                    }
                  : x,
              ),
            }));
            a.setClassMeta((old) => ({
              ...old,
              [c.id]: {
                ...old[c.id],
                roomType: old[c.id]?.roomType ?? "LECTURE",
                lecturerId: lecturer.id,
              },
            }));
            m.log(
              "Admin học vụ",
              "Cập nhật lớp",
              `${c.moduleClassCode} · ${str(f, "reason")}`,
            );
            close();
            notify(
              `Đã cập nhật giảng viên và sức chứa lớp ${c.moduleClassCode}.`,
            );
          }}
        />
      ),
    });
  }
  function transition(c: ModuleClassResponse, next: "CANCELLED" | "SCHEDULED") {
    if (
      next === "CANCELLED" &&
      (a.enrollmentHistory.includes(c.moduleClassCode) ||
        Object.keys(m.grades[c.moduleClassCode] ?? {}).length)
    ) {
      notifyError(
        "Không thể hủy lớp đã phát sinh đăng ký hoặc điểm. Cần giữ nguyên lịch sử lớp.",
      );
      return;
    }
    if (c.currentSize > 0) {
      notifyError(
        `Không thể ${next === "CANCELLED" ? "hủy lớp" : "thu hồi công bố"} ${c.moduleClassCode}: còn ${c.currentSize} sinh viên đăng ký.`,
      );
      return;
    }
    setDialog({
      title: `${next === "CANCELLED" ? "Hủy lớp" : "Thu hồi công bố"} ${c.moduleClassCode}`,
      content: (
        <EditForm
          fields={[{ key: "reason", label: "Lý do", required: true }]}
          close={close}
          submit="Xác nhận"
          validate={(_, errors) => {
            if (!a.editable(c))
              errors._form = ["Kỳ học đã khóa/kết thúc hoặc lớp đã hủy."];
            return errors;
          }}
          save={(f) => {
            a.setData((old) => ({
              ...old,
              classes: old.classes.map((x) =>
                x.id === c.id ? { ...x, status: next } : x,
              ),
            }));
            m.log(
              "Admin học vụ",
              next === "CANCELLED" ? "Hủy lớp" : "Thu hồi công bố",
              `${c.moduleClassCode} · ${str(f, "reason")}`,
            );
            close();
            notify(
              `Đã ${next === "CANCELLED" ? "hủy lớp" : "thu hồi công bố"} ${c.moduleClassCode}.`,
            );
          }}
        />
      ),
    });
  }
  const readiness = (c: ModuleClassResponse) =>
    publicationProblems(
      c,
      a.termFor(c),
      today(),
      a.data.classes,
      a.rooms,
      a.classMeta,
      a.data.teachers.filter((t) => t.status === "ACTIVE").map((t) => t.id),
    );
  function publish() {
    const candidates = rows.filter((c) => selected.includes(c.id));
    const errors: string[] = [],
      valid: number[] = [];
    for (const c of candidates) {
      const reasons = readiness(c);
      if (reasons.length)
        errors.push(`${c.moduleClassCode}: ${reasons.join("; ")}`);
      else valid.push(c.id);
    }
    if (!candidates.length) {
      notifyError("Vui lòng chọn lớp cần công bố.");
      return;
    }
    setDialog({
      title: "Kết quả kiểm tra công bố",
      body: `${valid.length} lớp đủ điều kiện. ${errors.length ? `Lớp bị từ chối: ${errors.join("; ")}` : "Không có lớp bị từ chối."}\nThời gian đăng ký: ${term?.registrationStart} đến ${term?.registrationEnd}.`,
      confirm: `Công bố ${valid.length} lớp`,
      ...(valid.length
        ? {
            action: () => {
              a.setData((old) => ({
                ...old,
                classes: old.classes.map((c) =>
                  valid.includes(c.id) ? { ...c, status: "OPEN" } : c,
                ),
              }));
              setSelected([]);
              m.log("Admin học vụ", "Công bố lớp", valid.join(", "));
              notify(
                `Đã công bố ${valid.length} lớp; ${errors.length} lớp chưa được công bố.`,
              );
            },
          }
        : {}),
    });
  }
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Lớp học phần & lịch học</h1>
          <p>
            Thực hiện lần lượt: tạo lớp, xếp lịch, rồi công bố cho sinh viên
            đăng ký.
          </p>
        </div>
        {tab === "list" && (
          <button
            className="btn primary"
            disabled={!term || !!term.isLocked || term.endDate! < today()}
            onClick={() => setOpening(true)}
          >
            Tạo lớp học phần
          </button>
        )}
      </div>
      <div
        className="class-tabs"
        role="tablist"
        aria-label="Quản lý lớp học phần"
      >
        {(
          [
            ["list", "1. Danh sách lớp"],
            ["schedule", "2. Xếp lịch"],
            ["publish", "3. Công bố đăng ký"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            id={`class-tab-${key}`}
            role="tab"
            aria-selected={tab === key}
            aria-controls="class-tab-panel"
            className={tab === key ? "active" : ""}
            onClick={() => changeTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="class-tab-help">
        {tab === "list"
          ? "Tạo lớp học phần, chọn giảng viên phụ trách và điều chỉnh sức chứa tại đây."
          : tab === "schedule"
            ? "Chọn lớp rồi bấm Xếp lịch để thêm thứ, tiết, phòng và khoảng tuần học."
            : "Chọn các lớp đủ điều kiện rồi bấm Công bố. Sinh viên chỉ đăng ký được trong thời gian đăng ký của kỳ."}
      </p>
      {opening && tab === "list" && term && (
        <section className="card admissions-card">
          <h2>Gán học phần mở trong kỳ · {term.semesterName}</h2>
          <Opening
            key={term.id}
            termId={term.id}
            close={() => setOpening(false)}
          />
        </section>
      )}
      <section
        className="card"
        id="class-tab-panel"
        role="tabpanel"
        aria-labelledby={`class-tab-${tab}`}
      >
        <div className="admin-filter">
          <label>
            Kỳ học
            <select
              value={termId}
              onChange={(e) => {
                setTermId(+e.target.value);
                setOpening(false);
                setSelected([]);
                setPage(0);
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
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label>
            Giảng viên
            <select
              value={teacher}
              onChange={(e) => {
                setTeacher(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Tất cả</option>
              {a.data.teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.lecturerCode} · {t.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Học phần
            <select
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Tất cả học phần</option>
              {a.data.subjects.map((s) => (
                <option key={s.id} value={s.subjectCode}>
                  {s.subjectCode} · {s.subjectName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trạng thái
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Tất cả</option>
              {Object.entries(labels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        {term && (term.isLocked || term.endDate! < today()) && (
          <p className="timetable-summary">
            Kỳ học đã khóa hoặc kết thúc. Bạn chỉ có thể tra cứu và xuất danh
            sách.
          </p>
        )}
        <div className="academic-toolbar">
          {tab === "publish" && (
            <>
              <button
                className="btn"
                onClick={() =>
                  setSelected(
                    rows
                      .filter((c) => readiness(c).length === 0)
                      .map((c) => c.id),
                  )
                }
              >
                Chọn tất cả lớp đủ điều kiện
              </button>
              <button className="btn primary" onClick={publish}>
                Công bố ({rows.filter((c) => selected.includes(c.id)).length})
              </button>
            </>
          )}
          <button
            className="btn"
            onClick={() =>
              exportCsv("danh-sach-lop-hoc-phan.csv", [
                [
                  "Mã lớp",
                  "Học phần",
                  "Giảng viên",
                  "Kỳ",
                  "Sĩ số",
                  "Sức chứa",
                  "Trạng thái",
                  "Lịch học",
                ],
                ...rows.map((c) => [
                  c.moduleClassCode,
                  c.subjectName,
                  c.lecturerName ?? "Chưa phân công",
                  c.semesterCode,
                  c.currentSize,
                  c.maxCapacity,
                  labels[c.status],
                  c.schedules
                    .map(
                      (s) =>
                        `T${s.dayOfWeek} tiết ${s.lessonOrderStart}-${s.lessonOrderEnd} ${s.roomCode} ${s.startDate}-${s.endDate}`,
                    )
                    .join("; "),
                ]),
              ])
            }
          >
            Xuất danh sách CSV
          </button>
        </div>
        <div className="table-scroll">
          <table className="management-table">
            <thead>
              <tr>
                {[
                  ...(tab === "publish" ? ["Chọn"] : []),
                  "Lớp học phần",
                  "Giảng viên",
                  "Sĩ số",
                  "Lịch học",
                  "Trạng thái",
                  "Thao tác",
                ].map((t) => (
                  <th key={t}>
                    {t === "Chọn" ? (
                      <input
                        type="checkbox"
                        aria-label="Chọn tất cả lớp đủ điều kiện trong bộ lọc"
                        checked={
                          rows.some((c) => readiness(c).length === 0) &&
                          rows
                            .filter((c) => readiness(c).length === 0)
                            .every((c) => selected.includes(c.id))
                        }
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? rows
                                  .filter((c) => readiness(c).length === 0)
                                  .map((c) => c.id)
                              : [],
                          )
                        }
                      />
                    ) : (
                      t
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * 10, page * 10 + 10).map((c) => (
                <tr key={c.id}>
                  {tab === "publish" && (
                    <td>
                      <input
                        aria-label={`Chọn ${c.moduleClassCode}`}
                        type="checkbox"
                        disabled={c.status !== "SCHEDULED" || !a.editable(c)}
                        checked={selected.includes(c.id)}
                        onChange={(e) =>
                          setSelected((old) =>
                            e.target.checked
                              ? [...old, c.id]
                              : old.filter((id) => id !== c.id),
                          )
                        }
                      />
                    </td>
                  )}
                  <td>
                    <b>{c.moduleClassCode}</b>
                    <br />
                    {c.subjectName}
                  </td>
                  <td>{c.lecturerName || "Chưa phân công"}</td>
                  <td>
                    {c.currentSize}/{c.maxCapacity}
                  </td>
                  <td>
                    {!c.schedules.length && (
                      <span className="muted">Chưa xếp lịch</span>
                    )}
                    {c.schedules.map((s) => (
                      <div key={s.id}>
                        {s.dayOfWeek === 8 ? "Chủ nhật" : `Thứ ${s.dayOfWeek}`}{" "}
                        · Tiết {s.lessonOrderStart}–{s.lessonOrderEnd} ·{" "}
                        {s.roomCode}
                        <small style={{ display: "block" }}>
                          {s.startDate} → {s.endDate}
                        </small>
                      </div>
                    ))}
                  </td>
                  <td>
                    <span
                      className={`academic-status ${c.status.toLowerCase()}`}
                    >
                      {labels[c.status]}
                    </span>
                    {tab === "publish" && c.status === "SCHEDULED" && (
                      <div className="class-readiness">
                        {readiness(c).length
                          ? readiness(c).join("; ")
                          : "Đủ điều kiện công bố"}
                      </div>
                    )}
                  </td>
                  <td>
                    {a.editable(c) ? (
                      <div className="management-actions">
                        {tab === "list" && (
                          <>
                            <button className="btn" onClick={() => edit(c)}>
                              Phân công / cập nhật
                            </button>
                            <button
                              className="btn"
                              onClick={() => transition(c, "CANCELLED")}
                            >
                              Hủy lớp
                            </button>
                          </>
                        )}
                        {tab === "schedule" && (
                          <button
                            className="btn primary"
                            onClick={() => openSchedule(c)}
                          >
                            {c.schedules.length
                              ? "Điều chỉnh lịch"
                              : "Xếp lịch"}
                          </button>
                        )}
                        {tab === "publish" &&
                          (c.status === "OPEN" ? (
                            <button
                              className="btn"
                              onClick={() => transition(c, "SCHEDULED")}
                            >
                              Thu hồi công bố
                            </button>
                          ) : c.status === "UNSCHEDULED" ? (
                            <button
                              className="btn"
                              onClick={() => {
                                changeTab("schedule");
                                setQ(c.moduleClassCode);
                                openSchedule(c);
                              }}
                            >
                              Đi đến xếp lịch
                            </button>
                          ) : (
                            <span className="muted">Chọn lớp để công bố</span>
                          ))}
                      </div>
                    ) : (
                      <span>Chỉ xem</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="empty-state">Không tìm thấy lớp học phần phù hợp.</p>
          )}
        </div>
        <Pager total={rows.length} page={page} setPage={setPage} />
      </section>
    </>
  );
}
