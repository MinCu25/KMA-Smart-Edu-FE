import { useAuth } from "../context/AuthContext";
import { useManagement } from "../context/ManagementContext";
import { useAcademic, today } from "../context/AcademicContext";
import { useDemoData } from "../context/DemoDataContext";
import { teachingHistory } from "../data/mock/teachingHistory";
import { demoRosters } from "../data/mock/management";
export function useTeaching() {
  const m = useManagement(),
    a = useAcademic(),
    { registrations } = useDemoData(),
    { session } = useAuth();
  const lecturerCode = session?.user.username;
  const history = teachingHistory.find((t) => t.id === m.teachingTerm);
  const term =
    m.teachingTerm === "current"
      ? m.semester
      : (a.terms.find((t) => String(t.id) === m.teachingTerm) ?? m.semester);
  const liveClasses = a.data.classes.filter(
    (c) =>
      c.semesterCode === term.semesterCode &&
      c.status !== "CANCELLED" &&
      a.data.teachers.some(
        (t) =>
          t.lecturerCode === lecturerCode &&
          t.id === a.classMeta[c.id]?.lecturerId,
      ),
  );
  const currentClasses = liveClasses.map((c) => ({
    id: c.moduleClassCode,
    subject: c.subjectCode,
    teacher: lecturerCode ?? "",
    room: c.schedules[0]?.roomCode ?? "",
    day: `Thứ ${c.schedules[0]?.dayOfWeek ?? 2}`,
    start: String(c.schedules[0]?.lessonOrderStart ?? 0),
    end: String(c.schedules[0]?.lessonOrderEnd ?? 0),
    capacity: String(c.maxCapacity),
    status: c.status === "OPEN" ? "Đang mở" : "Tạm đóng",
  }));
  const classes = history
    ? history.classes.filter((c) => c.teacher === lecturerCode)
    : currentClasses;
  const selected = classes.some((c) => c.id === m.teachingClass)
    ? m.teachingClass
    : (classes[0]?.id ?? "");
  const rosters: Record<string, string[]> = { ...demoRosters };
  for (const [username, ids] of Object.entries(registrations)) {
    for (const code of Object.keys(rosters))
      rosters[code] = rosters[code].filter((x) => x !== username);
    for (const code of ids)
      rosters[code] = [...(rosters[code] ?? []), username];
  }
  return {
    ...m,
    lecturerCode,
    classes,
    liveClasses,
    selected,
    setSelected: m.setTeachingClass,
    periods: [
      { id: "current", name: m.term.name },
      ...a.terms
        .filter((t) => t.id !== m.semester.id)
        .map((t) => ({ id: String(t.id), name: t.semesterName })),
      ...teachingHistory,
    ],
    periodName: history?.name ?? term.semesterName,
    rosters: history?.rosters ?? rosters,
    scores: history?.grades ?? m.grades,
    readonly: !!history || !!term.lockedGrade || term.endDate! < today(),
    historical: !!history,
    changePeriod: (id: string) => {
      m.setTeachingTerm(id);
      m.setTeachingClass("");
    },
  };
}
