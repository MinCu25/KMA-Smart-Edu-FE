import { accountRole } from "../src/config/navigation";
import assert from "node:assert/strict";
import {
  createStudent,
  updateStudent,
  registerModule,
  updateProcessScore,
  changePasswordDemo,
  chatReply,
  loginDemo,
} from "../src/services/mock/dtoService";
import {
  semesterResponse,
  studentResponses,
} from "../src/data/mock/dtoFixtures";
import {
  studentImportForm,
  scoreImportForm,
} from "../src/services/api/uploads";
import { apiRequest, ApiError } from "../src/services/api/httpClient";
const created = createStudent(
  {
    fullName: "Sinh viên kiểm thử",
    citizenId: "000111222333",
    reason: "Kiểm thử tạo hồ sơ",
    majorId: 1,
    cohortId: 1,
    administrativeClassId: 1,
  },
  studentResponses,
);
assert.equal(typeof created.id, "number");
assert.notEqual(String(created.id), created.studentCode);
assert.equal(created.activityStatus, "STUDYING");
assert.throws(() =>
  createStudent(
    {
      fullName: "Test",
      citizenId: "000111222334",
      reason: "Kiểm thử scope",
      majorId: 1,
      cohortId: 2,
      administrativeClassId: 1,
    },
    studentResponses,
  ),
);
assert.equal(updateStudent(created, { targetGpa: 3.5 }).targetGpa, 3.5);
assert.equal(
  registerModule({ moduleClassId: 10 }).data?.enrollment.moduleClassCode,
  "INT1401.1",
);
assert.equal(
  updateProcessScore({
    enrollmentId: 1001,
    componentScore1: null,
    componentScore2: 0,
  }).data?.componentScore1,
  null,
);
assert.equal(
  updateProcessScore({
    enrollmentId: 1001,
    componentScore1: null,
    componentScore2: 0,
  }).data?.componentScore2,
  0,
);
assert.throws(() =>
  updateProcessScore({ enrollmentId: 1001, componentScore1: 11 }),
);
assert.throws(() =>
  changePasswordDemo({ newPassword: "123", confirmPassword: "123" }),
);
assert.throws(() => chatReply({ message: "a".repeat(2001) }, ""));
assert.equal(
  loginDemo({ username: "CT080101", password: "demo123" }).data?.user.username,
  "CT080101",
);
const file = new File(["excel"], "students.xlsx");
const form = studentImportForm({ majorId: 1, cohortId: 2, file });
assert.equal(form.get("majorId"), "1");
assert.equal(form.get("file"), file);
assert.equal(
  scoreImportForm({ moduleClassId: 10, file }).get("moduleClassId"),
  "10",
);
globalThis.fetch = async (_url, init) => {
  assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer token");
  return new Response(
    JSON.stringify({
      success: true,
      data: { id: 1 },
      timestamp: "2026-11-01T00:00:00",
    }),
    { status: 200 },
  );
};
assert.deepEqual(await apiRequest("/confirmed-path", {}, "token"), { id: 1 });
globalThis.fetch = async () =>
  new Response(
    JSON.stringify({
      success: false,
      code: 1001,
      message: "Validation",
      errors: [{ field: "fullName", message: "required" }],
    }),
    { status: 400 },
  );
await assert.rejects(
  apiRequest("/confirmed-path"),
  (e: unknown) =>
    e instanceof ApiError &&
    e.code === 1001 &&
    e.errors[0].field === "fullName",
);
globalThis.fetch = async () => Response.json(null, { status: 401 });
await assert.rejects(
  apiRequest("/confirmed-path"),
  (e: unknown) => e instanceof ApiError && e.status === 401,
);
globalThis.fetch = async () =>
  Response.json(
    {
      success: false,
      message: "Validation",
      errors: [null, { field: "email", message: "Sai email" }],
    },
    { status: 400 },
  );
await assert.rejects(
  apiRequest("/confirmed-path"),
  (e: unknown) =>
    e instanceof ApiError &&
    e.errors.length === 1 &&
    e.errors[0].field === "email",
);
globalThis.fetch = async () => new Response(null, { status: 204 });
assert.equal(await apiRequest("/confirmed-path"), undefined);
globalThis.fetch = async () => new Response("Not JSON", { status: 502 });
await assert.rejects(apiRequest("/confirmed-path"), ApiError);
console.log(
  "Contract behavior tests passed: IDs, request validation, null/zero scores, multipart, login, HTTP envelopes/errors/204.",
);

import {
  notificationDuration,
  SUCCESS_NOTICE_MS,
} from "../src/utils/notifications";
assert.equal(SUCCESS_NOTICE_MS, 2500);
assert.equal(notificationDuration("success"), 2500);
assert.equal(notificationDuration("info"), 2500);
assert.equal(notificationDuration("error"), null);
assert.equal(notificationDuration("warning"), null);
console.log(
  "Notification policy passed: success/info 2.5s; error/warning persistent.",
);

import { DEMO_ACCOUNTS } from "../src/services/mock/authService";
for (const account of Object.values(DEMO_ACCOUNTS)) {
  assert.equal(
    loginDemo({ username: account.username, password: account.password }).data
      ?.user.role,
    account.wireRole,
  );
}
assert.throws(() => loginDemo({ username: "CT080101", password: "incorrect" }));
console.log("All four demo roles and invalid credentials passed.");

import {
  validateEmail,
  validatePhone,
  normalizePhone,
  validateTarget,
} from "../src/utils/profileValidation";
for (const email of ["ten@example.com", "a.b+tag@sv.kma.edu.vn"])
  assert.equal(validateEmail(email), "");
for (const email of [
  "",
  "a@",
  "a@localhost",
  "a..b@example.com",
  "a @example.com",
  "a@-host.com",
])
  assert.ok(validateEmail(email));
for (const phone of ["0912345678", "+84912345678", "0351234567"])
  assert.equal(validatePhone(phone), "");
for (const phone of [
  "",
  "123456789",
  "0123456789",
  "02412345678",
  "0312345678",
  "+84 912 345 678",
  "09123456789",
  "+1 9123456789",
  "09abc12345678",
])
  assert.ok(validatePhone(phone));
assert.equal(normalizePhone("+84 912 345 678"), "0912345678");
for (const gpa of ["0", "4", "3.25"]) assert.equal(validateTarget(gpa), "");
for (const gpa of ["", "-1", "4.01", "abc", "3.141"])
  assert.ok(validateTarget(gpa));
console.log(
  "Profile validation passed: email, Vietnamese phone, GPA boundaries and precision.",
);

import {
  validateNewPassword,
  validatePasswordForm,
} from "../src/utils/profileValidation";
assert.equal(validateNewPassword("a").length, 4);
assert.deepEqual(validateNewPassword("Abcdef1!"), []);
assert.ok(validateNewPassword("ABCDEFG1!").some((x) => x.includes("thường")));
const passwords = new FormData();
assert.equal(
  Object.values(validatePasswordForm(passwords)).filter((x) => x.length).length,
  3,
);
passwords.set("currentPassword", "demo123");
passwords.set("newPassword", "Abcdef1!");
passwords.set("confirmPassword", "Abcdef2!");
assert.deepEqual(validatePasswordForm(passwords).confirmPassword, [
  "Mật khẩu chưa khớp.",
]);
console.log("Password rules and simultaneous field validation passed.");

import {
  storePassword,
  verifyPassword,
} from "../src/services/mock/passwordStore";
const localValues = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => localValues.get(key) ?? null,
    setItem: (key: string, value: string) => localValues.set(key, value),
  },
});
assert.equal(await verifyPassword("test-user", "demo123"), true);
await storePassword("test-user", "ExampleNew1!");
assert.equal(await verifyPassword("test-user", "demo123"), false);
assert.equal(await verifyPassword("test-user", "ExampleNew1!"), true);
await storePassword("test-user", "ExampleReset2!");
assert.equal(await verifyPassword("test-user", "ExampleNew1!"), false);
assert.equal(await verifyPassword("test-user", "ExampleReset2!"), true);
assert.equal(await verifyPassword("other-user", "demo123"), true);
assert.ok(
  !JSON.stringify([...localValues.values()]).includes("ExampleReset2!"),
);
console.log(
  "Credential persistence passed: replace, verify, old password rejected, account isolation, no plaintext storage.",
);

// Unconnected email reset must fail without invalidating existing credentials.
import { requestPasswordReset } from "../src/services/api/passwordReset";
const beforeReset = localStorage.getItem("kma-password-verifiers-v1");
await assert.rejects(
  requestPasswordReset({ userId: 2, reason: "Quên mật khẩu" }),
  /chưa được kết nối/,
);
assert.equal(localStorage.getItem("kma-password-verifiers-v1"), beforeReset);
await assert.rejects(requestPasswordReset({ userId: 0 }), /không hợp lệ/);
console.log(
  "Email reset boundary passed: explicit unavailable error, credentials unchanged.",
);

import {
  subjectRequest,
  prerequisiteRequest,
  passwordRequest,
} from "../src/services/api/requestBuilders";
const subjectData = new FormData();
subjectData.set("subjectName", "Cơ sở dữ liệu");
subjectData.set("subjectCode", "DB101");
subjectData.set("credits", "5");
subjectData.set("status", "INACTIVE");
subjectData.set("description", "Mô tả");
assert.equal("status" in subjectRequest(subjectData, true), false);
assert.equal(subjectRequest(subjectData, false).description, "Mô tả");
for (const credits of ["0", "6", "10", "1.5"]) {
  subjectData.set("credits", credits);
  assert.throws(() => subjectRequest(subjectData, false));
}
assert.deepEqual(prerequisiteRequest([]), { prerequisiteSubjectIds: [] });
assert.deepEqual(prerequisiteRequest([4, 4, 9]), {
  prerequisiteSubjectIds: [4, 9],
});
assert.throws(() => prerequisiteRequest([0]));
const firstPassword = new FormData();
firstPassword.set("newPassword", "ExampleNew1!");
firstPassword.set("confirmPassword", "ExampleNew1!");
assert.equal(passwordRequest(firstPassword, true).currentPassword, null);
assert.deepEqual(validatePasswordForm(firstPassword, true).currentPassword, []);
assert.ok(validatePasswordForm(firstPassword, false).currentPassword.length);
assert.equal(
  passwordRequest(firstPassword, true).confirmPassword,
  "ExampleNew1!",
);
import { schedulesOverlap, scheduleEntries } from "../src/utils/classSchedules";
import { courseView, studentView } from "../src/services/adapters";
import { moduleClassResponses } from "../src/data/mock/dtoFixtures";
const multiClass = structuredClone(moduleClassResponses[0]);
const firstSlot = {
  ...multiClass.schedules[0],
  dayOfWeek: 2,
  lessonOrderStart: 1,
  lessonOrderEnd: 3,
  startDate: "2026-10-26",
  endDate: "2026-11-01",
};
const sundaySlot = { ...firstSlot, id: 8888, dayOfWeek: 8 };
multiClass.schedules = [firstSlot, sundaySlot];
assert.equal(scheduleEntries([courseView(multiClass)], "2026-10-26").length, 2);
assert.equal(scheduleEntries([courseView(multiClass)], "2026-11-02").length, 0);
assert.equal(
  schedulesOverlap(firstSlot, {
    ...firstSlot,
    startDate: "2026-11-02",
    endDate: "2026-11-08",
  }),
  false,
);
assert.equal(schedulesOverlap(firstSlot, firstSlot), true);
console.log(
  "DTO alignment passed: credits 1–5, exact request fields, empty prerequisites, first login, multiple dated schedules.",
);

import {
  prerequisiteCycle,
  allocateByScore,
  conflicts,
} from "../src/utils/academicRules";
import type { SubjectResponse } from "../src/types/dto";
const graph: SubjectResponse[] = [1, 2, 3].map((id) => ({
  id,
  subjectCode: `S${id}`,
  subjectName: `Subject ${id}`,
  credits: 3,
  status: "ACTIVE",
  description: null,
  prerequisites: [],
  requiredBy: [],
}));
graph[1].prerequisites = [graph[0]];
graph[2].prerequisites = [graph[1]];
assert.deepEqual(prerequisiteCycle(graph, 1, [3]), ["S1", "S3", "S2", "S1"]);
assert.deepEqual(prerequisiteCycle(graph, 3, []), []);
assert.deepEqual(prerequisiteCycle(graph, 1, [1]), ["S1", "S1"]);
const allocation = allocateByScore(
  [30, 29, 28, 27, 26, 25, 24].map((entranceScore) => ({ entranceScore })),
  3,
);
assert.deepEqual(
  allocation.map((g) => g.length),
  [3, 2, 2],
);
assert.equal(allocation.flat().length, 7);
assert.equal(new Set(allocation.flat()).size, 7);
assert.throws(() => allocateByScore([], 0));
const scheduled = { ...multiClass, schedules: [firstSlot] };
const clashClass = {
  ...scheduled,
  id: 999,
  moduleClassCode: "CLASH",
  schedules: [{ ...firstSlot, id: 9999 }],
};
assert.equal(conflicts([clashClass], scheduled, firstSlot).length, 1);
assert.equal(
  conflicts([{ ...clashClass, status: "CANCELLED" }], scheduled, firstSlot)
    .length,
  0,
);
assert.equal(
  conflicts([{ ...clashClass, semesterCode: "OTHER" }], scheduled, firstSlot)
    .length,
  0,
);
assert.equal(conflicts([scheduled], scheduled, firstSlot).length, 0);
import {
  prepareAccounts,
  authenticateAccount,
} from "../src/services/mock/accountProvisioning";
const newUsers = await prepareAccounts(
  [],
  [{ username: "CT202600001", fullName: "Test Student", role: "STUDENT" }],
);
const firstLogin = await authenticateAccount(newUsers, "CT202600001", "12345");
assert.equal(firstLogin.requirePasswordChange, true);
assert.equal(firstLogin.user.username, "CT202600001");
for (const [wire, expected] of [
  ["STUDENT", "student"],
  ["LECTURER", "lecturer"],
  ["ACADEMIC_ADMIN", "academic-admin"],
  ["SYSTEM_ADMIN", "system-admin"],
]) {
  const authenticated = await authenticateAccount(
    newUsers.map((user) => ({ ...user, role: wire })),
    "CT202600001",
    "12345",
  );
  assert.equal(accountRole(authenticated.user.role), expected);
}
assert.throws(() => accountRole("UNKNOWN"), /vai trò/i);
await assert.rejects(
  authenticateAccount(
    newUsers.map((u) => ({ ...u, status: "LOCKED" })),
    "CT202600001",
    "12345",
  ),
  /khóa/,
);
await assert.rejects(
  prepareAccounts(newUsers, [
    { username: "CT202600001", fullName: "Duplicate", role: "STUDENT" },
  ]),
  /tồn tại/,
);
await storePassword("CT202600001", "ChangedPassword1!");
await assert.rejects(
  authenticateAccount(newUsers, "CT202600001", "12345"),
  /không đúng/,
);
assert.equal(
  (
    await authenticateAccount(
      newUsers.map((u) => ({ ...u, firstLogin: false })),
      "CT202600001",
      "ChangedPassword1!",
    )
  ).requirePasswordChange,
  false,
);
console.log(
  "Academic workflows passed: prerequisite cycle path/removal, allocation, schedule conflicts, new account login, first-login gate, lock, duplicate account, password replacement.",
);
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppProviders } from "../src/app/AppProviders";
import { AppRoutes } from "../src/routes/AppRoutes";
import { academicAdminNavigation } from "../src/config/navigation";
import {
  baseValidation,
  EditForm,
  personFields,
} from "../src/components/academic-admin/AcademicUI";
assert.ok(!academicAdminNavigation.some((x) => x.id === "academic-dashboard"));
for (const page of [
  "admin",
  "admissions",
  "teachers",
  "subjects",
  "rooms",
  "terms",
  "classes",
  "academic-timetable",
  "knowledge",
  "register",
  "schedule",
  "chat",
  "chat-graduation",
  "chat-history",
  "teaching-classes",
  "teaching-schedule",
  "grades",
  "accounts",
] as const) {
  const html = renderToStaticMarkup(
    React.createElement(
      AppProviders,
      null,
      React.createElement(AppRoutes, { page, onNavigate: () => {} }),
    ),
  );
  assert.ok(html.includes("<h1>"), `Page ${page} renders heading`);
  if (page === "teachers") {
    assert.ok(!html.includes("<th>Thao tác</th>"));
    assert.ok(!html.includes("<th>Chi tiết</th>"));
  }
}
const badPerson = new FormData();
badPerson.set("email", "invalid");
badPerson.set("phone", "123");
badPerson.set("citizenId", "abc");
badPerson.set("dateOfBirth", "2099-01-01");
const errors = baseValidation(personFields, badPerson);
for (const key of [
  "fullName",
  "email",
  "phone",
  "citizenId",
  "dateOfBirth",
  "facultyId",
])
  assert.ok(errors[key]?.length, `Field ${key} has inline error`);
console.log(
  "Page render passed for all academic-admin pages and student/lecturer/system-admin routes; simultaneous form validation passed.",
);

// Cross-screen domain regressions: canonical prerequisites, identity, transitions.
import {
  normalizeSubjects,
  syncClasses,
  missingPrerequisites,
  transitionStudent,
  pageIndex,
  studentScheduleConflicts,
  updateSubjectModel,
} from "../src/services/academic/domain";
import {
  subjectResponses as domainSubjects,
  moduleClassResponses as domainClasses,
  userResponses as domainUsers,
} from "../src/data/mock/dtoFixtures";
import {
  overlap as domainOverlap,
  conflicts as identityConflicts,
} from "../src/utils/academicRules";
const prerequisite = {
  ...domainSubjects[0],
  subjectName: "Tên mới",
  credits: 3,
};
const dependent = {
  ...domainSubjects[1],
  prerequisites: [
    {
      id: prerequisite.id,
      subjectCode: prerequisite.subjectCode,
      subjectName: "Tên cũ",
      credits: 2,
    },
  ],
};
const canonical = normalizeSubjects([prerequisite, dependent]);
assert.equal(canonical[1].prerequisites[0].subjectName, "Tên mới");
assert.equal(canonical[0].requiredBy[0].id, dependent.id);
assert.equal(
  syncClasses(canonical, [
    { ...domainClasses[0], subjectCode: prerequisite.subjectCode },
  ])[0].subjectName,
  "Tên mới",
);
assert.equal(missingPrerequisites(canonical[1], "CT080101", []).length, 1);
assert.throws(
  () =>
    transitionStudent(
      { ...studentResponses[0], activityStatus: "DELETED" },
      domainUsers,
      true,
      "Khôi phục",
    ),
  /đã xóa/,
);
assert.throws(
  () => transitionStudent(studentResponses[0], [], false, "Tạm khóa"),
  /Không tìm thấy/,
);
const linked = {
  ...domainUsers[0],
  username: studentResponses[0].studentCode,
  role: "STUDENT" as const,
};
const changed = transitionStudent(
  studentResponses[0],
  [linked],
  false,
  "Tạm khóa",
);
assert.equal(changed.student.activityStatus, "DEACTIVATED");
assert.equal(changed.users[0].status, "DISABLED");
assert.equal(transitionStudent(changed.student, changed.users, true, "Trở lại học").users[0].status, "ACTIVE");
const lockedSuspension = transitionStudent(studentResponses[0], [{...linked, status: "LOCKED"}], false, "Bảo lưu");
assert.equal(lockedSuspension.users[0].status, "DISABLED");
const legacySuspension = { ...lockedSuspension.users[0], demoStatusBeforeDeactivation: "LOCKED" };
const restoredStudent = transitionStudent(lockedSuspension.student, [legacySuspension], true, "Trở lại học");
assert.equal(restoredStudent.users[0].status, "ACTIVE");
assert.equal("demoStatusBeforeDeactivation" in restoredStudent.users[0], false);
assert.equal(restoredStudent.student.activityStatus, "STUDYING");
assert.equal(restoredStudent.student.studentCode, studentResponses[0].studentCode);
assert.equal(studentView(changed.student).status, "Vô hiệu hóa");

assert.equal(transitionStudent(lockedSuspension.student, lockedSuspension.users, true, "Trở lại học").users[0].status, "ACTIVE");
assert.throws(
  () =>
    updateSubjectModel(
      prerequisite,
      { subjectName: "Tên mới", credits: 4 },
      true,
    ),
  /đã có điểm/,
);
assert.equal(pageIndex(4, 1), 0);
assert.equal(pageIndex(2, 0), 0);
const slot = {
  ...domainClasses[0].schedules[0],
  id: 100,
  dayOfWeek: 2,
  lessonOrderStart: 1,
  lessonOrderEnd: 3,
  startDate: "2026-10-01",
  endDate: "2026-12-31",
  roomCode: "ROOM-A",
};
const c1 = {
  ...domainClasses[0],
  id: 100,
  moduleClassCode: "C1",
  lecturerName: "Trùng tên",
  status: "SCHEDULED" as const,
  schedules: [slot],
};
const c2 = {
  ...c1,
  id: 200,
  moduleClassCode: "C2",
  schedules: [{ ...slot, roomCode: "ROOM-B" }],
};
assert.equal(
  identityConflicts([c1, c2], c1, slot, {
    100: { lecturerId: 1, roomType: "LECTURE" },
    200: { lecturerId: 2, roomType: "LECTURE" },
  }).length,
  0,
);
assert.equal(
  identityConflicts([c1, c2], c1, slot, {
    100: { lecturerId: 1, roomType: "LECTURE" },
    200: { lecturerId: 1, roomType: "LECTURE" },
  }).length,
  1,
);
assert.equal(
  studentScheduleConflicts(
    [c1, c2],
    c1,
    slot,
    { SV1: ["C1", "C2"] },
    domainOverlap,
  ).length,
  1,
);
assert.equal(
  studentScheduleConflicts([c1, c2], c1, slot, { SV1: ["C1"] }, domainOverlap)
    .length,
  0,
);
console.log(
  "PASS: canonical subject data, deleted student guard, linked account sync, historical grade guard, pagination, lecturer IDs, student schedule conflicts",
);

// UC-19/22/23/25: batch payload, real weekdays and publication gates.
import {
  buildOpeningRequest,
  publicationProblems,
  scheduleProblems,
} from "../src/services/academic/classPlanning";
import {
  recurringOverlap,
  weeklyClasses,
  termWeeks,
} from "../src/utils/timetable";
const batch = buildOpeningRequest(
  [
    { subjectId: 1, maxCapacity: "40" },
    { subjectId: 2, maxCapacity: 80 },
    { subjectId: 1, maxCapacity: 20 },
  ],
  true,
);
assert.deepEqual(batch, {
  subjects: [
    {
      subjectId: 1,
      confirmAdditionalClasses: true,
      classes: [{ maxCapacity: 40 }, { maxCapacity: 20 }],
    },
    {
      subjectId: 2,
      confirmAdditionalClasses: true,
      classes: [{ maxCapacity: 80 }],
    },
  ],
});
assert.throws(() =>
  buildOpeningRequest([{ subjectId: 1, maxCapacity: 81 }], false),
);
assert.throws(() =>
  buildOpeningRequest([{ subjectId: 1, maxCapacity: 1.5 }], false),
);
const weekTerm = {
  ...semesterResponse,
  startDate: "2026-11-03",
  endDate: "2026-11-15",
  isLocked: false,
};
const weekSchedule = {
  ...domainClasses[0].schedules[0],
  dayOfWeek: 2,
  lessonOrderStart: 1,
  lessonOrderEnd: 3,
  startDate: "2026-11-03",
  endDate: "2026-11-15",
};
const weekClass = {
  ...domainClasses[0],
  semesterCode: weekTerm.semesterCode,
  status: "SCHEDULED" as const,
  maxCapacity: 40,
  currentSize: 0,
  schedules: [weekSchedule],
};
assert.deepEqual(termWeeks(weekTerm), ["2026-11-02", "2026-11-09"]);
assert.equal(
  weeklyClasses([weekClass], "2026-11-02", weekTerm).length,
  0,
  "Monday before semester start is excluded",
);
assert.equal(weeklyClasses([weekClass], "2026-11-09", weekTerm).length, 1);
assert.equal(
  weeklyClasses([{ ...weekClass, status: "CANCELLED" }], "2026-11-09", weekTerm)
    .length,
  0,
);
assert.equal(
  weeklyClasses(
    [{ ...weekClass, schedules: [{ ...weekSchedule, dayOfWeek: 8 }] }],
    "2026-11-09",
    weekTerm,
  )[0].date,
  "2026-11-15",
);
assert.equal(
  recurringOverlap(
    { ...weekSchedule, startDate: "2026-11-02", endDate: "2026-11-04" },
    { ...weekSchedule, startDate: "2026-11-03", endDate: "2026-11-09" },
  ),
  false,
  "Overlapping date ranges with no common Monday are not a clash",
);
assert.equal(
  recurringOverlap(weekSchedule, {
    ...weekSchedule,
    lessonOrderStart: 3,
    lessonOrderEnd: 5,
  }),
  true,
);
assert.ok(
  scheduleProblems(
    { ...weekSchedule, startDate: "2026-11-03", endDate: "2026-11-04" },
    weekTerm,
  ).dayOfWeek,
);
assert.ok(
  publicationProblems(
    { ...weekClass, maxCapacity: 81 },
    weekTerm,
    "2026-11-03",
    [weekClass],
    [],
    {},
    [],
  ).some((x) => x.includes("1–80")),
);
assert.ok(
  publicationProblems(
    weekClass,
    { ...weekTerm, isLocked: true },
    "2026-11-03",
    [weekClass],
    [],
    {},
    [],
  ).some((x) => x.includes("khóa")),
);
console.log(
  "PASS: batch opening, weekly timetable, partial weeks, Sunday and publication guards",
);

import {
  syncLecturerAccounts,
  lecturerEmailError,
  repairSeedLecturerEmails,
} from "../src/services/academic/lecturers";
import { lecturerResponses, userResponses } from "../src/data/mock/dtoFixtures";
const linkedTeachers = syncLecturerAccounts(userResponses, lecturerResponses);
assert.equal(
  linkedTeachers.filter((u) => u.role === "LECTURER").length,
  lecturerResponses.length,
);
for (const t of lecturerResponses) {
  const accounts = linkedTeachers.filter((u) => u.username === t.lecturerCode);
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].email, t.email);
}
assert.equal(
  syncLecturerAccounts(linkedTeachers, lecturerResponses),
  linkedTeachers,
  "reconciliation is idempotent",
);
const lockedTeacher = linkedTeachers.map((u) =>
  u.username === "GV001" ? { ...u, status: "LOCKED", firstLogin: false } : u,
);
const refreshed = syncLecturerAccounts(
  lockedTeacher,
  lecturerResponses.map((t) =>
    t.lecturerCode === "GV001" ? { ...t, email: "updated@example.com" } : t,
  ),
);
assert.equal(refreshed.find((u) => u.username === "GV001")?.status, "LOCKED");
assert.equal(refreshed.find((u) => u.username === "GV001")?.firstLogin, false);
assert.ok(lecturerEmailError("", "NEW", lecturerResponses, linkedTeachers));
assert.ok(
  lecturerEmailError(
    " HUY.LQ@KMA.EDU.VN ",
    "NEW",
    lecturerResponses,
    linkedTeachers,
  ),
);
assert.equal(
  lecturerEmailError(
    "huy.lq@kma.edu.vn",
    "GV001",
    lecturerResponses,
    linkedTeachers,
  ),
  "",
);
const brokenTeachers = lecturerResponses.map((t) =>
  t.lecturerCode === "GV002" ? { ...t, email: "" } : t,
);
assert.equal(
  repairSeedLecturerEmails(brokenTeachers, lecturerResponses, userResponses)[1]
    .email,
  "",
);
const ownTeacher = {
  ...lecturerResponses[0],
  id: 99,
  lecturerCode: "GV099",
  fullName: "Hồ sơ tự thêm",
  email: "",
};
assert.equal(
  repairSeedLecturerEmails([ownTeacher], lecturerResponses, userResponses)[0]
    .email,
  "",
);
console.log(
  "PASS: one lecturer account per profile, email uniqueness, legacy seed repair, account lock and first-login preservation",
);

import {
  semesterFormName,
  nextSemesterIdentity,
  validateSemesterFields,
} from "../src/utils/semesterValidation";
const validTermFields = {
  semesterName: "HK_1 - 2026-2027",
  registrationStart: "2026-08-01",
  registrationEnd: "2026-08-10",
  startDate: "2026-08-11",
  endDate: "2026-12-30",
};
assert.deepEqual(validateSemesterFields(validTermFields, []), {});
assert.equal(
  semesterFormName("Học kỳ 1 · 2026 – 2027"),
  validTermFields.semesterName,
);
assert.equal(nextSemesterIdentity([], 0).code, "KY0001");
assert.ok(
  validateSemesterFields(
    { ...validTermFields, semesterName: "Học kì 1 năm học 2026-2027" },
    [],
  ).semesterName,
);
assert.ok(
  validateSemesterFields(
    { ...validTermFields, semesterName: "HK_1 - 2026-2028" },
    [],
  ).semesterName,
);
for (const registrationEnd of ["2026-08-11", "2026-08-12"])
  assert.ok(
    validateSemesterFields({ ...validTermFields, registrationEnd }, [])
      .startDate,
  );
assert.ok(
  validateSemesterFields(
    { ...validTermFields, registrationStart: "2026-08-10" },
    [],
  ).registrationEnd,
);
const savedTerm = { ...semesterResponse, ...validTermFields };
assert.deepEqual(
  validateSemesterFields(validTermFields, [savedTerm], savedTerm.id),
  {},
);
assert.ok(validateSemesterFields(validTermFields, [savedTerm]).semesterName);
assert.ok(
  validateSemesterFields(
    { ...validTermFields, semesterName: "HK_2 - 2026-2027" },
    [savedTerm],
  ).registrationStart,
);
console.log(
  "PASS: semester names and strict registration/study ordering for create and update",
);

assert.equal(nextSemesterIdentity([], 12).code, "KY0013");
assert.equal(
  nextSemesterIdentity([{ semesterCode: "KY0020" }], 12).code,
  "KY0021",
);

// Regressions from the full-flow audit: cross-user data and current BE payloads.
import {
  targetForStudent,
  setStudentTarget,
  savedComponents,
} from "../src/services/academic/studentAcademic";
const profiles = [
  studentView({ ...studentResponses[0], studentCode: "A", targetGpa: 3 }),
  studentView({
    ...studentResponses[0],
    id: 2,
    studentCode: "B",
    targetGpa: null,
  }),
];
const changedProfiles = setStudentTarget(profiles, "A", "3.75");
assert.equal(targetForStudent(changedProfiles, "A"), "3.75");
assert.equal(targetForStudent(changedProfiles, "B"), "");
assert.equal(targetForStudent(changedProfiles, "UNKNOWN"), "");
assert.equal(setStudentTarget(profiles, "A", "5"), profiles);
const savedScores = { CLASS1: { A: { tp1: "0", tp2: "8", note: "" } } };
assert.deepEqual(savedComponents(savedScores, "CLASS1", "A"), {
  tp1: "0",
  tp2: "8",
});
assert.deepEqual(savedComponents(savedScores, "CLASS1", "B"), {
  tp1: "—",
  tp2: "—",
});
assert.deepEqual(savedComponents(savedScores, "CLASS2", "A"), {
  tp1: "—",
  tp2: "—",
});
import { readStorage } from "../src/services/mock/storage";
localStorage.setItem(
  "status-migration-test",
  JSON.stringify({ activityStatus: "STUDING", fullName: "STUDING" }),
);
assert.deepEqual(readStorage("status-migration-test", {}), {
  activityStatus: "STUDYING",
  fullName: "STUDING",
});
const invalidIdentity = syncLecturerAccounts(
  [
    {
      id: 900,
      username: "NOEMAIL",
      fullName: "X",
      role: "LECTURER",
      status: "ACTIVE",
      firstLogin: false,
    },
  ],
  [{ ...lecturerResponses[0], lecturerCode: "NOEMAIL", email: "" }],
);
assert.equal(
  invalidIdentity[0].status,
  "ACTIVE",
  "Historical profile without email must not disable its account",
);
assert.equal(invalidIdentity[0].id, 900);
assert.equal(invalidIdentity[0].firstLogin, false);
import { createEduApi, semesterBody } from "../src/services/api/eduApi";
const requests: { url: string; init: RequestInit }[] = [];
globalThis.fetch = async (url, init) => {
  requests.push({ url: String(url), init: init ?? {} });
  return new Response(JSON.stringify({ success: true, data: { id: 1 } }), {
    status: 200,
  });
};
let expired = 0;
const api = createEduApi({
  getAccessToken: () => "test-token",
  onUnauthorized: () => {
    expired++;
  },
});
await api.users.lock(12, "Kiểm tra");
assert.equal(
  requests.at(-1)!.url,
  "http://test.invalid/api/v1/admin/users/12/lock",
);
assert.deepEqual(JSON.parse(String(requests.at(-1)!.init.body)), {
  reason: "Kiểm tra",
});
await api.users.resetPassword(12);
assert.equal(
  requests.at(-1)!.url,
  "http://test.invalid/api/v1/admin/users/12/reset-password",
);
assert.equal(requests.at(-1)!.init.body, undefined);
await api.users.unlock(12);
assert.equal(requests.at(-1)!.init.body, undefined);
await api.users.search({
  role: "LECTURER",
  status: "ACTIVE",
  firstLogin: false,
});
assert.ok(requests.at(-1)!.url.includes("role=LECTURER"));
assert.ok(requests.at(-1)!.url.includes("status=ACTIVE"));
assert.ok(requests.at(-1)!.url.includes("firstLogin=false"));
const wireTerm = semesterBody({
  semesterName: "HK_1 - 2026-2027",
  startDate: "2026-09-01",
  endDate: "2026-12-30",
  registrationStart: "2026-08-01",
  registrationEnd: "2026-08-20",
});
assert.equal(wireTerm.semesterName, "Học kì 1 năm học 2026-2027");
assert.ok(!("semesterCode" in wireTerm));
await api.semesters.update(3, { ...wireTerm, confirmDateChange: true });
assert.equal(
  JSON.parse(String(requests.at(-1)!.init.body)).confirmDateChange,
  true,
);
await api.subjects.search({
  keyword: "A&B",
  subjectCode: "IT",
  credits: 3,
  withoutPrerequisites: false,
  page: 0,
  size: 20,
});
assert.ok(requests.at(-1)!.url.includes("keyword=A%26B"));
assert.ok(requests.at(-1)!.url.includes("withoutPrerequisites=false"));
assert.ok(requests.at(-1)!.url.includes("subjectCode=IT"));
await api.auth.logout({ refreshToken: "refresh-test" });
assert.deepEqual(JSON.parse(String(requests.at(-1)!.init.body)), {
  refreshToken: "refresh-test",
});
await api.students.update(5, { targetGpa: 0, citizenId: "012345678901" });
assert.deepEqual(JSON.parse(String(requests.at(-1)!.init.body)), {
  targetGpa: 0,
  citizenId: "012345678901",
});
globalThis.fetch = async () =>
  new Response(JSON.stringify({ success: false, message: "Expired" }), {
    status: 401,
  });
await assert.rejects(api.students.detail(5), /Expired/);
assert.equal(expired, 1);
console.log(
  "PASS: account isolation, score visibility, legacy status migration, historical no-email profile preservation, HTTP paths/bodies/query/401",
);

import { readFileSync } from "node:fs";
import { ENDPOINTS } from "../src/services/api/backendContract";
import {
  legacyRoomCodes,
  roomInput,
  validateRoom,
  searchRooms,
} from "../src/services/academic/rooms";
const roomDocs = readFileSync("docs/API_SPECIFICATION.md", "utf8");
const documented = Array.from(
  roomDocs.matchAll(
    /\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|\s*`?(\/api\/v1\/[^` |]+)`?/g,
  ),
  (m) => m[1] + " " + m[2].replace(/\{[^}]+\}/g, "7"),
);
const implemented = Object.values(ENDPOINTS).map(
  (e) =>
    e.method +
    " " +
    (typeof e.url === "string" ? e.url : (e.url as (id: number) => string)(7)),
);
assert.equal(documented.length, 53);
assert.deepEqual(implemented.sort(), documented.sort());
const roomForm = new FormData();
for (const [key, value] of Object.entries({
  roomCode: " 102-ta1 ",
  roomName: " Phòng 102 ",
  campus: "cs1",
  buildingCode: "ta1",
  capacity: "100",
}))
  roomForm.set(key, value);
const payload = roomInput(roomForm);
assert.equal(payload.roomCode, "102-TA1");
assert.equal(payload.campus, "CS1");
assert(!("roomType" in payload || "roomNumber" in payload));
assert.deepEqual(validateRoom(payload, {}), {});
const invalidRoom = validateRoom(
  { ...payload, buildingCode: "B", roomNumber: "2", capacity: 1.5 },
  {},
);
assert.deepEqual(Object.keys(invalidRoom).sort(), [
  "buildingCode",
  "capacity",
  "roomNumber",
]);
const oldRoom = {
  id: 7,
  roomCode: "A201",
  buildingCode: "A",
  roomNumber: "201",
  roomName: "Phòng 201",
  roomType: "LECTURE",
  campus: "CS1",
  capacity: 105,
  status: "ACTIVE" as const,
};
assert.equal(legacyRoomCodes([oldRoom]).get("A201"), "201-A");
assert.equal(
  legacyRoomCodes([oldRoom, { ...oldRoom, id: 8, roomCode: "201-A" }]).size,
  0,
);
assert.deepEqual(
  searchRooms([oldRoom, { ...oldRoom, id: 8, deleted: true }], {
    keyword: "201",
    campus: "cs1",
    buildingCode: "a",
    minCapacity: 105,
    status: "ACTIVE",
  }).map((r) => r.id),
  [7],
);
console.log(
  "PASS: all 53 documented method/path pairs, room payload, validation, filters and legacy room references",
);

import { reconcileScheduledRooms } from "../src/services/academic/rooms";
import { roomCatalog } from "../src/data/mock/catalogs";
import { moduleClassResponses as scheduledFixtures } from "../src/data/mock/dtoFixtures";
const oldRooms = roomCatalog.map((r) => ({ ...oldRoom, ...r }));
const recovered = reconcileScheduledRooms(oldRooms, scheduledFixtures)!;
for (const c of recovered.classes)
  for (const slot of c.schedules)
    assert(
      recovered.rooms.some((r) => r.roomCode === slot.roomCode),
      slot.roomCode,
    );
assert.equal(
  new Set(recovered.rooms.map((r) => r.id)).size,
  recovered.rooms.length,
);
assert.equal(
  reconcileScheduledRooms(recovered.rooms, recovered.classes),
  undefined,
);
assert.equal(recovered.rooms.find((r) => r.roomCode === "201-A")?.id, 101);
console.log(
  "PASS: every scheduled demo room is represented, IDs preserved, repeated migration is a no-op",
);

import { roomFitsClass } from "../src/services/academic/classPlanning";
assert.equal(roomFitsClass(oldRoom, oldRoom.capacity), true);
assert.equal(roomFitsClass(oldRoom, oldRoom.capacity + 1), false);
assert.equal(roomFitsClass(oldRoom, 10, "LAB"), false);
assert.equal(roomFitsClass({ ...oldRoom, deleted: true }, 10), false);
assert.equal(roomFitsClass({ ...oldRoom, status: "INACTIVE" }, 10), false);

// Current Nov 10 contract regressions (separate from historical demo DTO snapshot).
import { catalog as liveCatalog } from "../src/pages/live/catalog";
import {
  capacity as admissionCapacity,
  scenarios as admissionScenarios,
  allocate as allocateAdmission,
  summarize as summarizeAdmission,
  checkExceptions,
  suffix as admissionSuffix,
} from "../src/services/mock/admissionDomain";
import type {
  AdmissionPlanResponse,
  AdmissionApplicantResponse,
} from "../src/services/api/backendContract";
import { verifyPreviousPassword } from "../src/services/mock/passwordStore";
const studentCreateFields = liveCatalog.admin.create!.fields;
assert(studentCreateFields.includes("citizenId!"));
assert(
  studentCreateFields.includes("email") &&
    !studentCreateFields.includes("email!"),
);
const studentUpdateFields = liveCatalog.admin.actions.find(
  (x) => x.op === "studentUpdate",
)!.fields;
for (const forbidden of [
  "studentCode",
  "administrativeClassId",
  "academicWarningStatus",
  "academicWarningReason",
])
  assert(!studentUpdateFields.includes(forbidden), forbidden);
assert(!liveCatalog.admin.filters.includes("academicWarningStatus"));
assert(liveCatalog.teachers.create!.fields.includes("recruitmentYear!"));
assert(
  liveCatalog.teachers.create!.fields.some(
    (x) => x.replace("!", "") === "teachingSubjectIds",
  ),
);
assert(liveCatalog.teachers.actions.some((x) => x.op === "lecturerUpdate"));
assert(!Object.keys(ENDPOINTS).some((k) => k.includes("ResendNotification")));

assert.throws(
  () =>
    createStudent(
      {
        fullName: "Thiếu CCCD",
        majorId: 1,
        cohortId: 1,
        administrativeClassId: 1,
        reason: "Test",
      },
      studentResponses,
    ),
  /CCCD/,
);
assert.throws(
  () => updateStudent(created, { administrativeClassId: 2 }),
  /không được phép/,
);
assert.throws(
  () => updateStudent(created, { academicWarningStatus: "WARNING" }),
  /không được phép/,
);
assert.throws(() => updateStudent(created, { targetGpa: 4.01 }), /GPA/);
assert.throws(() => updateStudent(created, { targetGpa: 3.125 }), /GPA/);
assert.equal(
  updateStudent({ ...created, targetGpa: 3 }, { targetGpa: null }).targetGpa,
  3,
  "admin PUT null preserves",
);
assert.equal(
  updateStudent({ ...created, targetGpa: 3 }, { targetGpa: null }, true)
    .targetGpa,
  null,
  "self PATCH null clears",
);
assert.equal(
  updateStudent(created, { targetGpa: 0 }, true).targetGpa,
  0,
  "zero is distinct from unset",
);
const sharedEmailUsers = await prepareAccounts(
  [],
  [
    {
      username: "TEST-SHARED-A",
      fullName: "A",
      role: "STUDENT",
      email: "shared@example.com",
    },
    {
      username: "TEST-SHARED-B",
      fullName: "B",
      role: "STUDENT",
      email: "shared@example.com",
    },
  ],
);
assert.equal(
  sharedEmailUsers.length,
  2,
  "student email is not an identity key",
);
await assert.rejects(
  prepareAccounts(
    [],
    [
      {
        username: "TEST-LECT-A",
        fullName: "A",
        role: "LECTURER",
        email: "lect@example.com",
      },
      {
        username: "TEST-LECT-B",
        fullName: "B",
        role: "LECTURER",
        email: "lect@example.com",
      },
    ],
  ),
  /Email|email/,
);

assert.deepEqual(validateNewPassword("Abcdéf1!"), []);
assert(
  validateNewPassword("Á".repeat(34) + "abc1!").some((x) =>
    x.includes("72 byte"),
  ),
);
await storePassword("history-test", "Temporary1!");
await storePassword("history-test", "FirstOfficial1!", false);
assert.equal(
  await verifyPreviousPassword("history-test", "Temporary1!"),
  false,
);
await storePassword("history-test", "SecondOfficial2!", true);
assert.equal(
  await verifyPreviousPassword("history-test", "FirstOfficial1!"),
  true,
);
await storePassword("history-test", "ThirdOfficial3!", true);
assert.equal(
  await verifyPreviousPassword("history-test", "FirstOfficial1!"),
  false,
);
assert.equal(
  await verifyPreviousPassword("history-test", "SecondOfficial2!"),
  true,
);
assert.equal(
  await verifyPreviousPassword("other-account", "SecondOfficial2!"),
  false,
);
const historyStorage = localStorage.getItem("kma-password-verifiers-v1")!;
for (const secret of [
  "Temporary1!",
  "FirstOfficial1!",
  "SecondOfficial2!",
  "ThirdOfficial3!",
])
  assert(!historyStorage.includes(secret));

const cap = admissionCapacity({});
assert.deepEqual(cap, { minimum: 40, maximum: 50, reserve: 15 });
assert.throws(
  () => admissionCapacity({ minCapacity: 0 }),
  (e) => e instanceof ApiError && e.code === 4131,
);
assert.throws(
  () => admissionCapacity({ maxCapacity: 90, reserveCapacity: 10 }),
  (e) => e instanceof ApiError && e.code === 4131,
);
assert.deepEqual(admissionScenarios(0, cap, 10), []);
const planOptions = admissionScenarios(85, cap, 1);
assert.equal(planOptions.filter((x) => x.recommended).length, 1);
assert.equal(planOptions.find((x) => x.recommended)!.level, "NORMAL");
assert.deepEqual(planOptions.find((x) => x.recommended)!.targetSizes, [43, 42]);
assert.equal(planOptions.find((x) => x.recommended)!.insufficientRooms, true);
assert.throws(
  () => checkExceptions([60], cap, {}),
  (e) => e instanceof ApiError && e.code === 4133,
);
assert.doesNotThrow(() => checkExceptions([60], cap, { acceptReserve: true }));
assert.throws(
  () => checkExceptions([30], cap, { acceptBelowMinimum: true }),
  (e) => e instanceof ApiError && e.code === 4133,
);
assert.doesNotThrow(() =>
  checkExceptions([30], cap, {
    acceptBelowMinimum: true,
    reason: "Quy mô đầu vào nhỏ",
  }),
);
assert.throws(
  () => checkExceptions([66], cap, { acceptReserve: true }),
  (e) => e instanceof ApiError && e.code === 4135,
);
assert.equal(admissionSuffix(26), "Z");
assert.equal(admissionSuffix(27), "AA");
assert.equal(admissionSuffix(99), "CU");
const admissionApplicants: AdmissionApplicantResponse[] = Array.from(
  { length: 7 },
  (_, i) => ({
    id: i + 1,
    rowNumber: i + 6,
    applicationCode: `APP-${i}`,
    citizenId: String(i + 1).padStart(12, "0"),
    fullName: `Học sinh ${i}`,
    dateOfBirth: null,
    gender: null,
    email: null,
    phone: null,
    entranceScore: 30 - i,
    state: "VALID",
    error: null,
    assignedClassId: null,
    studentId: null,
    studentCode: null,
    reusingAccount: false,
    warnings: [],
  }),
);
const admissionPlan: AdmissionPlanResponse = {
  id: 1,
  revision: 1,
  majorId: 1,
  cohortId: 1,
  totalStudents: 7,
  capacity: { minimum: 2, maximum: 3, reserve: 1 },
  state: "CLASSES_READY",
  selectedClassCount: 3,
  scenarios: [],
  classes: [1, 2, 3].map((id) => ({
    id,
    className: `CT8${admissionSuffix(id)}`,
    targetSize: 0,
    assignedSize: 0,
    currentSize: 0,
    minimum: 2,
    maximum: 3,
    reserve: 1,
    reserveUsed: 0,
    averageScore: null,
    applicantIds: [],
  })),
  applicants: admissionApplicants,
  averageScoreDifference: 0,
  warnings: [],
};
allocateAdmission(admissionPlan);
summarizeAdmission(admissionPlan, 3);
assert.equal(admissionPlan.state, "PREVIEWED");
assert.deepEqual(
  admissionPlan.classes.map((c) => c.assignedSize),
  [3, 2, 2],
);
assert.equal(
  new Set(admissionPlan.classes.flatMap((c) => c.applicantIds)).size,
  7,
);
const completed = admissionPlan.applicants[0];
completed.state = "ENROLLED";
completed.studentCode = "CNTT080101";
completed.studentId = 100;
const fixedClass = completed.assignedClassId;
allocateAdmission(admissionPlan);
assert.equal(
  completed.assignedClassId,
  fixedClass,
  "preview cannot move enrolled applicants",
);
assert.equal(completed.studentCode, "CNTT080101");
admissionPlan.applicants.push({
  ...admissionApplicants[0],
  id: 8,
  applicationCode: "INVALID",
  state: "INVALID",
  assignedClassId: null,
});
summarizeAdmission(admissionPlan, 3);
assert.equal(
  admissionPlan.totalStudents,
  7,
  "invalid applicant excluded from capacity",
);
console.log(
  "PASS: Nov10 People whitelist/null semantics, shared student email, lecturer uniqueness, password history/UTF-8, admission capacities/scenarios/exception consent/allocation/enrolled preservation",
);

import { templateBlob } from "../src/services/mock/admissionSpreadsheet";
import { unzipSync, strFromU8 } from "fflate";
const admissionTemplate = templateBlob();
assert.equal(
  admissionTemplate.type,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
);
const templateArchive = unzipSync(
  new Uint8Array(await admissionTemplate.arrayBuffer()),
);
const sheetXml = strFromU8(templateArchive["xl/worksheets/sheet1.xml"]);
assert.match(sheetXml, /<row r="5">/);
assert.match(sheetXml, /<c r="A3"[^>]*><is><t>Mã ngành<\/t>/);
assert.match(sheetXml, /<c r="B3"[^>]*><is><t>CNTT<\/t>/);
for (const title of [
  "Mã hồ sơ",
  "CCCD",
  "Họ tên",
  "Điểm đầu vào",
  "Ngày sinh",
  "Giới tính",
  "Email",
  "Số điện thoại",
])
  assert(sheetXml.includes(title));
assert(
  !sheetXml.includes("Mã khóa"),
  "scope cohort is selected in application, not in new template",
);
assert.equal(
  (strFromU8(templateArchive["xl/workbook.xml"]).match(/<sheet /g) ?? [])
    .length,
  1,
);
console.log(
  "PASS: demo XLSX template has one sheet, major metadata, row-5 header and required columns",
);

// Confirmation must use the edited assignment, not the initial balanced scenario.
import { admissionExceptionErrors } from "../src/pages/live/admissionValidation";
import { downloadApiFile } from "../src/services/api/httpClient";
const balancedScenario = {
  reserveUsed: 0,
  belowMinimum: false,
} as import("../docs/fe-api-contract").AdmissionScenario;
const adjustedClasses = [
  { assignedSize: 51, minimum: 40, maximum: 50, reserve: 15 },
  { assignedSize: 39, minimum: 40, maximum: 50, reserve: 15 },
] as import("../docs/fe-api-contract").AdmissionClassPreview[];
const editedErrors = admissionExceptionErrors(
  balancedScenario,
  adjustedClasses,
  true,
  false,
  false,
  "",
);
assert(
  editedErrors.acceptReserve &&
    editedErrors.acceptBelowMinimum &&
    editedErrors.reason,
);
assert.deepEqual(
  admissionExceptionErrors(
    balancedScenario,
    adjustedClasses,
    true,
    true,
    true,
    "Điều chỉnh theo hồ sơ thực tế",
  ),
  {},
);
assert.deepEqual(
  admissionExceptionErrors(
    balancedScenario,
    adjustedClasses,
    false,
    false,
    false,
    "",
  ),
  {},
);
assert.deepEqual(
  admissionExceptionErrors(
    { ...balancedScenario, belowMinimum: true },
    adjustedClasses.map((c) => ({ ...c, assignedSize: 45 })),
    true,
    false,
    false,
    "",
  ),
  {},
);
const originalDownloadFetch = globalThis.fetch;
globalThis.fetch = async () =>
  Response.json(
    { success: false, code: 4006, message: "Cần đổi mật khẩu" },
    { status: 403 },
  );
await assert.rejects(
  downloadApiFile("/template", "token", "template.xlsx"),
  (e: unknown) => e instanceof ApiError && e.status === 403 && e.code === 4006,
);
globalThis.fetch = originalDownloadFetch;
console.log(
  "PASS: admission exception checks use actual assignments; template download preserves first-login error",
);

await import("./ai-contracts");

const { repairDemoStudentAccounts } = await import('../src/services/mock/studentAccountRepair');
const { students: repairStudents } = await import('../src/data/mock/students');
const { userResponses: repairUsers } = await import('../src/data/mock/dtoFixtures');
const { syncLecturerAccounts: repairLecturers } = await import('../src/services/academic/lecturers');
const { lecturerResponses: repairTeachers } = await import('../src/data/mock/dtoFixtures');
const beforeRepair = repairUsers.map(u => ({...u, firstLogin: false}));
const afterRepair = repairDemoStudentAccounts(beforeRepair, repairStudents);
assert.equal(afterRepair.filter(u => u.role === 'STUDENT').length, 6);
assert.equal(repairLecturers(afterRepair, repairTeachers).length, 11);
assert.equal(afterRepair.find(u => u.username === 'CT080327')?.status, 'DISABLED');
assert.equal(afterRepair.find(u => u.username === 'CT080214')?.firstLogin, true);
assert.equal(afterRepair[3], beforeRepair[3]);
assert.equal(repairDemoStudentAccounts(afterRepair, repairStudents), afterRepair);
assert.equal(new Set(afterRepair.map(u => u.id)).size, afterRepair.length);
assert.equal(repairDemoStudentAccounts(beforeRepair, repairStudents.filter(s => s.dto.studentCode !== 'CT080214')).some(u => u.username === 'CT080214'), false);
console.log('PASS: demo student seed repair, 11 linked accounts, inactive status, preserved existing identity, idempotence and absent-profile guard');

const {repairSeedScheduleStorage} = await import('../src/services/mock/seedScheduleRepair');
assert.ok(semesterResponse.registrationEnd! < semesterResponse.startDate!);
for (const c of moduleClassResponses) for (const slot of c.schedules) assert.ok(slot.startDate! >= semesterResponse.startDate!);
for (let i=0;i<moduleClassResponses.length;i++) for (let j=i+1;j<moduleClassResponses.length;j++) {
 const a=moduleClassResponses[i], b=moduleClassResponses[j];
 for(const x of a.schedules) for(const y of b.schedules) {
  if(x.roomCode===y.roomCode || a.lecturerName===b.lecturerName) assert.equal(schedulesOverlap(x,y),false, `Seed scheduling conflict: ${a.moduleClassCode}, ${b.moduleClassCode}`);
 }
}
const oldTerm={...semesterResponse,startDate:'2026-11-02'};
assert.equal(repairSeedScheduleStorage('kma-semester-dto-v3',oldTerm).startDate,'2026-11-16');
const customTerm={...oldTerm,registrationEnd:'2026-10-31'};
assert.equal(repairSeedScheduleStorage('kma-semester-dto-v3',customTerm),customTerm);
assert.equal(repairSeedScheduleStorage('kma-users-v1',beforeRepair),beforeRepair);
const oldClasses=moduleClassResponses.map(c=>({...c,schedules:c.schedules.map(s=>({...s,startDate:'2026-11-02',...(c.moduleClassCode==='INT1306.2'?{roomCode:'201-A',buildingCode:'A'}:{})}))}));
const migratedClasses=repairSeedScheduleStorage('kma-dto-management-v3',{classes:oldClasses}).classes;
assert.equal(migratedClasses[5].schedules[0].roomCode,'201-B');
assert.equal(migratedClasses[0].schedules[0].startDate,'2026-11-16');
assert.deepEqual(repairSeedScheduleStorage('kma-dto-management-v3',{classes:migratedClasses}).classes,migratedClasses);
console.log('PASS: seed term date ordering, all seed teacher/room conflicts, legacy date repair and preservation guards');

localStorage.setItem("uc10-label-repair", JSON.stringify([{ ...studentView(changed.student), status: "Ngừng hoạt động" }]));
const labelRepair = readStorage<any[]>("uc10-label-repair", []);
assert.equal(labelRepair[0].status, "Vô hiệu hóa");
assert.deepEqual(labelRepair[0].dto, changed.student);
localStorage.setItem("uc10-label-repair", "null");

const confirmationFields = [{ key: "confirmed", label: "Xác nhận", type: "checkbox", required: true, options: [{ value: "yes", label: "Tôi xác nhận" }] }];
const uncheckedConfirmation = new FormData();
assert.ok(baseValidation(confirmationFields, uncheckedConfirmation).confirmed.length);
uncheckedConfirmation.set("confirmed", "yes");
assert.equal(baseValidation(confirmationFields, uncheckedConfirmation).confirmed.length, 0);
const confirmationMarkup = renderToStaticMarkup(React.createElement(EditForm, { fields: confirmationFields, close: () => {}, save: () => {} }));
assert.ok(confirmationMarkup.includes('type="checkbox"'));
assert.ok(!confirmationMarkup.includes('<select'));
