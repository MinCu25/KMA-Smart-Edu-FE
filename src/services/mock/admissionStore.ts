import { useMemo, useRef } from "react";
import { useAcademic } from "../../context/AcademicContext";
import { useDemoData } from "../../context/DemoDataContext";
import { useAuth } from "../../context/AuthContext";
import { readStorage, writeStorage } from "./storage";
import { createStudent } from "./dtoService";
import { studentView } from "../adapters";
import type { AdmissionStore } from "../../pages/live/Admission";
import type {
  AdmissionPlanResponse,
  AdmissionApplicantResponse,
  AdmissionNotificationResponse,
  AdministrativeClassResponse,
} from "../api/backendContract";
import {
  admissionError,
  capacity,
  scenarios,
  summarize,
  counted,
  checkExceptions,
  allocate,
  suffix,
} from "./admissionDomain";
import { parseApplicants, templateBlob } from "./admissionSpreadsheet";
const key = "kma-admission-plans-v2";
interface Saved {
  plans: AdmissionPlanResponse[];
  notifications: Record<string, AdmissionNotificationResponse[]>;
}
const initial = (): Saved => readStorage(key, { plans: [], notifications: {} });
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const cohortCode = (id: number) => (id === 1 ? "K2026" : "K2025");
function scope(major: number, cohort: number) {
  if (major !== 1 || ![1, 2].includes(cohort))
    admissionError(
      "Danh mục hiện có: ngành CNTT ID 1; khóa K2026 ID 1, K2025 ID 2.",
      4140,
      "majorId",
    );
}
function same(a: AdmissionApplicantResponse, b: AdmissionApplicantResponse) {
  return [
    "applicationCode",
    "citizenId",
    "fullName",
    "dateOfBirth",
    "gender",
    "email",
    "phone",
    "entranceScore",
  ].every(
    (k) =>
      String(a[k as keyof typeof a] ?? "")
        .trim()
        .toLowerCase() ===
      String(b[k as keyof typeof b] ?? "")
        .trim()
        .toLowerCase(),
  );
}
export function useDemoAdmissionStore(): AdmissionStore {
  const a = useAcademic(),
    d = useDemoData(),
    auth = useAuth();
  const latest = useRef({ a, d, auth });
  latest.current = { a, d, auth };
  const busy = useRef(false);
  const memory = useRef<Saved>(initial());
  return useMemo(
    () => ({
      downloadTemplate: async (majorId: number, cohortId: number) => {
        scope(majorId, cohortId);
        const url = URL.createObjectURL(templateBlob());
        const link = document.createElement("a");
        link.href = url;
        link.download = "Danh-sach-trung-tuyen-CNTT.xlsx";
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      request: async <T>(
        op: string,
        id?: number | string,
        body?: unknown,
        query?: URLSearchParams,
      ): Promise<T> => {
        const { a, d, auth } = latest.current;
        const values = (
          body instanceof FormData
            ? Object.fromEntries(body.entries())
            : (body ?? {})
        ) as Record<string, unknown>;
        const saved = clone(readStorage<Saved>(key, memory.current));
        const suitable = (c: AdmissionPlanResponse["capacity"]) =>
          a.rooms.filter(
            (r) =>
              !r.deleted &&
              r.status === "ACTIVE" &&
              r.capacity >= c.maximum + c.reserve,
          ).length;
        const persist = () => {
          memory.current = clone(saved);
          writeStorage(key, saved);
        };
        if (op === "admissionConfiguration")
          return { minimum: 40, maximum: 50, reserve: 15 } as T;
        if (op === "administrativeClassesSearch") {
          const major = Number(query?.get("majorId")),
            cohort = Number(query?.get("cohortId"));
          scope(major, cohort);
          return a.adminClasses
            .filter((c) => c.cohortCode === cohortCode(cohort))
            .map((c) => ({
              ...c,
              minCapacity: 40,
              reserveCapacity: 15,
              availableForAdmission:
                !c.currentSize &&
                !d.studentData.some((s) => s.className === c.className) &&
                !saved.plans.some((p) => p.classes.some((x) => x.id === c.id)),
            })) as T;
        }
        if (op === "admissionCreatePlan" || op === "admissionImportPlan") {
          if (busy.current) admissionError("Đang xử lý một yêu cầu.");
          busy.current = true;
          try {
            const majorId = Number(values.majorId),
              cohortId = Number(values.cohortId);
            scope(majorId, cohortId);
            const c = capacity(values);
            const total =
              op === "admissionCreatePlan" ? Number(values.totalStudents) : 0;
            if (!Number.isInteger(total) || total < 0)
              admissionError(
                "Số sinh viên dự kiến phải là số nguyên không âm.",
                4131,
                "totalStudents",
              );
            const plan: AdmissionPlanResponse = {
              id: Math.max(0, ...saved.plans.map((p) => p.id)) + 1,
              revision: 0,
              majorId,
              cohortId,
              totalStudents: total,
              capacity: c,
              state: "DRAFT",
              selectedClassCount: null,
              scenarios: scenarios(total, c, suitable(c)),
              classes: [],
              applicants: [],
              averageScoreDifference: 0,
              warnings: [],
            };
            if (op === "admissionImportPlan") {
              plan.applicants = await parseApplicants(
                values.file as File,
                cohortCode(cohortId),
              );
              merge(plan, plan.applicants);
              summarize(plan, suitable(c));
            }
            saved.plans.push(plan);
            persist();
            return clone(plan) as T;
          } finally {
            busy.current = false;
          }
        }
        const plan = saved.plans.find(
          (p) =>
            p.id ===
            Number(op === "admissionPrepareClasses" ? values.planId : id),
        );
        if (!plan) admissionError("Không tìm thấy phương án nhập học.", 4130);
        if (op === "admissionPlanGet") return clone(plan) as T;
        if (op === "admissionNotifications")
          return clone(saved.notifications[plan.id] ?? []) as T;
        if (busy.current) admissionError("Đang xử lý một yêu cầu.");
        busy.current = true;
        try {
          if (Number(values.expectedRevision) !== plan.revision)
            admissionError(
              "Phương án đã thay đổi. Hãy tải lại trước khi thao tác.",
              4132,
            );
          if (plan.state === "CONFIRMING")
            admissionError("Phương án đang được xác nhận.");
          if (op === "admissionImportApplicants") {
            if (plan.state === "CONFIRMED")
              admissionError("Phương án đã hoàn tất. Hãy lập phương án mới.");
            const parsed = await parseApplicants(
              values.file as File,
              cohortCode(plan.cohortId),
            );
            merge(plan, parsed);
            summarize(plan, suitable(plan.capacity));
            plan.state = plan.classes.length ? "CLASSES_READY" : "DRAFT";
          } else if (op === "admissionPrepareClasses") {
            if (plan.applicants.some((x) => x.state === "ENROLLED"))
              admissionError(
                "Không đổi lớp đã chuẩn bị sau khi có sinh viên nhập học.",
              );
            const count = Number(values.classCount);
            const scenario = plan.scenarios.find((s) => s.classCount === count);
            if (!scenario)
              admissionError(
                "Chọn số lớp trong phương án khả thi.",
                4135,
                "classCount",
              );
            checkExceptions(scenario.targetSizes, plan.capacity, values);
            const candidates = a.adminClasses.filter(
              (c) =>
                c.cohortCode === cohortCode(plan.cohortId) &&
                c.trainingType === "CHINH_QUY" &&
                !c.currentSize &&
                !d.studentData.some((s) => s.className === c.className) &&
                !saved.plans.some(
                  (p) =>
                    p.id !== plan.id && p.classes.some((x) => x.id === c.id),
                ),
            );
            const explicit = values.existingClassIds as
              number[] | undefined | null;
            if (
              explicit &&
              (!Array.isArray(explicit) ||
                new Set(explicit).size !== explicit.length ||
                explicit.length > count ||
                explicit.some((id) => !candidates.some((c) => c.id === id)))
            )
              admissionError(
                "Lớp dùng lại không còn phù hợp.",
                4135,
                "existingClassIds",
              );
            const selected =
              explicit == null
                ? candidates.slice(0, count)
                : explicit.map((id) => candidates.find((c) => c.id === id)!);
            const classes = a.adminClasses.map((c) => ({ ...c }));
            let next = Math.max(0, ...classes.map((c) => c.id));
            const cohortSeq = plan.cohortId === 1 ? 8 : 7;
            let sequence = Math.max(
              0,
              ...classes
                .filter((c) => c.cohortCode === cohortCode(plan.cohortId))
                .map((c) => {
                  const m = /([A-Z]+)$/.exec(c.className);
                  return m
                    ? [...m[1]].reduce(
                        (n, ch) => n * 26 + ch.charCodeAt(0) - 64,
                        0,
                      )
                    : Number(/L(\d+)$/.exec(c.className)?.[1] ?? 0);
                }),
            );
            while (selected.length < count) {
              if (++sequence > 99)
                admissionError("Khóa đã hết số thứ tự lớp.", 4135);
              const created = {
                id: ++next,
                className: `CT${cohortSeq}${suffix(sequence)}`,
                majorCode: "CNTT",
                majorName: "Công nghệ thông tin",
                cohortCode: cohortCode(plan.cohortId),
                trainingType: "CHINH_QUY" as const,
                currentSize: 0,
                maxCapacity: plan.capacity.maximum,
              };
              classes.push(created);
              selected.push(created);
            }
            a.setAdminClasses(
              classes.map((c) =>
                selected.some((s) => s.id === c.id)
                  ? { ...c, maxCapacity: plan.capacity.maximum }
                  : c,
              ),
            );
            plan.selectedClassCount = count;
            plan.classes = selected.map((c, i) => ({
              id: c.id,
              className: c.className,
              targetSize: scenario.targetSizes[i],
              assignedSize: 0,
              currentSize: 0,
              minimum: plan.capacity.minimum,
              maximum: plan.capacity.maximum,
              reserve: plan.capacity.reserve,
              reserveUsed: 0,
              averageScore: null,
              applicantIds: [],
            }));
            plan.applicants.forEach((x) => (x.assignedClassId = null));
            plan.state = "CLASSES_READY";
          } else if (op === "admissionPreviewAllocation") {
            if (
              !["CLASSES_READY", "PREVIEWED", "PARTIALLY_CONFIRMED"].includes(
                plan.state,
              )
            )
              admissionError("Phương án chưa sẵn sàng để phân bổ.");
            allocate(plan);
            summarize(plan, suitable(plan.capacity));
          } else if (op === "admissionAdjustAssignments") {
            if (!["PREVIEWED", "PARTIALLY_CONFIRMED"].includes(plan.state))
              admissionError("Cần xem phân bổ trước khi điều chỉnh.");
            const list = values.assignments as {
              applicantId: number;
              classId: number;
            }[];
            if (
              !Array.isArray(list) ||
              !list.length ||
              new Set(list.map((x) => x.applicantId)).size !== list.length
            )
              admissionError(
                "Danh sách điều chỉnh phải có hồ sơ và không lặp.",
                4135,
                "assignments",
              );
            for (const x of list) {
              const row = plan.applicants.find((a) => a.id === x.applicantId);
              if (
                !row ||
                !["VALID", "FAILED"].includes(row.state) ||
                !plan.classes.some((c) => c.id === x.classId)
              )
                admissionError(
                  "Chỉ chuyển hồ sơ chưa nhập học vào lớp thuộc phương án.",
                  4135,
                );
              row.assignedClassId = x.classId;
            }
            summarize(plan, suitable(plan.capacity));
            if (
              plan.classes.some((c) => c.assignedSize > c.maximum + c.reserve)
            )
              admissionError("Lớp vượt sĩ số kể cả dự phòng.", 4135);
          } else if (op === "admissionConfirmEnrollment") {
            if (plan.state !== "CONFIRMED") {
              if (!["PREVIEWED", "PARTIALLY_CONFIRMED"].includes(plan.state))
                admissionError("Cần xem phân bổ trước khi xác nhận.");
              checkExceptions(
                plan.classes.map((c) => c.assignedSize),
                plan.capacity,
                values,
              );
              const pending = plan.applicants.filter((x) =>
                ["VALID", "FAILED"].includes(x.state),
              );
              if (pending.some((x) => !x.assignedClassId))
                admissionError("Còn hồ sơ hợp lệ chưa được phân lớp.", 4135);
              const students = d.studentData.map((s) => ({ ...s.dto }));
              const classes = a.adminClasses.map((c) => ({ ...c }));
              const people = { ...a.people };
              const notifications = saved.notifications[plan.id] ?? [];
              const nameKey = (s: string) => {
                const words = s.trim().split(/\s+/);
                return `${words.pop()} ${words.join(" ")}`;
              };
              pending.sort(
                (x, y) =>
                  nameKey(x.fullName ?? "").localeCompare(
                    nameKey(y.fullName ?? ""),
                    "vi",
                  ) ||
                  (x.applicationCode ?? "").localeCompare(
                    y.applicationCode ?? "",
                  ),
              );
              for (const row of pending) {
                try {
                  const cls = classes.find((c) => c.id === row.assignedClassId);
                  if (!cls) throw Error("Lớp không tồn tại.");
                  let student = students.find((s) => s.id === row.studentId);
                  const reused = !!student;
                  if (
                    !student &&
                    (cls.currentSize ?? 0) >=
                      plan.capacity.maximum + plan.capacity.reserve
                  )
                    throw Error("Lớp đã đầy kể cả dự phòng.");
                  if (!student) {
                    student = createStudent(
                      {
                        fullName: row.fullName!,
                        dateOfBirth: row.dateOfBirth ?? undefined,
                        email: row.email ?? "",
                        phone: row.phone ?? "",
                        citizenId: row.citizenId!,
                        majorId: plan.majorId,
                        cohortId: plan.cohortId,
                        administrativeClassId: cls.id,
                        trainingType: "CHINH_QUY",
                        entranceScore: row.entranceScore ?? undefined,
                        reason: `Nhập học ${row.applicationCode}`,
                      },
                      students,
                      classes.map((c) => ({
                        ...c,
                        maxCapacity:
                          c.id === cls.id
                            ? plan.capacity.maximum + plan.capacity.reserve
                            : c.maxCapacity,
                      })),
                    );
                    await auth.provisionAccounts([
                      {
                        username: student.studentCode,
                        fullName: student.fullName,
                        email: student.email,
                        role: "STUDENT",
                      },
                    ]);
                    students.push(student);
                  }
                  row.studentId = student.id;
                  row.studentCode = student.studentCode;
                  row.reusingAccount = reused;
                  row.state = "ENROLLED";
                  row.error = null;
                  people[student.studentCode] = {
                    ...people[student.studentCode],
                    citizenId: row.citizenId ?? undefined,
                  };
                  if (!reused) cls.currentSize = (cls.currentSize ?? 0) + 1;
                  notifications.push({
                    id: plan.id * 100000 + row.id,
                    admissionId: plan.id * 100000 + row.id,
                    state: row.email ? "PENDING" : "SKIPPED",
                    failureCount: 0,
                    error: row.email
                      ? "Chưa kết nối dịch vụ email."
                      : "NO_EMAIL",
                  });
                } catch (e) {
                  row.state = "FAILED";
                  row.error =
                    e instanceof Error ? e.message : "Không thể tạo hồ sơ.";
                }
              }
              d.updateStudents(students.map(studentView));
              a.setAdminClasses(classes);
              a.setPeople(people);
              saved.notifications[plan.id] = notifications;
              plan.state = plan.applicants.some((x) => x.state === "FAILED")
                ? "PARTIALLY_CONFIRMED"
                : "CONFIRMED";
              summarize(plan, suitable(plan.capacity));
              plan.revision++;
              persist();
            }
            return clone({
              planId: plan.id,
              revision: plan.revision,
              state: plan.state,
              enrolled: plan.applicants.filter((x) => x.state === "ENROLLED")
                .length,
              failed: plan.applicants.filter((x) => x.state === "FAILED")
                .length,
              skipped: plan.applicants.filter((x) => !counted(x)).length,
              applicants: plan.applicants,
            }) as T;
          } else admissionError("Thao tác chưa được hỗ trợ.");
          plan.revision++;
          persist();
          return clone(plan) as T;
        } finally {
          busy.current = false;
        }
        function merge(
          plan: AdmissionPlanResponse,
          parsed: AdmissionApplicantResponse[],
        ) {
          const preserved = plan.applicants.filter(
            (x) => x.state === "ENROLLED",
          );
          let next = Math.max(0, ...plan.applicants.map((x) => x.id));
          const incoming: AdmissionApplicantResponse[] = [];
          for (const row of parsed) {
            row.id = ++next;
            if (row.state === "INVALID") {
              incoming.push(row);
              continue;
            }
            const prev = [
              ...saved.plans.flatMap((p) =>
                p.applicants.filter((x) => x.state === "ENROLLED"),
              ),
              ...incoming,
            ].find((x) => x.applicationCode === row.applicationCode);
            if (prev) {
              if (
                preserved.some(
                  (x) => x.applicationCode === prev.applicationCode,
                ) &&
                same(prev, row)
              )
                continue;
              row.state = same(prev, row) ? "EXISTING" : "CONFLICT";
              row.error = same(prev, row)
                ? "Hồ sơ đã được ghi nhận."
                : "Mã hồ sơ trùng nhưng thông tin khác.";
            } else if (
              [...incoming, ...preserved].some(
                (x) => x.citizenId === row.citizenId,
              )
            ) {
              row.state = "CONFLICT";
              row.error =
                "Một CCCD xuất hiện với nhiều mã hồ sơ trong cùng phương án.";
            } else {
              const existing = d.studentData.find(
                (s) =>
                  (s.dto.citizenId ?? a.people[s.id]?.citizenId) ===
                    row.citizenId && s.dto.activityStatus !== "DELETED",
              );
              if (existing) {
                row.studentId = existing.dto.id;
                row.studentCode = existing.id;
                row.reusingAccount = true;
                const account = auth.users.find(
                  (u) => u.username === existing.id,
                );
                if (account?.status !== "ACTIVE")
                  row.warnings.push(
                    "Tài khoản dùng lại giữ nguyên trạng thái khóa/ngừng hoạt động.",
                  );
              }
            }
            incoming.push(row);
          }
          const identities = new Map<string, Set<string>>();
          for (const row of [...preserved, ...incoming])
            if (row.citizenId && row.applicationCode) {
              const codes = identities.get(row.citizenId) ?? new Set<string>();
              codes.add(row.applicationCode);
              identities.set(row.citizenId, codes);
            }
          for (const row of incoming)
            if (
              row.state === "VALID" &&
              row.citizenId &&
              (identities.get(row.citizenId)?.size ?? 0) > 1
            ) {
              row.state = "CONFLICT";
              row.error =
                "Một CCCD xuất hiện với nhiều mã hồ sơ trong cùng phương án.";
            }
          plan.applicants = [...preserved, ...incoming];
        }
      },
    }),
    [],
  );
}
