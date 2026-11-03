import type { Role } from "../../types/navigation";
export const DEMO_ACCOUNTS: Record<
  Role,
  { username: string; password: string; wireRole: string }
> = {
  student: { username: "CT080101", password: "demo123", wireRole: "STUDENT" },
  lecturer: { username: "GV001", password: "demo123", wireRole: "LECTURER" },
  "academic-admin": {
    username: "hocvu",
    password: "demo123",
    wireRole: "ACADEMIC_ADMIN",
  },
  "system-admin": {
    username: "admin",
    password: "demo123",
    wireRole: "SYSTEM_ADMIN",
  },
};
export const DEMO_CREDENTIALS = DEMO_ACCOUNTS.student;
