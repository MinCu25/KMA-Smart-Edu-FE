import { repairDemoStudentAccounts } from "../services/mock/studentAccountRepair";
import {
  targetForStudent,
  setStudentTarget,
} from "../services/academic/studentAcademic";
import { missingPrerequisites } from "../services/academic/domain";
import { gradeResponses } from "../data/mock/grades";
import { useAcademic } from "./AcademicContext";
import { useAuth } from "./AuthContext";
import { useManagement } from "./ManagementContext";
import { courseView } from "../services/adapters";
import { readStorage } from "../services/mock/storage";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { usePersistentState } from "../hooks/usePersistentState";
import { allCourses, initialCourses } from "../data/mock/courses";
import { students } from "../data/mock/students";
import type { Student } from "../types/student";

function useDemoDataState() {
  const a = useAcademic(),
    auth = useAuth(),
    { semester } = useManagement();
  const username = auth.session?.user.username ?? "";
  const [registrations, setRegistrations] = usePersistentState<
    Record<string, string[]>
  >("kma-registrations-by-user-v1", {
    CT080101: readStorage<string[]>(
      "kma-dto-v2-courses",
      initialCourses.map((c) => c.id),
    ),
  });
  const ids = registrations[username] ?? [];
  function saveIds(next: string[]) {
    setRegistrations((old) => ({ ...old, [username]: next }));
  }
  const courses = a.data.classes.map(courseView).map((c) => ({
    ...c,
    missing:
      missingPrerequisites(
        a.data.subjects.find((s) => s.subjectCode === c.dto.subjectCode),
        username,
        gradeResponses,
      ).join(", ") || undefined,
  }));
  const [studentData, updateStudents] = usePersistentState<Student[]>(
    "kma-dto-v2-students",
    students,
  );
  useEffect(() => {
    auth.setUsers(old => repairDemoStudentAccounts(old, studentData));
  }, [studentData, auth.setUsers]);
  // The profile owns GPA: switching users cannot reuse another student's target.
  const target = targetForStudent(studentData, username);
  function setTarget(value: string) {
    updateStudents((old) => setStudentTarget(old, username, value));
  }
  const selected = courses.filter(
    (course) =>
      ids.includes(course.id) &&
      course.dto.semesterCode === semester.semesterCode,
  );
  const credits = selected.reduce((total, course) => total + course.credits, 0);
  return {
    courses,
    registrations,
    ids,
    saveIds,
    target,
    setTarget,
    studentData,
    updateStudents,
    selected,
    credits,
  };
}

const DemoDataContext = createContext<ReturnType<
  typeof useDemoDataState
> | null>(null);

export function DemoDataProvider({ children }: { children: ReactNode }) {
  const state = useDemoDataState();
  return (
    <DemoDataContext.Provider value={state}>
      {children}
    </DemoDataContext.Provider>
  );
}

export function useDemoData() {
  const context = useContext(DemoDataContext);
  if (!context)
    throw new Error("useDemoData phải được dùng bên trong DemoDataProvider.");
  return context;
}
