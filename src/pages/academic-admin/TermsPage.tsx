import {
  semesterFormName,
  validateSemesterFields,
} from "../../utils/semesterValidation";
import { useAcademic, today } from "../../context/AcademicContext";
import { useManagement } from "../../context/ManagementContext";
import { useUI } from "../../context/UIContext";
import {
  EditForm,
  str,
  type Field,
} from "../../components/academic-admin/AcademicUI";
import type { SemesterResponse } from "../../types/dto";
export default function TermsPage() {
  const a = useAcademic(),
    m = useManagement(),
    { setDialog, notify, notifyError } = useUI();
  const close = () => setDialog(null);
  function edit(t?: SemesterResponse) {
    const related = a.data.classes.filter(
      (c) => c.semesterCode === t?.semesterCode,
    );
    const fields: Field[] = [
      {
        key: "semesterCode",
        label: "Mã kỳ học",
        value: t?.semesterCode ?? a.nextSemesterCode,
        readOnly: true,
        hint: "Mã được tạo tự động khi lưu và không thay đổi khi cập nhật.",
      },
      {
        key: "semesterName",
        label: "Tên kỳ học",
        required: true,
        value: t ? semesterFormName(t.semesterName) : "",
        hint: "Ví dụ: HK_1 - 2026-2027. Hai năm học phải liên tiếp; mã kỳ tự sinh tăng dần.",
      },
      {
        key: "startDate",
        label: "Ngày bắt đầu",
        type: "date",
        required: true,
        value: t?.startDate ?? "",
      },
      {
        key: "endDate",
        label: "Ngày kết thúc",
        type: "date",
        required: true,
        value: t?.endDate ?? "",
      },
      {
        key: "registrationStart",
        label: "Bắt đầu đăng ký",
        type: "date",
        required: true,
        value: t?.registrationStart ?? "",
      },
      {
        key: "registrationEnd",
        label: "Kết thúc đăng ký",
        type: "date",
        required: true,
        value: t?.registrationEnd ?? "",
      },
      ...(related.length
        ? [
            {
              key: "confirmed",
                                    type: "checkbox",
              label: "Kỳ đã có lớp học phần",
              required: false,
              options: [
                {
                  value: "yes",
                  label: "Tôi xác nhận thay đổi kỳ đã có lớp học phần",
                },
              ],
            },
          ]
        : []),
    ];
    setDialog({
      title: t ? "Cập nhật kỳ học" : "Thêm kỳ học",
      content: (
        <EditForm
          fields={fields}
          close={close}
          validate={(f, e) => {
            const start = str(f, "startDate"),
              end = str(f, "endDate");
            const rules = validateSemesterFields(
              {
                semesterName: str(f, "semesterName"),
                startDate: start,
                endDate: end,
                registrationStart: str(f, "registrationStart"),
                registrationEnd: str(f, "registrationEnd"),
              },
              a.terms,
              t?.id,
            );
            for (const [key, messages] of Object.entries(rules))
              e[key] = [...(e[key] ?? []), ...messages];
            if (
              t &&
              related.some((c) => c.status !== "CANCELLED") &&
              (start !== t.startDate || end !== t.endDate) &&
              str(f, "confirmed") !== "yes"
            )
              e.confirmed = [
                "Vui lòng xác nhận thay đổi ngày của kỳ đã có lớp học phần.",
              ];
            if (t?.isLocked || (t && t.endDate! < today()))
              e.startDate = ["Kỳ đã khóa hoặc kết thúc, chỉ được xem."];
            if (
              related.some((c) =>
                c.schedules.some(
                  (s) => s.startDate! < start || s.endDate! > end,
                ),
              )
            )
              e.startDate = ["Khoảng ngày mới không bao phủ lịch học đã xếp."];
            return e;
          }}
          save={(f) => {
            const term: SemesterResponse = {
              id: t?.id ?? Math.max(0, ...a.terms.map((x) => x.id)) + 1,
              semesterCode: t?.semesterCode ?? a.allocateSemesterCode(),
              semesterName: str(f, "semesterName"),
              startDate: str(f, "startDate"),
              endDate: str(f, "endDate"),
              registrationStart: str(f, "registrationStart"),
              registrationEnd: str(f, "registrationEnd"),
              isLocked: t?.isLocked ?? false,
              lockedGrade: t?.lockedGrade ?? false,
            };
            a.setTerms((old) =>
              t ? old.map((x) => (x.id === t.id ? term : x)) : [...old, term],
            );
            if (m.semester.id === term.id) m.setSemester(term);
            m.log(
              "Admin học vụ",
              t ? "Cập nhật kỳ học" : "Thêm kỳ học",
              term.semesterCode,
            );
            close();
            notify(
              `Đã ${t ? "cập nhật" : "thêm"} kỳ học ${term.semesterName}.`,
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
          <h1>Quản lý kỳ học</h1>
          <p>
            Thời gian đăng ký của kỳ và công bố từng lớp là hai điều kiện riêng.
          </p>
        </div>
        <button className="btn primary" onClick={() => edit()}>
          Thêm kỳ học
        </button>
      </div>
      <section className="card">
        <div className="table-scroll">
          <table className="management-table">
            <thead>
              <tr>
                {[
                  "Kỳ học",
                  "Thời gian học",
                  "Thời gian đăng ký",
                  "Trạng thái",
                  "Thao tác",
                ].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {a.terms.map((t) => (
                <tr key={t.id}>
                  <td>
                    <b>{t.semesterName}</b>
                    <br />
                    {t.semesterCode}
                  </td>
                  <td>
                    {t.startDate} → {t.endDate}
                  </td>
                  <td>
                    {t.registrationStart} → {t.registrationEnd}
                  </td>
                  <td>
                    {t.endDate! < today()
                      ? "Đã kết thúc"
                      : t.startDate! > today()
                        ? "Sắp diễn ra"
                        : "Đang diễn ra"}
                    {t.isLocked ? " · Đã khóa" : ""}
                  </td>
                  <td>
                    <div className="management-actions">
                      <button
                        className="btn"
                        disabled={t.endDate! < today() || !!t.isLocked}
                        onClick={() => edit(t)}
                      >
                        Cập nhật
                      </button>
                      <button
                        className="btn"
                        disabled={t.endDate! < today() || !!t.isLocked}
                        onClick={() => {
                          if (m.semester.id === t.id) {
                            notifyError(
                              "Hãy chọn một kỳ khác để hiển thị trước khi xóa kỳ này.",
                            );
                            return;
                          }
                          if (
                            a.data.classes.some(
                              (c) => c.semesterCode === t.semesterCode,
                            )
                          ) {
                            notifyError(
                              "Không thể xóa kỳ học đã có lớp học phần.",
                            );
                            return;
                          }
                          setDialog({
                            title: `Xóa ${t.semesterName}?`,
                            body: "Chỉ kỳ chưa phát sinh lớp học phần mới được xóa.",
                            confirm: "Xóa kỳ học",
                            action: () => {
                              a.setTerms((old) =>
                                old.filter((x) => x.id !== t.id),
                              );
                              m.log(
                                "Admin học vụ",
                                "Xóa kỳ học",
                                t.semesterCode,
                              );
                              notify(`Đã xóa kỳ học ${t.semesterName}.`);
                            },
                          });
                        }}
                      >
                        Xóa
                      </button>
                      <button
                        className="btn"
                        disabled={m.semester.id === t.id}
                        onClick={() => {
                          m.setSemester(t);
                          notify(
                            `Đã chọn ${t.semesterName} để hiển thị đăng ký học phần.`,
                          );
                        }}
                      >
                        {m.semester.id === t.id
                          ? "Kỳ đang hiển thị"
                          : "Chọn kỳ hiển thị"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
