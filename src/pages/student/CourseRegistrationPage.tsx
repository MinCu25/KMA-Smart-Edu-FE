import { useDemoData } from "../../context/DemoDataContext";
import { useState } from "react";
import { useManagement } from "../../context/ManagementContext";
import { Badge, Notice, Card } from "../../components/common";
import { useEnrollment } from "../../hooks/useEnrollment";
import { allCourses } from "../../data/mock/courses";
export default function CourseRegistrationPage() {
  const { term, semester } = useManagement();
  const {
    alert,
    condition,
    register,
    showReason,
    ids,
    credits,
    selected,
    cancel,
    inspectedId,
    occupancy,
  } = useEnrollment();
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("");
  const {courses:allCourses}=useDemoData();
  const courses = allCourses.filter((c) => c.dto.status === "OPEN" && c.dto.semesterCode===semester.semesterCode);
  const subjects = [
    ...new Map(courses.map((c) => [c.dto.subjectCode, c.name])).entries(),
  ];
  const filtered = courses.filter(
    (c) =>
      (!subject || c.dto.subjectCode === subject) &&
      (!status || condition(c) === status) &&
      `${c.id} ${c.name} ${c.teacher}`
        .toLocaleLowerCase("vi")
        .includes(search.trim().toLocaleLowerCase("vi")),
  );
  function resetFilters() {
    setSearch("");
    setSubject("");
    setStatus("");
  }
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Đăng ký học phần</h1>
          <p>
            {semester.semesterName} · Đăng ký: {semester.registrationStart} –{" "}
            {semester.registrationEnd}
          </p>
        </div>
        <Badge>
          {term.registration
            ? "Đang trong thời gian đăng ký"
            : "Đã đóng đăng ký"}
        </Badge>
      </div>
      {alert && <Notice tone={alert.tone}>{alert.text}</Notice>}
      <div className="register-layout">
        <Card title="Lớp học phần đang mở" className="open-courses">
          <div className="course-filters">
            <label>
              Tìm lớp / học phần
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Mã lớp, tên môn, giảng viên…"
              />
            </label>
            <label>
              Học phần
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="">Tất cả học phần</option>
                {subjects.map(([code, name]) => (
                  <option value={code} key={code}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Điều kiện
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Tất cả điều kiện</option>
                <option value="available">Đủ điều kiện</option>
                <option value="registered">Đã đăng ký</option>
                <option value="missing">Thiếu tiên quyết</option>
                <option value="conflict">Trùng lịch</option>
                <option value="full">Lớp đã đủ</option>
              </select>
            </label>
            <button className="btn" onClick={resetFilters}>
              Xóa bộ lọc
            </button>
          </div>
          <p className="filter-count">
            Hiển thị {filtered.length}/{courses.length} lớp học phần
          </p>
          <div className="table-scroll">
            <table className="registration-table">
              <thead>
                <tr>
                  <th>Mã lớp</th>
                  <th>Học phần</th>
                  <th>TC</th>
                  <th>Giảng viên</th>
                  <th>Lịch học</th>
                  <th>Sĩ số</th>
                  <th>Điều kiện</th>
                  <th>
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const state = condition(c);
                  return (
                    <tr
                      key={c.id}
                      className={
                        inspectedId === c.id
                          ? `condition-row-${state === "missing" ? "yellow" : state === "conflict" || state === "full" ? "red" : "green"}`
                          : ""
                      }
                    >
                      <td>
                        <b>{c.id}</b>
                      </td>
                      <td>{c.name}</td>
                      <td>{c.credits}</td>
                      <td>{c.teacher}</td>
                      <td>
                        T{c.day} - tiết {c.start}-{c.end}
                      </td>
                      <td className="nowrap">
                        {occupancy(c)}/{c.capacity}
                      </td>
                      <td>
                        <Badge
                          tone={
                            state === "missing"
                              ? "yellow"
                              : state === "conflict" || state === "full"
                                ? "red"
                                : "green"
                          }
                        >
                          {state === "registered"
                            ? "Đã đăng ký"
                            : state === "missing"
                              ? "Thiếu tiên quyết"
                              : state === "conflict"
                                ? "Trùng lịch"
                                : state === "full"
                                  ? "Lớp đã đủ"
                                  : "Đủ điều kiện"}
                        </Badge>
                      </td>
                      <td>
                        <button
                          className="btn primary"
                          disabled={state === "registered"}
                          onClick={() =>
                            !term.registration || state !== "available"
                              ? showReason(c)
                              : register(c)
                          }
                        >
                          {state === "registered"
                            ? "Đã đăng ký"
                            : !term.registration || state !== "available"
                              ? "Xem lý do"
                              : "Đăng ký"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filtered.length && (
              <p className="empty-state">
                Không có lớp phù hợp. Hãy đổi hoặc xóa bộ lọc.
              </p>
            )}
          </div>
        </Card>
        <aside className="registration-side">
          <Card title="Tín chỉ kỳ này">
            <div className="credit-value">
              {credits}
              <span>/ tối đa 24 (tối thiểu 12)</span>
            </div>
            <div className="progress-track">
              <i style={{ width: `${Math.min(100, (credits / 24) * 100)}%` }} />
            </div>
          </Card>
          <Card title={`Đã đăng ký (${selected.length} học phần)`}>
            <ul className="selected-courses">
              {selected.map((c) => (
                <li key={c.id}>
                  <span>
                    <b>{c.id}</b> · {c.name}
                  </span>
                  <button
                    className="btn"
                    onClick={() => cancel(c, resetFilters)}
                  >
                    Hủy
                  </button>
                </li>
              ))}
            </ul>
            {!selected.length && (
              <p className="empty-state">Chưa đăng ký học phần nào.</p>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
