import { savedComponents } from "../../services/academic/studentAcademic";
import { useAuth } from "../../context/AuthContext";
import { Badge, Notice, Card } from "../../components/common";
import { useState } from "react";
import type { PageProps } from "../../types/navigation";
import { useDemoData } from "../../context/DemoDataContext";
import { useManagement } from "../../context/ManagementContext";
import { useAcademic } from "../../context/AcademicContext";
import { useEnrollment } from "../../hooks/useEnrollment";
import { academicSummary } from "../../data/mock/grades";
export default function AcademicPage({ onNavigate }: PageProps) {
  const { selected, target, studentData, courses } = useDemoData();
  const { session } = useAuth();
  const { semester, grades } = useManagement();
  const { terms } = useAcademic();
  const { condition, conditionDetails } = useEnrollment();
  const username = session?.user.username ?? "";
  const student = studentData.find((s) => s.id === username)?.dto;
  const summary =
    academicSummary.studentCode === username ? academicSummary : undefined;
  const [chosenPeriod, setPeriod] = useState("");
  const periods = [
    { code: semester.semesterCode, name: semester.semesterName },
    ...(summary?.semesterGrades ?? [])
      .filter((t) => t.semesterCode !== semester.semesterCode)
      .map((t) => ({
        code: t.semesterCode,
        name:
          terms.find((x) => x.semesterCode === t.semesterCode)?.semesterName ??
          t.semesterCode,
      })),
  ];
  const period = periods.some((t) => t.code === chosenPeriod)
    ? chosenPeriod
    : semester.semesterCode;
  const current = period === semester.semesterCode;
  const past = summary?.semesterGrades.find((t) => t.semesterCode === period);
  const opened = courses.filter(
    (c) =>
      c.dto.semesterCode === semester.semesterCode && c.dto.status === "OPEN",
  );
  if (!student)
    return (
      <Card title="Học vụ cá nhân">
        Chưa có hồ sơ của tài khoản đang đăng nhập.
      </Card>
    );
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Học vụ cá nhân</h1>
          <p>Thông tin và kết quả học tập của riêng bạn.</p>
        </div>
      </div>
      {!!student.academicWarningStatus && (
        <Notice tone="yellow">{student.academicWarningStatus}</Notice>
      )}
      <Card title="Thông tin tổng quan">
        <div className="overview-info">
          {[
            ["MSSV", student.studentCode],
            ["Lớp", student.className],
            ["Ngành", student.majorName],
            ["Khóa", student.cohortCode],
            ["Hệ đào tạo", student.trainingType],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <b>{value || "—"}</b>
            </div>
          ))}
        </div>
      </Card>
      <div className="metric-grid">
        <Card>
          <span>GPA học kỳ</span>
          <strong>
            {!current ? (past?.semesterGpa?.toFixed(2) ?? "—") : "—"}
          </strong>
        </Card>
        <Card>
          <span>GPA tích lũy</span>
          <strong>{summary?.cumulativeGpa?.toFixed(2) ?? "—"} / 4.00</strong>
        </Card>
        <Card>
          <span>Tín chỉ tích lũy</span>
          <strong>
            {summary
              ? `${summary.accumulatedCredits} / ${summary.totalRequiredCredits}`
              : "—"}
          </strong>
        </Card>
        <Card>
          <span>GPA mục tiêu</span>
          <strong>
            {target === "" ? "Chưa đặt" : Number(target).toFixed(2)}
          </strong>
        </Card>
      </div>
      <Card
        title="Bảng điểm kỳ học"
        action={
          <select
            aria-label="Chọn học kỳ"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {periods.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name}
              </option>
            ))}
          </select>
        }
      >
        {current && (
          <p className="muted">
            TP1, TP2 là điểm thành phần đã lưu. Điểm tổng kết và GPA hiển thị
            khi có kết quả chính thức.
          </p>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Học phần</th>
                <th>TC</th>
                {current ? (
                  <>
                    <th>TP1</th>
                    <th>TP2</th>
                  </>
                ) : (
                  <th>Điểm quá trình</th>
                )}
                <th>Tổng kết (10)</th>
                <th>Thang 4</th>
                <th>Điểm chữ</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {current
                ? selected.map((c) => {
                    const g = savedComponents(grades, c.id, username);
                    return (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{c.credits}</td>
                        <td>{g.tp1}</td>
                        <td>{g.tp2}</td>
                        <td>—</td>
                        <td>—</td>
                        <td>—</td>
                        <td>
                          <Badge tone="blue">Đang học</Badge>
                        </td>
                      </tr>
                    );
                  })
                : past?.courses.map((g) => (
                    <tr key={g.id}>
                      <td>{g.subjectName}</td>
                      <td>{g.credits}</td>
                      <td>{g.processScore?.toFixed(1) ?? "—"}</td>
                      <td>{g.courseScore10?.toFixed(1) ?? "—"}</td>
                      <td>{g.courseScore4?.toFixed(1) ?? "—"}</td>
                      <td>{g.courseScoreLetter ?? "—"}</td>
                      <td>
                        <Badge
                          tone={
                            g.status === "COMPLETED"
                              ? "green"
                              : g.status === "FAILED"
                                ? "red"
                                : "blue"
                          }
                        >
                          {g.status === "COMPLETED"
                            ? "Đạt"
                            : g.status === "FAILED"
                              ? "Chưa đạt"
                              : "Chưa có kết quả"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {!(current ? selected.length : past?.courses.length) && (
          <div className="empty-state">Chưa có dữ liệu điểm trong kỳ này.</div>
        )}
      </Card>
      <div className="bottom-grid">
        <Card title="Học phần mở kỳ hiện tại">
          {opened.slice(0, 5).map((c) => {
            const state = condition(c);
            return (
              <div className="simple-row" key={c.id}>
                <span>
                  {c.name} · {c.id}
                </span>
                <Badge
                  tone={
                    state === "available" || state === "registered"
                      ? "green"
                      : "yellow"
                  }
                >
                  {state === "registered"
                    ? "Đã đăng ký"
                    : state === "available"
                      ? "Đủ điều kiện học phần"
                      : conditionDetails(c)}
                </Badge>
              </div>
            );
          })}
          {!opened.length && <p>Chưa có lớp học phần được công bố.</p>}
          <button
            className="text-button"
            onClick={() => onNavigate("register")}
          >
            Xem danh sách và điều kiện đăng ký →
          </button>
        </Card>
        <Card title="Đã đăng ký kỳ hiện tại">
          {selected.slice(0, 2).map((c) => (
            <div className="simple-row" key={c.id}>
              <span>{c.name}</span>
              <span>{c.credits} TC</span>
            </div>
          ))}
          {!selected.length && <p>Chưa đăng ký học phần.</p>}
          <button
            className="text-button"
            onClick={() => onNavigate("register")}
          >
            Xem tất cả học phần →
          </button>
        </Card>
      </div>
    </>
  );
}
