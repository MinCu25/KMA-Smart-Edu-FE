import { semesterResponse } from "../data/mock/dtoFixtures";
import type { SemesterResponse } from "../types/dto";
import { createContext, useContext, useState, type ReactNode } from "react";
import { usePersistentState } from "../hooks/usePersistentState";
import { managementSeed } from "../data/mock/management";
import type { AuditEntry, Grade, Term } from "../types/management";
function useStateModel() {
  const [teachingTerm, setTeachingTerm] = useState("current");
  const [teachingClass, setTeachingClass] = useState("");
  const [records, setRecords] = usePersistentState(
    "kma-management-dto-v3",
    managementSeed,
  );
  const [semester, setSemester] = usePersistentState<SemesterResponse>(
    "kma-semester-dto-v3",
    semesterResponse,
  );
  const [registrationPublished, setRegistrationPublished] = usePersistentState(
    "kma-registration-published-v3",
    true,
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const term: Term = {
    name: semester.semesterName,
    locked: semester.lockedGrade === true,
    registration:
      registrationPublished &&
      !!semester.registrationStart &&
      !!semester.registrationEnd &&
      today >= semester.registrationStart &&
      today <= semester.registrationEnd,
  };
  function setTerm(next: Term) {
    setSemester((old) => ({
      ...old,
      semesterName: next.name,
      lockedGrade: next.locked,
    }));
    setRegistrationPublished(next.registration);
  }
  const [grades, setGrades] = usePersistentState<
    Record<string, Record<string, Grade>>
  >("kma-grades-dto-v2", {});
  const [audit, setAudit] = usePersistentState<AuditEntry[]>(
    "kma-audit-v1",
    [],
  );
  const [permissions, setPermissions] = usePersistentState<
    Record<string, boolean>
  >("kma-permissions-v1", {});
  const [settings, setSettings] = usePersistentState("kma-settings-v1", {
    name: "KMA Smart Edu",
    email: "daotao@kma.edu.vn",
    maxCredits: "24",
  });
  function log(actor: string, action: string, detail: string) {
    setAudit((old) =>
      [
        {
          id:
            globalThis.crypto?.randomUUID?.() ??
            `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          time: new Date().toISOString(),
          actor,
          action,
          detail,
        },
        ...old,
      ].slice(0, 200),
    );
  }
  return {
    teachingTerm,
    setTeachingTerm,
    teachingClass,
    setTeachingClass,
    records,
    setRecords,
    term,
    semester,
    setSemester,
    setTerm,
    grades,
    setGrades,
    audit,
    log,
    permissions,
    setPermissions,
    settings,
    setSettings,
  };
}
const Context = createContext<ReturnType<typeof useStateModel> | null>(null);
export function ManagementProvider({ children }: { children: ReactNode }) {
  const value = useStateModel();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useManagement() {
  const value = useContext(Context);
  if (!value) throw new Error("ManagementProvider required");
  return value;
}
