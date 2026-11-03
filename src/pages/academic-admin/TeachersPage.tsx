import {
  lecturerEmailError,
  normalizeEmail,
} from "../../services/academic/lecturers";
import type { LecturerResponse } from "../../types/dto";
import { ResendAccountEmail } from "../../components/academic-admin/ResendAccountEmail";
import { useState } from "react";
import { useAcademic } from "../../context/AcademicContext";
import { useAuth } from "../../context/AuthContext";
import { useManagement } from "../../context/ManagementContext";
import { useUI } from "../../context/UIContext";
import {
  EditForm,
  Detail,
  Pager,
  personFields,
  faculties,
  str,
} from "../../components/academic-admin/AcademicUI";
import type { CreateLecturerRequest } from "../../types/dto";
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
  function editEmail(t: LecturerResponse) {
    setDialog({
      title: `Cập nhật email · ${t.lecturerCode}`,
      content: (
        <EditForm
          fields={[
            {
              key: "email",
              label: "Email",
              type: "email",
              required: true,
              value: t.email ?? "",
            },
          ]}
          close={() => setDialog(null)}
          validate={(f, e) => {
            const message = lecturerEmailError(
              str(f, "email"),
              t.lecturerCode,
              a.data.teachers,
              auth.users,
            );
            if (message) e.email = [message];
            return e;
          }}
          save={(f) => {
            const email = normalizeEmail(str(f, "email"));
            a.setData((old) => ({
              ...old,
              teachers: old.teachers.map((x) =>
                x.id === t.id ? { ...x, email } : x,
              ),
            }));
            auth.setUsers((old) =>
              old.map((u) =>
                u.username === t.lecturerCode && u.role === "LECTURER"
                  ? { ...u, email }
                  : u,
              ),
            );
            log("Admin học vụ", "Cập nhật email giảng viên", t.lecturerCode);
            setDialog(null);
            notify("Đã cập nhật email hồ sơ và tài khoản giảng viên.");
          }}
        />
      ),
    });
  }
  function add() {
    setDialog({
      title: "Thêm mới giảng viên",
      content: (
        <EditForm
          fields={personFields}
          close={() => setDialog(null)}
          submit="Tạo hồ sơ và tài khoản"
          validate={(f, e) => {
            const emailError = lecturerEmailError(
              str(f, "email"),
              "",
              a.data.teachers,
              auth.users,
            );
            if (emailError) e.email = [emailError];
            if (
              str(f, "citizenId") &&
              Object.values(a.people).some(
                (p) => p.citizenId === str(f, "citizenId"),
              )
            )
              e.citizenId = ["CCCD đã tồn tại."];
            return e;
          }}
          save={async (f) => {
            const p: CreateLecturerRequest = {
              fullName: str(f, "fullName"),
              dateOfBirth: str(f, "dateOfBirth") || undefined,
              citizenId: str(f, "citizenId") || undefined,
              email: normalizeEmail(str(f, "email")),
              phone: str(f, "phone"),
              facultyId: +str(f, "facultyId"),
              reason: str(f, "reason"),
            };
            const id = Math.max(0, ...a.data.teachers.map((t) => t.id)) + 1;
            let seq = id,
              code = "";
            do {
              code = `GV${String(seq++).padStart(3, "0")}`;
            } while (auth.users.some((u) => u.username === code));
            await auth.provisionAccounts([
              {
                username: code,
                fullName: p.fullName,
                role: "LECTURER",
                email: p.email,
              },
            ]);
            a.setData((d) => ({
              ...d,
              teachers: [
                ...d.teachers,
                {
                  id,
                  lecturerCode: code,
                  fullName: p.fullName,
                  email: p.email!,
                  phone: p.phone!,
                  facultyName: faculties.find((x) => x.value === p.facultyId)!
                    .label,
                  status: "ACTIVE",
                },
              ],
            }));
            a.setPeople((old) => ({
              ...old,
              [code]: {
                citizenId: p.citizenId,
                dateOfBirth: p.dateOfBirth,
                reason: p.reason,
                emailStatus: "Chưa gửi — chưa kết nối dịch vụ email",
              },
            }));
            log(
              "Admin học vụ",
              "Tạo giảng viên",
              `${code} · ${p.reason ?? ""}`,
            );
            setDialog(null);
            notify(
              `Đã tạo giảng viên ${code} và tài khoản. Email cấp tài khoản chưa được gửi.`,
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
          <h1>Quản lý giảng viên</h1>
          <p>Tra cứu hồ sơ theo mã, khoa và trạng thái hoạt động.</p>
        </div>
        <button className="btn primary" onClick={add}>
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
                                    "Email cấp tài khoản",
                                    a.people[t.lecturerCode]?.emailStatus,
                                  ],
                                ]}
                              />
                              <ResendAccountEmail username={t.lecturerCode} />
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
                      onClick={() => editEmail(t)}
                      aria-label={`Cập nhật email ${t.lecturerCode}`}
                    >
                      {t.email || "Bổ sung email"}
                    </button>
                    {lecturerEmailError(
                      t.email ?? "",
                      t.lecturerCode,
                      a.data.teachers,
                      auth.users,
                    ) && (
                      <span
                        className="field-error"
                        style={{ display: "block" }}
                      >
                        {lecturerEmailError(
                          t.email ?? "",
                          t.lecturerCode,
                          a.data.teachers,
                          auth.users,
                        )}
                      </span>
                    )}
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
