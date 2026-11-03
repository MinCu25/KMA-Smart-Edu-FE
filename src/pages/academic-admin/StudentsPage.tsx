import { ResendAccountEmail } from "../../components/academic-admin/ResendAccountEmail";
import { transitionStudent } from "../../services/academic/domain";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAcademic } from "../../context/AcademicContext";
import { useManagement } from "../../context/ManagementContext";
import {
  Detail,
  EditForm,
  Pager,
  str,
} from "../../components/academic-admin/AcademicUI";
import { studentView } from "../../services/adapters";
import { Badge, Card } from "../../components/common";
import { useStudentManagement } from "../../hooks/useStudentManagement";
import { useUI } from "../../context/UIContext";
export default function StudentsPage() {
  const {
    majorFilter,
    setMajorFilter,
    studentForm,
    studentSearch,
    setStudentSearch,
    setApplied,
    classFilter,
    setClassFilter,
    statusFilter,
    setStatusFilter,
    cohortFilter,
    setCohortFilter,
    studentData,
    filteredStudents,
    updateStudents,
  } = useStudentManagement();
  const { setDialog, notify } = useUI();
  const [page, setPage] = useState(0);
  const auth = useAuth(),
    a = useAcademic(),
    { log } = useManagement();
  return (
    <>
      <div className="page-title">
        <h1>Quản lý sinh viên</h1>
        <button className="btn primary" onClick={() => studentForm()}>
          Thêm mới sinh viên
        </button>
      </div>
      <Card className="admin-card">
        <form
          className="admin-filter"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            setApplied({
              search: studentSearch,
              className: classFilter,
              status: statusFilter,
              cohort: cohortFilter,
              major: majorFilter,
            });
          }}
        >
          <label>
            Từ khóa (MSSV hoặc họ tên)
            <input
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </label>
          <label>
            Lớp
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">Tất cả lớp</option>
              {[...new Set(studentData.map((s) => s.className))].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Khóa
            <select
              value={cohortFilter}
              onChange={(e) => setCohortFilter(e.target.value)}
            >
              <option value="">Tất cả khóa</option>
              {[...new Set(studentData.map((s) => s.dto.cohortCode))].map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Ngành
            <select
              aria-label="Ngành"
              value={majorFilter}
              onChange={(e) => setMajorFilter(e.target.value)}
            >
              <option value="">Tất cả ngành</option>
              {[...new Set(studentData.map((s) => s.dto.majorName))].map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Trạng thái
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option>Đang hoạt động</option>
              <option>Ngừng hoạt động</option>
              <option>Đã xóa</option>
            </select>
          </label>
          <button className="btn primary">Tìm kiếm</button>
        </form>
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                {[
                  "MSSV",
                  "Họ và tên",
                  "Lớp",
                  "Ngành",
                  "Khóa",
                  "Trạng thái",
                  "Thao tác",
                ].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.slice(page * 10, page * 10 + 10).map((s) => (
                <tr key={s.id}>
                  <td>
                    <b>{s.id}</b>
                  </td>
                  <td>{s.name}</td>
                  <td>{s.className}</td>
                  <td>{s.major}</td>
                  <td>{s.cohort}</td>
                  <td>
                    <Badge
                      tone={
                        s.status === "Đang hoạt động"
                          ? "green"
                          : s.status === "Bảo lưu"
                            ? "yellow"
                            : "red"
                      }
                    >
                      {s.status}
                    </Badge>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn"
                        onClick={() =>
                          setDialog({
                            title: "Thông tin sinh viên",
                            content: (
                              <>
                                <Detail
                                  items={[
                                    ["MSSV", s.id],
                                    ["Họ tên", s.name],
                                    ["Ngày sinh", s.dto.dateOfBirth],
                                    ["CCCD", s.dto.citizenId ?? a.people[s.id]?.citizenId],
                                    ["Email", s.dto.email],
                                    ["Số điện thoại", s.dto.phone],
                                    ["Ngành", s.major],
                                    ["Khóa", s.cohort],
                                    ["Lớp hành chính", s.className],
                                    ["Hệ đào tạo", s.dto.trainingType],
                                    ["Điểm đầu vào", s.dto.entranceScore],
                                    ["GPA mục tiêu", s.dto.targetGpa],
                                    [
                                      "Cảnh báo học vụ",
                                      s.dto.academicWarningStatus,
                                    ],
                                    ["Trạng thái", s.status],
                                    ["Lý do", s.dto.statusReason],
                                    ["Ngày tạo hồ sơ", s.dto.createdAt],
                                    [
                                      "Tài khoản",
                                      auth.users.find(
                                        (u) => u.username === s.id,
                                      )?.status ?? "Chưa có tài khoản",
                                    ],
                                    [
                                      "Email cấp tài khoản",
                                      a.people[s.id]?.emailStatus,
                                    ],
                                  ]}
                                />
                                <ResendAccountEmail username={s.id} />
                              </>
                            ),
                          })
                        }
                      >
                        Xem
                      </button>
                      <button
                        className="btn"
                        disabled={s.dto.activityStatus === "DELETED"}
                        onClick={() => studentForm(s)}
                      >
                        Sửa
                      </button>
                      <button
                        className="btn"
                        disabled={s.dto.activityStatus === "DELETED"}
                        onClick={() => {
                          const activate = s.dto.activityStatus !== "STUDYING";
                          setDialog({
                            title: `${activate ? "Tái kích hoạt" : "Vô hiệu hóa"} ${s.id}`,
                            content: (
                              <EditForm
                                fields={[
                                  {
                                    key: "reason",
                                    label: "Lý do",
                                    required: true,
                                  },
                                  {
                                    key: "confirmed",
                                    label:
                                      "Xác nhận đồng bộ trạng thái tài khoản",
                                    required: true,
                                    options: [
                                      {
                                        value: "yes",
                                        label: activate
                                          ? "Kích hoạt hồ sơ và mở khóa tài khoản"
                                          : "Vô hiệu hóa hồ sơ và khóa đăng nhập",
                                      },
                                    ],
                                  },
                                ]}
                                close={() => setDialog(null)}
                                submit="Xác nhận"
                                save={(f) => {
                                  const next = transitionStudent(
                                    s.dto,
                                    auth.users,
                                    activate,
                                    str(f, "reason"),
                                  );
                                  updateStudents(
                                    studentData.map((t) =>
                                      t.id === s.id
                                        ? studentView(next.student)
                                        : t,
                                    ),
                                  );
                                  auth.setUsers(next.users);
                                  log(
                                    "Admin học vụ",
                                    activate
                                      ? "Tái kích hoạt sinh viên"
                                      : "Vô hiệu hóa sinh viên",
                                    `${s.id} · ${str(f, "reason")}`,
                                  );
                                  setDialog(null);
                                  notify(
                                    `Đã ${activate ? "tái kích hoạt" : "vô hiệu hóa"} sinh viên ${s.id} và đồng bộ tài khoản liên kết.`,
                                  );
                                }}
                              >
                                <p>
                                  Hồ sơ, điểm và lịch sử học tập được giữ
                                  nguyên. Cảnh báo hiện tại:{" "}
                                  {s.dto.academicWarningStatus || "Không có"}.
                                </p>
                              </EditForm>
                            ),
                          });
                        }}
                      >
                        {s.dto.activityStatus === "STUDYING"
                          ? "Vô hiệu hóa"
                          : "Tái kích hoạt"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredStudents.length && (
            <p className="empty-state">Không tìm thấy sinh viên phù hợp.</p>
          )}
        </div>
        <Pager total={filteredStudents.length} page={page} setPage={setPage} />
      </Card>
    </>
  );
}
