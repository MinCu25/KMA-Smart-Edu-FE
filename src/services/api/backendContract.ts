import { API_URLS } from "../../../docs/fe-api-contract";
export * from "../../../docs/fe-api-contract";

export const ENDPOINTS = {
  admissionConfiguration: {
    method: "GET",
    url: "/api/v1/student-admissions/configuration",
  },
  admissionPlanCreate: {
    method: "POST",
    url: "/api/v1/student-admissions/plans",
  },
  admissionPlanImport: {
    method: "POST",
    url: "/api/v1/student-admissions/plans/import",
  },
  admissionPlanGet: {
    method: "GET",
    url: (id: number) => `/api/v1/student-admissions/plans/${id}`,
  },
  admissionApplicants: {
    method: "POST",
    url: (id: number) => `/api/v1/student-admissions/plans/${id}/applicants`,
  },
  admissionAllocation: {
    method: "POST",
    url: (id: number) =>
      `/api/v1/student-admissions/plans/${id}/allocation/preview`,
  },
  admissionAllocationAdjust: {
    method: "PATCH",
    url: (id: number) => `/api/v1/student-admissions/plans/${id}/allocation`,
  },
  admissionPlanConfirm: {
    method: "POST",
    url: (id: number) => `/api/v1/student-admissions/plans/${id}/confirm`,
  },
  admissionNotifications: {
    method: "GET",
    url: (id: number) => `/api/v1/student-admissions/plans/${id}/notifications`,
  },
  admissionPrepareClasses: {
    method: "POST",
    url: "/api/v1/administrative-classes/from-admission-plan",
  },
  authLogin: { method: "POST", url: API_URLS.auth.login },
  authLogout: { method: "POST", url: API_URLS.auth.logout },
  authChangePassword: { method: "POST", url: API_URLS.auth.changePassword },
  adminUsersSearch: { method: "GET", url: API_URLS.adminUsers.list },
  adminUserLock: { method: "POST", url: API_URLS.adminUsers.lock },
  adminUserUnlock: { method: "POST", url: API_URLS.adminUsers.unlock },
  adminUserResetPassword: {
    method: "POST",
    url: API_URLS.adminUsers.resetPassword,
  },
  studentsSearch: { method: "GET", url: API_URLS.students.list },
  studentGet: { method: "GET", url: API_URLS.students.detail },
  studentCreate: { method: "POST", url: API_URLS.students.create },
  studentUpdate: { method: "PUT", url: API_URLS.students.update },
  studentResendNotification: {
    method: "POST",
    url: API_URLS.students.resendAccountNotification,
  },
  myStudentGet: { method: "GET", url: API_URLS.students.me },
  myStudentUpdate: { method: "PATCH", url: API_URLS.students.updateMe },
  admissionPreview: { method: "POST", url: API_URLS.students.admissionPreview },
  admissionAdjustAssignment: {
    method: "PUT",
    url: API_URLS.students.admissionAssignment,
  },
  admissionConfirm: { method: "POST", url: API_URLS.students.admissionConfirm },
  lecturersSearch: { method: "GET", url: API_URLS.lecturers.list },
  lecturerGet: { method: "GET", url: API_URLS.lecturers.detail },
  lecturerCreate: { method: "POST", url: API_URLS.lecturers.create },
  lecturerResendNotification: {
    method: "POST",
    url: API_URLS.lecturers.resendAccountNotification,
  },
  subjectsSearch: { method: "GET", url: API_URLS.subjects.list },
  subjectGet: { method: "GET", url: API_URLS.subjects.detail },
  subjectCreate: { method: "POST", url: API_URLS.subjects.create },
  subjectUpdate: { method: "PUT", url: API_URLS.subjects.update },
  subjectDeactivate: { method: "POST", url: API_URLS.subjects.deactivate },
  subjectDelete: { method: "DELETE", url: API_URLS.subjects.delete },
  subjectSetPrerequisites: {
    method: "POST",
    url: API_URLS.subjects.prerequisites,
  },
  semestersSearch: { method: "GET", url: API_URLS.semesters.list },
  semesterGet: { method: "GET", url: API_URLS.semesters.detail },
  semesterCreate: { method: "POST", url: API_URLS.semesters.create },
  semesterUpdate: { method: "PUT", url: API_URLS.semesters.update },
  openingSubjects: { method: "GET", url: API_URLS.semesters.openingSubjects },
  moduleClassesCreateBatch: {
    method: "POST",
    url: API_URLS.semesters.createModuleClassesBatch,
  },
  moduleClassesSearch: { method: "GET", url: API_URLS.moduleClasses.list },
  moduleClassGet: { method: "GET", url: API_URLS.moduleClasses.detail },
  moduleClassUpdate: { method: "PATCH", url: API_URLS.moduleClasses.update },
  moduleClassCancel: { method: "POST", url: API_URLS.moduleClasses.cancel },
  roomsSearch: { method: "GET", url: API_URLS.rooms.list },
  roomGet: { method: "GET", url: API_URLS.rooms.detail },
  roomCreate: { method: "POST", url: API_URLS.rooms.create },
  roomUpdate: { method: "PUT", url: API_URLS.rooms.update },
  roomStatus: { method: "PATCH", url: API_URLS.rooms.changeStatus },
  roomDelete: { method: "DELETE", url: API_URLS.rooms.delete },
} as const;
