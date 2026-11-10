import type {
  AdmissionCapacity,
  AdmissionPlanResponse,
  AdmissionScenario,
  AdmissionApplicantResponse,
} from "../api/backendContract";
import { ApiError } from "../api/httpClient";
export const counted = (a: AdmissionApplicantResponse) =>
  ["VALID", "FAILED", "ENROLLED"].includes(a.state);
export function admissionError(
  message: string,
  code = 4134,
  field = "_form",
): never {
  throw new ApiError(message, code === 4130 ? 404 : 409, code, [
    { field, message },
  ]);
}
export function capacity(values: Record<string, unknown>): AdmissionCapacity {
  const c = {
    minimum: Number(values.minCapacity ?? 40),
    maximum: Number(values.maxCapacity ?? 50),
    reserve: Number(values.reserveCapacity ?? 15),
  };
  if (
    !Object.values(c).every(Number.isInteger) ||
    c.minimum < 1 ||
    c.maximum < c.minimum ||
    c.reserve < 0 ||
    c.maximum + c.reserve > 99
  )
    admissionError(
      "Sĩ số phải là số nguyên: 0 < tối thiểu ≤ tối đa, dự phòng ≥ 0 và tối đa + dự phòng ≤ 99.",
      4131,
      "minCapacity",
    );
  return c;
}
export function scenarios(
  total: number,
  c: AdmissionCapacity,
  rooms: number,
): AdmissionScenario[] {
  if (!total) return [];
  const result: AdmissionScenario[] = [];
  for (let n = 1; n <= 99; n++) {
    const sizes = Array.from(
      { length: n },
      (_, i) => Math.floor(total / n) + (i < total % n ? 1 : 0),
    );
    if (!sizes.at(-1) || sizes[0] > c.maximum + c.reserve) continue;
    const below = sizes.some((x) => x < c.minimum),
      reserveUsed = sizes.reduce((s, x) => s + Math.max(0, x - c.maximum), 0);
    if (below && n > Math.ceil(total / c.minimum)) continue;
    result.push({
      classCount: n,
      targetSizes: sizes,
      level: below ? "BELOW_MINIMUM" : reserveUsed ? "RESERVE" : "NORMAL",
      reserveUsed,
      belowMinimum: below,
      insufficientRooms: rooms < n,
      suitableRooms: rooms,
      requiredRoomCapacity: c.maximum + c.reserve,
      recommended: false,
      warnings:
        rooms < n
          ? [
              "Chưa đủ phòng phù hợp. Đây là cảnh báo, chưa đặt phòng hoặc xếp lịch.",
            ]
          : [],
    });
  }
  result.sort(
    (a, b) =>
      ["NORMAL", "RESERVE", "BELOW_MINIMUM"].indexOf(a.level) -
        ["NORMAL", "RESERVE", "BELOW_MINIMUM"].indexOf(b.level) ||
      a.classCount - b.classCount,
  );
  if (result[0]) result[0].recommended = true;
  return result;
}
export function summarize(
  plan: AdmissionPlanResponse,
  rooms: number,
  fromApplicants = true,
) {
  if (fromApplicants)
    plan.totalStudents = plan.applicants.filter(counted).length;
  plan.scenarios = scenarios(plan.totalStudents, plan.capacity, rooms);
  const means: number[] = [];
  for (const c of plan.classes) {
    const rows = plan.applicants.filter(
      (a) => counted(a) && a.assignedClassId === c.id,
    );
    c.assignedSize = rows.length;
    c.applicantIds = rows.map((a) => a.id);
    c.reserveUsed = Math.max(0, rows.length - c.maximum);
    c.averageScore = rows.length
      ? rows.reduce((s, a) => s + (a.entranceScore ?? 0), 0) / rows.length
      : null;
    if (c.averageScore !== null) means.push(c.averageScore);
  }
  plan.averageScoreDifference = means.length
    ? Math.max(...means) - Math.min(...means)
    : 0;
  plan.warnings = [];
  for (const c of plan.classes) {
    const names = new Map<string, number>();
    for (const a of plan.applicants.filter(
      (a) => counted(a) && a.assignedClassId === c.id,
    )) {
      const name = (a.fullName ?? "").normalize("NFC").toLocaleLowerCase("vi");
      names.set(name, (names.get(name) ?? 0) + 1);
    }
    if ([...names.values()].some((n) => n > 3))
      plan.warnings.push(
        `${c.className}: còn hơn ba sinh viên trùng họ tên; cần xem lại phân bổ.`,
      );
  }
  return plan;
}
export function checkExceptions(
  sizes: number[],
  c: AdmissionCapacity,
  body: Record<string, unknown>,
) {
  if (sizes.some((n) => n > c.maximum + c.reserve))
    admissionError("Sĩ số vượt cả mức dự phòng.", 4135);
  if (sizes.some((n) => n > c.maximum) && body.acceptReserve !== true)
    admissionError(
      "Cần xác nhận sử dụng sĩ số dự phòng.",
      4133,
      "acceptReserve",
    );
  if (
    sizes.some((n) => n < c.minimum) &&
    (body.acceptBelowMinimum !== true || !String(body.reason ?? "").trim())
  )
    admissionError(
      "Cần xác nhận dưới sĩ số tối thiểu và nhập lý do.",
      4133,
      "reason",
    );
  if (String(body.reason ?? "").trim().length > 500)
    admissionError("Lý do tối đa 500 ký tự.", 4133, "reason");
}
export function allocate(plan: AdmissionPlanResponse) {
  if (!plan.classes.length || !plan.applicants.some(counted))
    admissionError("Cần chuẩn bị lớp và nhập hồ sơ hợp lệ trước khi phân bổ.");
  const sizes = plan.classes.map(
    (c) =>
      plan.applicants.filter(
        (a) => a.state === "ENROLLED" && a.assignedClassId === c.id,
      ).length,
  );
  const targets = plan.classes.map(
    (_, i) =>
      Math.floor(plan.totalStudents / plan.classes.length) +
      (i < plan.totalStudents % plan.classes.length ? 1 : 0),
  );
  if (
    sizes.some((n, i) => n > targets[i]) ||
    targets.some((n) => n > plan.capacity.maximum + plan.capacity.reserve)
  )
    admissionError(
      "Không thể cân bằng mà vẫn giữ lớp của sinh viên đã nhập học. Cần phương án khác.",
      4135,
    );
  const rows = plan.applicants
    .filter((a) => ["VALID", "FAILED"].includes(a.state))
    .sort(
      (a, b) =>
        (b.entranceScore ?? 0) - (a.entranceScore ?? 0) ||
        (a.fullName ?? "").localeCompare(b.fullName ?? "", "vi"),
    );
  let cursor = 0,
    direction = 1;
  for (const a of rows) {
    let tries = 0;
    while (sizes[cursor] >= targets[cursor]) {
      cursor += direction;
      if (cursor >= sizes.length) {
        cursor = sizes.length - 1;
        direction = -1;
      }
      if (cursor < 0) {
        cursor = 0;
        direction = 1;
      }
      if (++tries > sizes.length * 4)
        admissionError("Không còn chỗ phân bổ.", 4135);
    }
    a.assignedClassId = plan.classes[cursor].id;
    sizes[cursor]++;
    cursor += direction;
    if (cursor >= sizes.length) {
      cursor = sizes.length - 1;
      direction = -1;
    }
    if (cursor < 0) {
      cursor = 0;
      direction = 1;
    }
  }
  // Prefer at most three identical names per class without moving enrolled rows.
  const name = (a: AdmissionApplicantResponse) =>
    (a.fullName ?? "").normalize("NFC").trim().toLocaleLowerCase("vi");
  for (let i = 0; i < plan.classes.length; i++) {
    const classId = plan.classes[i].id;
    const group = () =>
      plan.applicants.filter(
        (a) => counted(a) && a.assignedClassId === classId,
      );
    for (const row of group().filter((a) => a.state !== "ENROLLED")) {
      if (group().filter((a) => name(a) === name(row)).length <= 3) continue;
      for (const j of [i - 1, i + 1].filter(
        (j) => j >= 0 && j < plan.classes.length,
      )) {
        const neighborId = plan.classes[j].id;
        const other = plan.applicants.filter(
          (a) => counted(a) && a.assignedClassId === neighborId,
        );
        const candidate = other.find(
          (a) =>
            a.state !== "ENROLLED" &&
            name(a) !== name(row) &&
            other.filter((b) => name(b) === name(row)).length < 3 &&
            group().filter((b) => name(b) === name(a)).length < 3,
        );
        if (candidate) {
          row.assignedClassId = neighborId;
          candidate.assignedClassId = classId;
          break;
        }
      }
    }
  }
  plan.classes.forEach((c, i) => (c.targetSize = targets[i]));
  plan.state = "PREVIEWED";
}
export const suffix = (n: number): string =>
  n <= 26
    ? String.fromCharCode(64 + n)
    : suffix(Math.floor((n - 1) / 26)) +
      String.fromCharCode(65 + ((n - 1) % 26));
