import {
  lecturerEmailError,
  normalizeEmail,
} from "../../services/academic/lecturers";
import type { DemoLecturer } from "../../context/AcademicContext";
import type { Field } from "../../components/academic-admin/AcademicUI";
import { useState } from "react";
import { useAcademic } from "../../context/AcademicContext";
import { useAuth } from "../../context/AuthContext";
import { useManagement } from "../../context/ManagementContext";
import { useUI } from "../../context/UIContext";
import {
  EditForm,
  Detail,
  Pager,
  faculties,
  str,
} from "../../components/academic-admin/AcademicUI";

export default function TeachersPage() {
  const a = useAcademic(),
    auth = useAuth(),
    { log } = useManagement(),
    { setDialog, notify } = useUI();
  const [q, setQ] = useState(""),
    [faculty, setFaculty] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(0);
  const rows = a.data.teachers.filter(
    (t) =>
      (t.lecturerCode + " " + t.fullName)
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (!faculty || t.facultyName === faculty) &&
      (!status || t.status === status),
  );
  function edit(t?: DemoLecturer) {
    setDialog({
      title: t
        ? `Cập nhật giảng viên · ${t.lecturerCode}`
        : "Thêm mới giảng viên",
      content: <LecturerEditor teacher={t} close={() => setDialog(null)} />,
    });
  }
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Quản lý giảng viên</h1>
          <p>Tra cứu hồ sơ theo mã, khoa và trạng thái hoạt động.</p>
        </div>
        <button className="btn primary" onClick={() => edit()}>
          Thêm mới giảng viên
        </button>
      </div>
      <section className="card">
        <div className="admin-filter">
          <label>
            Mã giảng viên / họ tên
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label>
            Khoa
            <select
              value={faculty}
              onChange={(e) => {
                setFaculty(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Tất cả khoa</option>
              {faculties.map((x) => (
                <option key={x.value}>{x.label}</option>
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
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Ngừng hoạt động</option>
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table className="management-table">
            <thead>
              <tr>
                {[
                  "Mã GV",
                  "Họ và tên",
                  "Email",
                  "Số điện thoại",
                  "Khoa",
                  "Trạng thái",
                ].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * 10, page * 10 + 10).map((t) => (
                <tr key={t.id}>
                  <td>{t.lecturerCode}</td>
                  <td>
                    <button
                      className="text-link"
                      onClick={() =>
                        setDialog({
                          title: `Hồ sơ ${t.lecturerCode}`,
                          content: (
                            <>
                              <Detail
                                items={[
                                  ["Họ và tên", t.fullName],
                                  [
                                    "Ngày sinh",
                                    a.people[t.lecturerCode]?.dateOfBirth,
                                  ],
                                  ["CCCD", a.people[t.lecturerCode]?.citizenId],
                                  ["Email", t.email],
                                  ["Số điện thoại", t.phone],
                                  ["Khoa", t.facultyName],
                                  [
                                    "Trạng thái",
                                    t.status === "ACTIVE"
                                      ? "Đang hoạt động"
                                      : "Ngừng hoạt động",
                                  ],
                                  [
                                    "Năm tuyển dụng",
                                    t.recruitmentYear ?? "Chưa khai báo",
                                  ],
                                  [
                                    "Học phần có thể dạy",
                                    t.teachingSubjects
                                      ?.map((x) => x.subjectName)
                                      .join(", ") || "Chưa khai báo",
                                  ],
                                ]}
                              />
                              <button
                                className="btn primary"
                                onClick={() => edit(t)}
                              >
                                Cập nhật hồ sơ
                              </button>
                            </>
                          ),
                        })
                      }
                    >
                      {t.fullName}
                    </button>
                  </td>
                  <td>
                    <button
                      className="text-link"
                      onClick={() => edit(t)}
                      aria-label={`Cập nhật email ${t.lecturerCode}`}
                    >
                      {t.email || "Bổ sung email"}
                    </button>
                  </td>
                  <td>{t.phone || "—"}</td>
                  <td>{t.facultyName}</td>
                  <td>
                    {t.status === "ACTIVE"
                      ? "Đang hoạt động"
                      : "Ngừng hoạt động"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="empty-state">
              Không tìm thấy giảng viên phù hợp với bộ lọc.
            </p>
          )}
        </div>
        <Pager total={rows.length} page={page} setPage={setPage} />
      </section>
    </>
  );
}

// Explicit local catalog configuration; never inferred from a displayed faculty name.
const demoFacultyCodes: Record<number, string> = {
  1: "CNTT",
  2: "ATTT",
  3: "DTVT",
};
function LecturerEditor({
  teacher: t,
  close,
}: {
  teacher?: DemoLecturer;
  close: () => void;
}) {
  const a = useAcademic(),
    auth = useAuth(),
    { notify } = useUI(),
    { log } = useManagement();
  const [subjectError, setSubjectError] = useState("");
  const [changedSubjects, setChangedSubjects] = useState(false);
  const currentIds = t?.teachingSubjects?.map((x) => x.id) ?? [];
  const activeSubjects = a.data.subjects.filter((x) => x.status === "ACTIVE");
  const options = [
    ...activeSubjects,
    ...(t?.teachingSubjects ?? []).filter(
      (x) => !activeSubjects.some((s) => s.id === x.id),
    ),
  ];
  const fields: Field[] = [
    { key: "fullName", label: "Họ và tên", required: true, value: t?.fullName },
    {
      key: "dateOfBirth",
      label: "Ngày sinh",
      type: "date",
      required: !t,
      value: t ? a.people[t.lecturerCode]?.dateOfBirth : "",
    },
    {
      key: "citizenId",
      label: "CCCD",
      value: t ? a.people[t.lecturerCode]?.citizenId : "",
    },
    {
      key: "email",
      label: "Email",
      type: "email",
      required: !t,
      value: t?.email ?? "",
    },
    { key: "phone", label: "Số điện thoại", value: t?.phone ?? "" },
    ...(!t
      ? [
          {
            key: "facultyId",
            label: "Khoa",
            required: true,
            options: faculties,
          },
          {
            key: "recruitmentYear",
            label: "Năm tuyển dụng",
            type: "number",
            required: true,
            min: 1000,
            max: 9999,
          },
        ]
      : []),
    {
      key: "reason",
      label: t ? "Lý do cập nhật" : "Lý do thêm mới",
      required: !t,
    },
  ];
  return (
    <EditForm
      fields={fields}
      close={close}
      submit={t ? "Lưu hồ sơ" : "Tạo hồ sơ và tài khoản"}
      validate={(f, errors) => {
        const email = normalizeEmail(str(f, "email"));
        if (email || !t) {
          const error = lecturerEmailError(
            email,
            t?.lecturerCode ?? "",
            a.data.teachers,
            auth.users,
          );
          if (error) errors.email = [error];
        }
        const citizen = str(f, "citizenId");
        if (
          citizen &&
          a.data.teachers.some(
            (x) =>
              x.id !== t?.id && a.people[x.lecturerCode]?.citizenId === citizen,
          )
        )
          errors.citizenId = ["CCCD đã tồn tại trong hồ sơ giảng viên."];
        for (const key of ["fullName", "email", "phone", "citizenId"])
          if (str(f, key).length > 255)
            errors[key] = ["Nội dung tối đa 255 ký tự."];
        if (str(f, "reason").length > 500)
          errors.reason = ["Lý do tối đa 500 ký tự."];
        const ids = f.getAll("teachingSubjectIds").map(Number);
        const error =
          (!t || changedSubjects) &&
          (!ids.length ||
            ids.some((id) => !activeSubjects.some((x) => x.id === id)))
            ? "Chọn ít nhất một học phần đang hoạt động; bỏ môn đã ngừng trước khi thay danh sách."
            : "";
        setSubjectError(error);
        if (error) errors.teachingSubjectIds = [error];
        return errors;
      }}
      save={async (f) => {
        const ids = f.getAll("teachingSubjectIds").map(Number);
        const email = normalizeEmail(str(f, "email"));
        const fullName = str(f, "fullName");
        let next: DemoLecturer;
        if (t) {
          next = {
            ...t,
            fullName,
            email,
            phone: str(f, "phone"),
            ...(!t || changedSubjects
              ? {
                  teachingSubjects: activeSubjects
                    .filter((x) => ids.includes(x.id))
                    .map(({ id, subjectCode, subjectName, credits }) => ({
                      id,
                      subjectCode,
                      subjectName,
                      credits,
                    })),
                }
              : {}),
          };
          auth.setUsers((old) =>
            old.map((u) =>
              u.username === t.lecturerCode && u.role === "LECTURER"
                ? { ...u, fullName, email: email || null }
                : u,
            ),
          );
        } else {
          const facultyId = Number(str(f, "facultyId")),
            recruitmentYear = Number(str(f, "recruitmentYear"));
          const prefix = demoFacultyCodes[facultyId];
          if (!prefix)
            throw Error("Khoa chưa được cấu hình mã cấp giảng viên.");
          const used = a.data.teachers.filter(
            (x) =>
              x.facultyId === facultyId &&
              x.recruitmentYear === recruitmentYear,
          );
          let sequence = Math.max(
            0,
            ...used.map((x) => Number(x.lecturerCode.slice(-3)) || 0),
          );
          let code: string;
          do {
            code =
              prefix +
              String(recruitmentYear).slice(-2) +
              String(++sequence).padStart(3, "0");
          } while (auth.users.some((u) => u.username === code));
          if (sequence > 999)
            throw Error("Đã hết số thứ tự giảng viên của khoa/năm tuyển dụng.");
          next = {
            id: Math.max(0, ...a.data.teachers.map((x) => x.id)) + 1,
            lecturerCode: code,
            fullName,
            email,
            phone: str(f, "phone"),
            facultyId,
            facultyName: faculties.find((x) => x.value === facultyId)!.label,
            recruitmentYear,
            teachingSubjects: activeSubjects
              .filter((x) => ids.includes(x.id))
              .map(({ id, subjectCode, subjectName, credits }) => ({
                id,
                subjectCode,
                subjectName,
                credits,
              })),
            status: "ACTIVE",
          };
          await auth.provisionAccounts([
            { username: code, fullName, email, role: "LECTURER" },
          ]);
        }
        a.setData((old) => ({
          ...old,
          teachers: t
            ? old.teachers.map((x) => (x.id === t.id ? next : x))
            : [...old.teachers, next],
        }));
        a.setPeople((old) => ({
          ...old,
          [next.lecturerCode]: {
            ...old[next.lecturerCode],
            ...(str(f, "dateOfBirth")
              ? { dateOfBirth: str(f, "dateOfBirth") }
              : {}),
            ...(str(f, "citizenId") ? { citizenId: str(f, "citizenId") } : {}),
            reason: str(f, "reason"),
          },
        }));
        log(
          "Admin học vụ",
          t ? "Cập nhật giảng viên" : "Tạo giảng viên",
          next.lecturerCode,
        );
        close();
        notify(
          t
            ? "Đã cập nhật hồ sơ giảng viên."
            : `Đã tạo ${next.lecturerCode} và tài khoản. Email chưa được gửi.`,
        );
      }}
    >
      <label>
        Học phần có thể giảng dạy{!t ? " *" : ""}
        <select
          multiple
          name="teachingSubjectIds"
          defaultValue={currentIds.map(String)}
          onChange={() => setChangedSubjects(true)}
          aria-describedby="demo-teaching-error"
          size={Math.min(8, Math.max(3, options.length))}
        >
          {options.map((s) => (
            <option key={s.id} value={s.id}>
              {s.subjectCode} · {s.subjectName}
              {!activeSubjects.some((x) => x.id === s.id) ? " (đã ngừng)" : ""}
            </option>
          ))}
        </select>
        <small>
          Giữ Ctrl để chọn nhiều học phần. Hồ sơ cũ giữ nguyên danh sách nếu bạn
          không thay đổi.
        </small>
        {subjectError && (
          <span id="demo-teaching-error" className="field-error">
            {subjectError}
          </span>
        )}
      </label>
    </EditForm>
  );
}
