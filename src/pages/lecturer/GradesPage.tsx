import { useAcademic } from "../../context/AcademicContext";
import { useTeaching } from "../../hooks/useTeaching";
import {
  updateProcessScore,
  enrollmentFor,
} from "../../services/mock/dtoService";
import { moduleClassResponses } from "../../data/mock/dtoFixtures";
import { useState } from "react";
import { Save, Download } from "lucide-react";
import { useManagement } from "../../context/ManagementContext";
import { useDemoData } from "../../context/DemoDataContext";
import { useUI } from "../../context/UIContext";
import { demoRosters } from "../../data/mock/management";
import type { Grade } from "../../types/management";
import { exportCsv } from "../../utils/exportCsv";
import { ManagementHeading } from "../../components/common/ManagementHeading";
export default function GradesPage() {
  const { data: academicData } = useAcademic();

  const {
    lecturerCode,
    records,
    grades,
    setGrades,
    term,
    log,
    classes: own,
    selected,
    setSelected,
    rosters,
    scores,
    periods,
    teachingTerm,
    changePeriod,
    readonly,
    historical,
  } = useTeaching();
  const { studentData } = useDemoData();
  const { notify } = useUI();
  const [drafts, setDrafts] = useState<Record<string, Record<string, Grade>>>(
    {},
  );
  const [error, setErrorState] = useState("");
  const roster = studentData.filter((s) =>
    (rosters[selected] ?? []).includes(s.id),
  );
  const values = historical
    ? (scores[selected] ?? {})
    : (drafts[selected] ?? scores[selected] ?? {});
  const [attempted, setAttempted] = useState(false);
  const scoreError = (v: string) =>
    v.trim() !== "" && (!/^\d+(\.\d+)?$/.test(v) || +v < 0 || +v > 10)
      ? "Điểm phải là số từ 0 đến 10."
      : "";
  const dirty =
    !historical &&
    JSON.stringify(values) !== JSON.stringify(grades[selected] ?? {});
  function setError(message: string) {
    setErrorState(message);
  }
  function update(id: string, key: keyof Grade, value: string) {
    setDrafts((old) => ({
      ...old,
      [selected]: {
        ...values,
        [id]: {
          ...(values[id] ?? { tp1: "", tp2: "", note: "" }),
          [key]: value,
        },
      },
    }));
    setError("");
  }
  function save() {
    if (readonly || !own.some((c) => c.id === selected))
      return setError("Kỳ đã khóa hoặc lớp không thuộc quyền phụ trách.");
    setAttempted(true);
    if (
      roster.some((s) =>
        [values[s.id]?.tp1 ?? "", values[s.id]?.tp2 ?? ""].some((v) =>
          scoreError(v),
        ),
      )
    )
      return;
    const moduleClassId = academicData.classes.find(
      (c) => c.moduleClassCode === selected,
    )?.id;
    if (!moduleClassId) return setError("Chưa có dữ liệu đăng ký cho lớp này.");
    try {
      for (const student of roster) {
        const g = values[student.id];
        if (!g) continue;
        updateProcessScore({
          enrollmentId: enrollmentFor(
            moduleClassId,
            student.dto,
            academicData.classes,
          ).id,
          componentScore1: g.tp1.trim() === "" ? null : Number(g.tp1),
          componentScore2: g.tp2.trim() === "" ? null : Number(g.tp2),
          note: g.note,
        });
      }
    } catch {
      setError("Không thể lưu điểm. Vui lòng kiểm tra dữ liệu và thử lại.");
      return;
    }
    const before = grades[selected] ?? {};
    setGrades((old) => ({ ...old, [selected]: values }));
    log(
      `Giảng viên ${lecturerCode ?? ""}`,
      "Lưu điểm quá trình",
      selected +
        " | Trước: " +
        JSON.stringify(before) +
        " | Sau: " +
        JSON.stringify(values),
    );
    notify("Đã lưu điểm quá trình của lớp " + selected + ".");
  }
  return (
    <>
      <ManagementHeading
        title="Quản lý điểm quá trình"
        description="Cập nhật điểm TP1, TP2 theo thang 10. Điểm trống được hiểu là chưa nhập."
      >
        <button
          className="btn"
          onClick={() =>
            exportCsv("diem-" + teachingTerm + "-" + selected + ".csv", [
              ["MSSV", "Họ tên", "TP1", "TP2", "Ghi chú"],
              ...roster.map((s) => [
                s.id,
                s.name,
                scores[selected]?.[s.id]?.tp1 ?? "",
                scores[selected]?.[s.id]?.tp2 ?? "",
                scores[selected]?.[s.id]?.note ?? "",
              ]),
            ])
          }
        >
          <Download size={15} />
          Xuất CSV (điểm đã lưu)
        </button>
      </ManagementHeading>
      <section className="card">
        <div className="management-toolbar">
          <label>
            Kỳ học
            <select
              value={teachingTerm}
              onChange={(e) => {
                changePeriod(e.target.value);
                setError("");
                setAttempted(false);
              }}
            >
              {periods.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Lớp học phần
            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setAttempted(false);
                setError("");
              }}
            >
              {own.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.id} —{" "}
                  {records.subjects.find((s) => s.id === c.subject)?.name}
                </option>
              ))}
            </select>
          </label>
          <span className={"badge " + (readonly ? "yellow" : "green")}>
            {readonly ? "Đã khóa điểm" : "Được phép cập nhật"}
          </span>
        </div>
        <div className={"notice " + (readonly ? "yellow" : "blue")}>
          {readonly
            ? "Kỳ học đã khóa điểm. Chỉ được xem và xuất dữ liệu."
            : "Nhập điểm từ 0 đến 10; để trống nếu chưa có điểm."}
        </div>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="table-scroll">
            <table className="grade-table">
              <thead>
                <tr>
                  <th>MSSV</th>
                  <th>Họ và tên</th>
                  <th>TP1</th>
                  <th>TP2</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => (
                  <tr key={s.id}>
                    <td className="code-text">{s.id}</td>
                    <td>{s.name}</td>
                    {(["tp1", "tp2", "note"] as const).map((key) => (
                      <td key={key}>
                        <input
                          aria-label={key.toUpperCase() + " " + s.id}
                          type="text"
                          inputMode={key === "note" ? "text" : "decimal"}
                          aria-invalid={
                            attempted &&
                            key !== "note" &&
                            !!scoreError(values[s.id]?.[key] ?? "")
                          }
                          aria-describedby={
                            attempted &&
                            key !== "note" &&
                            scoreError(values[s.id]?.[key] ?? "")
                              ? `${s.id}-${key}-error`
                              : undefined
                          }
                          min={0}
                          max={10}
                          step="0.1"
                          placeholder={key === "note" ? "Ghi chú…" : "—"}
                          disabled={readonly}
                          value={values[s.id]?.[key] ?? ""}
                          onChange={(e) => update(s.id, key, e.target.value)}
                        />
                        {attempted &&
                          key !== "note" &&
                          scoreError(values[s.id]?.[key] ?? "") && (
                            <div
                              className="field-error"
                              id={`${s.id}-${key}-error`}
                            >
                              {scoreError(values[s.id]?.[key] ?? "")}
                            </div>
                          )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!roster.length && (
            <div className="empty-state">Chưa có sinh viên trong lớp này.</div>
          )}
          {error && (
            <div className="notice red" role="alert">
              {error}
            </div>
          )}
          <div className="grade-save">
            <span>
              {dirty ? "Có thay đổi chưa lưu" : "Không có thay đổi chưa lưu"}
            </span>
            <button
              className="btn primary"
              disabled={readonly || !dirty || !roster.length}
            >
              <Save size={16} />
              Lưu điểm
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
