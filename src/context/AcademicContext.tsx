import { reconcileScheduledRooms } from "../services/academic/rooms";
import {
  semesterFormName,
  nextSemesterIdentity,
} from "../utils/semesterValidation";
import { useAuth } from "./AuthContext";
import {
  syncLecturerAccounts,
  repairSeedLecturerEmails,
} from "../services/academic/lecturers";
import {
  normalizeSubjects,
  syncClasses,
  type ClassIdentity,
} from "../services/academic/domain";
import type { SetStateAction } from "react";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { usePersistentState } from "../hooks/usePersistentState";
import { useManagement } from "./ManagementContext";
import {
  administrativeClasses,
  lecturerResponses,
  subjectResponses,
  moduleClassResponses,
  userResponses,
  semesterResponse,
} from "../data/mock/dtoFixtures";
import { roomCatalog } from "../data/mock/catalogs";
import type {
  LecturerResponse,
  SubjectResponse,
  ModuleClassResponse,
  UserInfoResponse,
  SemesterResponse,
} from "../types/dto";
export type RoomRecord = {
  campus?: string;
  id: number;
  roomCode: string;
  roomName: string;
  buildingCode: string;
  roomNumber: string;
  roomType: string;
  capacity: number;
  status: "ACTIVE" | "INACTIVE";
  deleted?: boolean;
};
export type PersonExtra = {
  citizenId?: string;
  dateOfBirth?: string;
  reason?: string;
  emailStatus?: string;
};
export type DemoLecturer = LecturerResponse & {
  recruitmentYear?: number | null;
  facultyId?: number | null;
  teachingSubjects?: Pick<
    SubjectResponse,
    "id" | "subjectCode" | "subjectName" | "credits"
  >[];
};
export type AcademicModel = {
  teachers: DemoLecturer[];
  subjects: SubjectResponse[];
  classes: ModuleClassResponse[];
  accounts: UserInfoResponse[];
};
function useModel() {
  const m = useManagement();
  const auth = useAuth();
  const [adminClasses, setAdminClasses] = usePersistentState(
    "kma-admin-classes-v1",
    administrativeClasses,
  );
  const [storedData, setStoredData] = usePersistentState<AcademicModel>(
    "kma-dto-management-v3",
    {
      teachers: lecturerResponses,
      subjects: subjectResponses,
      classes: moduleClassResponses,
      accounts: userResponses,
    },
  );
  const [rooms, setRooms] = usePersistentState<RoomRecord[]>(
    "kma-academic-rooms-v1",
    roomCatalog.map((r, i) => ({
      ...r,
      roomName: `Phòng ${r.roomCode}`,
      roomType: i === 1 ? "COMPUTER" : "LECTURE",
      capacity: [60, 40, 80][i],
      status: "ACTIVE",
    })),
  );
  useEffect(() => {
    const migrated = reconcileScheduledRooms(rooms, storedData.classes);
    if (!migrated) return;
    setRooms(migrated.rooms);
    setStoredData((old) => ({ ...old, classes: migrated.classes }));
  }, [rooms, storedData.classes, setRooms, setStoredData]);
  const [terms, setTerms] = usePersistentState<SemesterResponse[]>(
    "kma-academic-terms-v1",
    [m.semester],
  );
  const [semesterSequence, setSemesterSequence] = usePersistentState(
    "kma-semester-sequence-v1",
    0,
  );
  function allocateSemesterCode() {
    const next = nextSemesterIdentity(terms, semesterSequence);
    setSemesterSequence(next.sequence);
    return next.code;
  }
  useEffect(() => {
    const renamed = terms.map((t) => ({
      ...t,
      semesterName: semesterFormName(t.semesterName),
    }));
    if (renamed.some((t, i) => t.semesterName !== terms[i].semesterName))
      setTerms(renamed);
    const name = semesterFormName(m.semester.semesterName);
    if (name !== m.semester.semesterName)
      m.setSemester({ ...m.semester, semesterName: name });
  }, [terms, m.semester]);
  // Backend planning results are separate from local curricula; never infer retake demand from class size.
  const [openingDemand, setOpeningDemand] = usePersistentState<
    Record<number, import("../types/dto").OpeningSubjectResponse[]>
  >("kma-opening-demand-v1", {});
  const [curricula, setCurricula] = usePersistentState<
    import("../types/dto").CurriculumResponse[]
  >("kma-curricula-v1", []);
  const [enrollmentHistory, setEnrollmentHistory] = usePersistentState<
    string[]
  >(
    "kma-enrollment-history-v1",
    storedData.classes
      .filter((c) => c.currentSize > 0)
      .map((c) => c.moduleClassCode),
  );
  const [deletedSubjects, setDeletedSubjects] = usePersistentState<number[]>(
    "kma-deleted-subjects-v1",
    [],
  );
  const [people, setPeople] = usePersistentState<Record<string, PersonExtra>>(
    "kma-person-extra-v1",
    {},
  );
  const [classMeta, setClassMeta] = usePersistentState<ClassIdentity>(
    "kma-class-meta-v1",
    {},
  );
  const identities: ClassIdentity = { ...classMeta };
  for (const c of storedData.classes) {
    if (c.lecturerId === null) {
      delete identities[c.id];
      continue;
    }
    if (c.lecturerId !== undefined) {
      identities[c.id] = {
        ...identities[c.id],
        lecturerId: c.lecturerId,
        roomType:
          identities[c.id]?.roomType ??
          rooms.find((r) => r.roomCode === c.schedules[0]?.roomCode)
            ?.roomType ??
          "LECTURE",
      };
      continue;
    }
    if (identities[c.id]) continue;
    const matches = storedData.teachers.filter(
      (t) => t.fullName === c.lecturerName,
    );
    if (matches.length === 1)
      identities[c.id] = {
        lecturerId: matches[0].id,
        roomType:
          rooms.find((r) => r.roomCode === c.schedules[0]?.roomCode)
            ?.roomType ?? "LECTURE",
      };
  }
  useEffect(() => {
    if (Object.keys(identities).length > Object.keys(classMeta).length)
      setClassMeta(identities);
  }, [storedData, classMeta]);
  useEffect(() => {
    const repaired = repairSeedLecturerEmails(
      storedData.teachers,
      lecturerResponses,
      auth.users,
    );
    if (repaired !== storedData.teachers)
      setStoredData((old) => ({ ...old, teachers: repaired }));
    auth.setUsers((old) => syncLecturerAccounts(old, repaired));
  }, [storedData.teachers, auth.users]);
  const excludedLecturerCodes: string[] = [];
  const normalizedSubjects = normalizeSubjects(storedData.subjects);
  const data: AcademicModel = {
    ...storedData,
    teachers: storedData.teachers,
    subjects: normalizedSubjects,
    classes: syncClasses(normalizedSubjects, storedData.classes),
  };
  function setData(next: SetStateAction<AcademicModel>) {
    setStoredData((old) => {
      const value = typeof next === "function" ? next(old) : next;
      const subjects = normalizeSubjects(value.subjects);
      return {
        ...value,
        subjects,
        classes: syncClasses(subjects, value.classes),
      };
    });
  }
  useEffect(() => {
    m.setRecords((old) => ({
      ...old,
      teachers: data.teachers.map((x) => ({
        id: x.lecturerCode,
        name: x.fullName,
        email: x.email,
        department: x.facultyName,
        status: x.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng hoạt động",
      })),
      subjects: data.subjects.map((x) => ({
        id: x.subjectCode,
        name: x.subjectName,
        credits: String(x.credits),
        prerequisite: x.prerequisites.map((p) => p.subjectName).join(", "),
        status: x.status === "ACTIVE" ? "Đang sử dụng" : "Ngừng sử dụng",
      })),
      classes: data.classes
        .filter(
          (x) =>
            x.semesterCode === m.semester.semesterCode &&
            x.status !== "CANCELLED",
        )
        .map((x) => ({
          id: x.moduleClassCode,
          subject: x.subjectCode,
          teacher:
            data.teachers.find((t) => t.id === identities[x.id]?.lecturerId)
              ?.lecturerCode ?? "",
          room: x.schedules[0]?.roomCode ?? "",
          day: `Thứ ${x.schedules[0]?.dayOfWeek ?? 2}`,
          start: String(x.schedules[0]?.lessonOrderStart ?? 0),
          end: String(x.schedules[0]?.lessonOrderEnd ?? 0),
          capacity: String(x.maxCapacity),
          status: x.status === "OPEN" ? "Đang mở" : "Tạm đóng",
        })),
    }));
  }, [storedData, classMeta, m.semester.semesterCode]);
  const termFor = (c: ModuleClassResponse) =>
    terms.find((t) => t.semesterCode === c.semesterCode);
  const editable = (c: ModuleClassResponse) => {
    const t = termFor(c);
    return (
      !!t &&
      !t.isLocked &&
      !!t.endDate &&
      t.endDate >= today() &&
      c.status !== "CANCELLED"
    );
  };
  return {
    allocateSemesterCode,
    nextSemesterCode: nextSemesterIdentity(terms, semesterSequence).code,
    excludedLecturerCodes,
    openingDemand,
    setOpeningDemand,
    curricula,
    setCurricula,
    enrollmentHistory,
    setEnrollmentHistory,
    adminClasses,
    setAdminClasses,
    data,
    setData,
    rooms,
    setRooms,
    terms,
    setTerms,
    deletedSubjects,
    setDeletedSubjects,
    people,
    setPeople,
    classMeta: identities,
    setClassMeta,
    termFor,
    editable,
  };
}
export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const Context = createContext<ReturnType<typeof useModel> | null>(null);
export function AcademicProvider({ children }: { children: ReactNode }) {
  const value = useModel();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAcademic() {
  const value = useContext(Context);
  if (!value) throw Error("AcademicProvider required");
  return value;
}
