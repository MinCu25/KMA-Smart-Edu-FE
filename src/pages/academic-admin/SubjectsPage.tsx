import { teachingHistory } from "../../data/mock/teachingHistory";
import { gradeResponses } from "../../data/mock/grades";
import { useState } from "react";
import { useAcademic } from "../../context/AcademicContext";
import { useManagement } from "../../context/ManagementContext";
import { useUI } from "../../context/UIContext";
import {
  EditForm,
  Detail,
  Pager,
  str,
  type Field,
} from "../../components/academic-admin/AcademicUI";
import { prerequisiteCycle } from "../../utils/academicRules";
import {
  subjectRequest,
  prerequisiteRequest,
} from "../../services/api/requestBuilders";
import type { SubjectResponse, SubjectActionRequest } from "../../types/dto";
function Prerequisites({
  subject,
  close,
}: {
  subject: SubjectResponse;
  close: () => void;
}) {
  const a = useAcademic(),
    { log } = useManagement(),
    { notify } = useUI();
  const [selected, setSelected] = useState(
      subject.prerequisites.map((p) => p.id),
    ),
    [q, setQ] = useState(""),
    [error, setError] = useState("");
  const dependents = a.data.subjects.filter((s) =>
    s.prerequisites.some((p) => p.id === subject.id),
  );
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const request = prerequisiteRequest(selected),
          cycle = prerequisiteCycle(
            a.data.subjects,
            subject.id,
            request.prerequisiteSubjectIds,
          );
        if (cycle.length) {
          setError(
            `Vòng lặp tiên quyết: ${cycle.join(" → ")}. Vui lòng gỡ một liên kết.`,
          );
          return;
        }
        a.setData((old) => {
          let subjects = old.subjects.map((s) =>
            s.id === subject.id
              ? {
                  ...s,
                  prerequisites: old.subjects
                    .filter((p) => selected.includes(p.id))
                    .map(({ id, subjectCode, subjectName, credits }) => ({
                      id,
                      subjectCode,
                      subjectName,
                      credits,
                    })),
                }
              : s,
          );
          subjects = subjects.map((s) => ({
            ...s,
            requiredBy: subjects
              .filter((p) => p.prerequisites.some((t) => t.id === s.id))
              .map(({ id, subjectCode, subjectName, credits }) => ({
                id,
                subjectCode,
                subjectName,
                credits,
              })),
          }));
          return { ...old, subjects };
        });
        log(
          "Admin học vụ",
          "Cập nhật tiên quyết",
          `${subject.subjectCode}: ${selected.join(", ")}`,
        );
        close();
        notify(`Đã cập nhật môn tiên quyết cho ${subject.subjectCode}.`);
      }}
    >
      <p>
        <b>
          {subject.subjectCode} · {subject.subjectName}
        </b>
      </p>
      <p>
        Học phần phụ thuộc:{" "}
        {dependents
          .map((s) => s.subjectCode + " — " + s.subjectName)
          .join("; ") || "Không có"}
        .
      </p>
      <label>
        Tìm học phần tiên quyết
        <input value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="prerequisite-list">
        {a.data.subjects
          .filter(
            (s) =>
              s.id !== subject.id &&
              s.status === "ACTIVE" &&
              !a.deletedSubjects.includes(s.id) &&
              (s.subjectCode + " " + s.subjectName)
                .toLowerCase()
                .includes(q.toLowerCase()),
          )
          .map((s) => (
            <label key={s.id}>
              <input
                type="checkbox"
                checked={selected.includes(s.id)}
                onChange={(e) => {
                  setSelected((old) =>
                    e.target.checked
                      ? [...old, s.id]
                      : old.filter((id) => id !== s.id),
                  );
                  setError("");
                }}
              />
              <span>
                {s.subjectCode} · {s.subjectName}{" "}
                <small>{s.credits} tín chỉ</small>
              </span>
            </label>
          ))}
      </div>
      <p>
        Đã chọn {selected.length} học phần. Bỏ chọn để gỡ ràng buộc. Thay đổi áp
        dụng từ thời điểm lưu, không hồi tố kết quả học tập.
      </p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={close}>
          Hủy
        </button>
        <button className="btn primary">Lưu môn tiên quyết</button>
      </div>
    </form>
  );
}
export default function SubjectsPage() {
  const a = useAcademic(),
    { log, grades } = useManagement(),
    { setDialog, notify } = useUI();
  const [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [credits, setCredits] = useState(""),
    [without, setWithout] = useState(false),
    [page, setPage] = useState(0);
  const rows = a.data.subjects.filter(
    (s) =>
      !a.deletedSubjects.includes(s.id) &&
      (s.subjectCode + " " + s.subjectName)
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (!status || s.status === status) &&
      (!credits || s.credits === +credits) &&
      (!without || !s.prerequisites.length),
  );
  const close = () => setDialog(null);
  function edit(s?: SubjectResponse) {
    const fields: Field[] = [
      {
        key: "subjectCode",
        label: "Mã học phần",
        required: true,
        value: s?.subjectCode,
        readOnly: !!s,
      },
      {
        key: "subjectName",
        label: "Tên học phần",
        required: true,
        value: s?.subjectName,
      },
      {
        key: "credits",
        label: "Số tín chỉ",
        type: "number",
        required: true,
        min: 1,
        max: 5,
        value: s?.credits,
      },
      { key: "description", label: "Mô tả", value: s?.description ?? "" },
    ];
    const active = a.data.classes.filter(
      (c) => c.subjectCode === s?.subjectCode && a.editable(c),
    );
    setDialog({
      title: s ? `Cập nhật ${s.subjectCode}` : "Thêm học phần",
      content: (
        <EditForm
          fields={[
            ...fields,
            ...(active.length
              ? [
                  {
                    key: "confirmed",
                    label: "Xác nhận cập nhật học phần có lớp đang mở",
                    required: true,
                    options: [{ value: "yes", label: "Tôi xác nhận cập nhật" }],
                  },
                ]
              : []),
          ]}
          close={close}
          validate={(f, e) => {
            if (
              a.data.subjects.some(
                (t) =>
                  t.id !== s?.id &&
                  t.subjectCode.toLowerCase() ===
                    str(f, "subjectCode").toLowerCase(),
              )
            )
              e.subjectCode = ["Mã học phần đã tồn tại."];
            if (
              a.data.subjects.some(
                (t) =>
                  t.id !== s?.id &&
                  t.subjectName.toLowerCase() ===
                    str(f, "subjectName").toLowerCase(),
              )
            )
              e.subjectName = ["Tên học phần đã tồn tại."];
            if (
              s &&
              +str(f, "credits") !== s.credits &&
              hasSubjectGrades(s.subjectCode)
            )
              e.credits = [
                "Không thể đổi số tín chỉ: học phần đã có dữ liệu điểm.",
              ];
            return e;
          }}
          save={(f) => {
            const p = subjectRequest(f, !!s);
            a.setData((old) => ({
              ...old,
              subjects: s
                ? old.subjects.map((t) => (t.id === s.id ? { ...t, ...p } : t))
                : [
                    ...old.subjects,
                    {
                      ...p,
                      subjectCode: str(f, "subjectCode"),
                      id: Math.max(0, ...old.subjects.map((t) => t.id)) + 1,
                      description: p.description ?? null,
                      status: "ACTIVE",
                      prerequisites: [],
                      requiredBy: [],
                    },
                  ],
            }));
            log(
              "Admin học vụ",
              s ? "Cập nhật học phần" : "Tạo học phần",
              str(f, "subjectCode"),
            );
            close();
            notify(
              s
                ? `Đã cập nhật ${s.subjectCode}.`
                : `Đã thêm học phần ${str(f, "subjectCode")}.`,
            );
          }}
        >
          {!!active.length && (
            <p>
              Các lớp đang mở: {active.map((c) => c.moduleClassCode).join(", ")}
              .
            </p>
          )}
        </EditForm>
      ),
    });
  }
  function hasSubjectGrades(code: string) {
    return (
      a.data.classes.some(
        (c) =>
          c.subjectCode === code &&
          Object.keys(grades[c.moduleClassCode] ?? {}).length > 0,
      ) ||
      teachingHistory.some((t) =>
        t.classes.some(
          (c) =>
            c.subject === code && Object.keys(t.grades[c.id] ?? {}).length > 0,
        ),
      ) ||
      gradeResponses.some(
        (r) =>
          r.subjectCode === code &&
          [
            r.componentScore1,
            r.componentScore2,
            r.courseScore10,
            r.finalExamScore,
          ].some((v) => v != null),
      )
    );
  }
  function action(s: SubjectResponse, remove: boolean) {
    const dependents = a.data.subjects.filter(
      (t) =>
        t.status === "ACTIVE" &&
        !a.deletedSubjects.includes(t.id) &&
        t.prerequisites.some((p) => p.id === s.id),
    );
    const related = a.data.classes.filter(
      (c) => c.subjectCode === s.subjectCode,
    );
    setDialog({
      title: `${remove ? "Xóa mềm" : "Ngừng sử dụng"} ${s.subjectCode}`,
      content: (
        <EditForm
          fields={[
            { key: "reason", label: "Lý do", required: true },
            {
              key: "confirmed",
              label: "Xác nhận thao tác",
              required: true,
              options: [
                { value: "yes", label: "Tôi xác nhận thực hiện thao tác" },
              ],
            },
          ]}
          close={close}
          submit={remove ? "Xóa mềm học phần" : "Ngừng sử dụng"}
          validate={(f, e) => {
            if (dependents.length)
              e.reason = [
                `Không thể thực hiện. Các học phần đang phụ thuộc: ${dependents.map((t) => t.subjectCode).join(", ")}. Hãy gỡ ràng buộc tiên quyết trước.`,
              ];
            if (remove && (related.length || hasSubjectGrades(s.subjectCode)))
              e.reason = [
                "Học phần đã có lớp học phần. Chỉ được ngừng sử dụng để bảo toàn lịch sử.",
              ];
            return e;
          }}
          save={(f) => {
            const request: SubjectActionRequest = {
              reason: str(f, "reason"),
              confirmed: str(f, "confirmed") === "yes",
            };
            if (remove) a.setDeletedSubjects((old) => [...old, s.id]);
            else
              a.setData((old) => ({
                ...old,
                subjects: old.subjects.map((t) =>
                  t.id === s.id ? { ...t, status: "INACTIVE" } : t,
                ),
              }));
            log(
              "Admin học vụ",
              remove ? "Xóa mềm học phần" : "Ngừng sử dụng học phần",
              `${s.subjectCode} · ${request.reason}`,
            );
            close();
            notify(
              `Đã ${remove ? "xóa mềm" : "ngừng sử dụng"} học phần ${s.subjectCode}.`,
            );
          }}
        />
      ),
    });
  }
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Danh mục học phần</h1>
          <p>Quản lý thông tin, vòng đời và quan hệ tiên quyết của học phần.</p>
        </div>
        <button className="btn primary" onClick={() => edit()}>
          Thêm học phần
        </button>
      </div>
      <section className="card">
        <div className="admin-filter">
          <label>
            Mã / tên học phần
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label>
            Tín chỉ
            <select
              value={credits}
              onChange={(e) => {
                setCredits(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Tất cả</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n}>{n}</option>
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
              <option value="ACTIVE">Đang sử dụng</option>
              <option value="INACTIVE">Ngừng sử dụng</option>
            </select>
          </label>
          <label className="check-line">
            <input
              type="checkbox"
              checked={without}
              onChange={(e) => {
                setWithout(e.target.checked);
                setPage(0);
              }}
            />{" "}
            Chưa có môn tiên quyết
          </label>
        </div>
        <div className="table-scroll">
          <table className="management-table">
            <thead>
              <tr>
                {[
                  "Mã học phần",
                  "Tên học phần",
                  "Tín chỉ",
                  "Tiên quyết",
                  "Trạng thái",
                  "Thao tác",
                ].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * 10, page * 10 + 10).map((s) => (
                <tr key={s.id}>
                  <td>{s.subjectCode}</td>
                  <td>
                    <button
                      className="text-link"
                      onClick={() =>
                        setDialog({
                          title: s.subjectName,
                          content: (
                            <Detail
                              items={[
                                ["Mã học phần", s.subjectCode],
                                ["Số tín chỉ", s.credits],
                                ["Mô tả", s.description],
                                [
                                  "Tiên quyết",
                                  s.prerequisites
                                    .map(
                                      (p) =>
                                        p.subjectCode + " · " + p.subjectName,
                                    )
                                    .join("; ") || "Không có",
                                ],
                                [
                                  "Học phần phụ thuộc",
                                  a.data.subjects
                                    .filter((t) =>
                                      t.prerequisites.some(
                                        (p) => p.id === s.id,
                                      ),
                                    )
                                    .map(
                                      (t) =>
                                        t.subjectCode + " · " + t.subjectName,
                                    )
                                    .join("; ") || "Không có",
                                ],
                              ]}
                            />
                          ),
                        })
                      }
                    >
                      {s.subjectName}
                    </button>
                  </td>
                  <td>{s.credits}</td>
                  <td>
                    {s.prerequisites.map((p) => p.subjectCode).join(", ") ||
                      "Không có"}
                  </td>
                  <td>
                    {s.status === "ACTIVE" ? "Đang sử dụng" : "Ngừng sử dụng"}
                  </td>
                  <td>
                    <div className="management-actions">
                      {s.status === "ACTIVE" && (
                        <>
                          <button className="btn" onClick={() => edit(s)}>
                            Sửa
                          </button>
                          <button
                            className="btn"
                            onClick={() =>
                              setDialog({
                                title: `Tiên quyết · ${s.subjectCode}`,
                                content: (
                                  <Prerequisites subject={s} close={close} />
                                ),
                              })
                            }
                          >
                            Tiên quyết
                          </button>
                          <button
                            className="btn"
                            onClick={() => action(s, false)}
                          >
                            Ngừng sử dụng
                          </button>
                        </>
                      )}
                      <button className="btn" onClick={() => action(s, true)}>
                        Xóa mềm
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="empty-state">Không tìm thấy học phần phù hợp.</p>
          )}
        </div>
        <Pager total={rows.length} page={page} setPage={setPage} />
      </section>
    </>
  );
}
