import { useAuth } from "../context/AuthContext";
import type { StudentSearchRequest } from "../types/dto";
import { useAcademic } from "../context/AcademicContext";
import { useState } from "react";
import { useDemoData } from "../context/DemoDataContext";
import { useUI } from "../context/UIContext";
import { StudentForm } from "../components/academic-admin/StudentForm";
import type { Student } from "../types/student";
export function useStudentManagement() {
  const { users } = useAuth();
  const { adminClasses: administrativeClasses } = useAcademic();
  const { studentData, updateStudents } = useDemoData();
  const { setDialog, notify } = useUI();
  const [studentSearch, setStudentSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cohortFilter, setCohortFilter] = useState("");
  const [majorFilter, setMajorFilter] = useState("");
  const [applied, setApplied] = useState({
    search: "",
    className: "",
    status: "",
    cohort: "",
    major: "",
  });
  function studentForm(student?: Student) {
    setDialog({
      title: student ? "Cập nhật thông tin sinh viên" : "Thêm mới sinh viên",
      content: (
        <StudentForm
          student={student}
          studentData={studentData}
          onSave={updateStudents}
          onClose={() => setDialog(null)}
          onNotify={notify}
        />
      ),
    });
  }
  const searchRequest: StudentSearchRequest = {
    keyword: applied.search,
    cohortId: applied.cohort ? (applied.cohort === "K2026" ? 1 : 2) : undefined,
    classId: administrativeClasses.find(
      (c) => c.className === applied.className,
    )?.id,

  };
  const filteredStudents = studentData.filter(
    (s) =>
      (s.dto.studentCode + " " + s.dto.fullName)
        .toLowerCase()
        .includes((searchRequest.keyword ?? "").toLowerCase()) &&
      (!applied.major || s.dto.majorName === applied.major) &&
      (!searchRequest.classId ||
        s.dto.className ===
          administrativeClasses.find((c) => c.id === searchRequest.classId)
            ?.className) &&
      (!applied.cohort || s.dto.cohortCode === applied.cohort) &&
      (!applied.status ||
        users.find(u => u.username === s.dto.studentCode && u.role === "STUDENT")?.status ===
          ({ "Đang hoạt động": "ACTIVE", "Đã khóa": "LOCKED", "Vô hiệu hóa": "DISABLED" } as Record<string, string>)[applied.status]),
  );
  return {
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
  };
}
