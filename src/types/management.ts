// UI view model / form state. Use types/dto.ts at service boundaries.
export type Entity = "teachers" | "subjects" | "classes" | "rooms" | "accounts";
export type RecordRow = { id: string; [key: string]: string };
export type AuditEntry = {
  id: string;
  time: string;
  actor: string;
  action: string;
  detail: string;
};
export type Grade = { tp1: string; tp2: string; note: string };
export type Term = { name: string; registration: boolean; locked: boolean };
