import { useEffect, useState } from "react";
import { admissionExceptionErrors } from "./admissionValidation";
import type {
  AdmissionPlanResponse as Plan,
  AdmissionCapacity,
  AdmissionConfirmationResponse,
  AdmissionNotificationResponse,
  AdministrativeClassResponse,
} from "../../services/api/backendContract";
import { API_URLS } from "../../services/api/backendContract";
import { ApiError, downloadApiFile } from "../../services/api/httpClient";
import { useLiveRequest } from "./client";
import type { Op } from "./catalog";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
export interface AdmissionStore {
  request: <T>(
    op: Op,
    id?: number | string,
    body?: unknown,
    query?: URLSearchParams,
  ) => Promise<T>;
  downloadTemplate: (majorId: number, cohortId: number) => Promise<void>;
}
const states: Record<string, string> = {
  DRAFT: "Đang lập phương án",
  CLASSES_READY: "Đã chuẩn bị lớp",
  PREVIEWED: "Đã phân bổ",
  CONFIRMING: "Đang xác nhận",
  PARTIALLY_CONFIRMED: "Hoàn tất một phần",
  CONFIRMED: "Đã hoàn tất",
  VALID: "Hợp lệ",
  INVALID: "Sai dữ liệu",
  CONFLICT: "Xung đột",
  EXISTING: "Đã tồn tại — bỏ qua",
  ENROLLED: "Đã nhập học",
  FAILED: "Thất bại",
  PENDING: "Đang chờ",
  SENT: "Đã gửi",
  SKIPPED: "Không gửi",
  NORMAL: "Sĩ số tiêu chuẩn",
  RESERVE: "Dùng dự phòng",
  BELOW_MINIMUM: "Dưới sĩ số tối thiểu",
};
export function Admission() {
  const request = useLiveRequest();
  const { session, clearSession, requirePasswordChange } = useAuth();
  return (
    <AdmissionScreen
      store={{
        request,
        downloadTemplate: async (majorId, cohortId) => {
          try {
            await downloadApiFile(
              API_URLS.admissions.template +
                `?majorId=${majorId}&cohortId=${cohortId}`,
              session?.accessToken,
              "cau-truc-nhap-hoc.xlsx",
            );
          } catch (e) {
            if (e instanceof ApiError && e.status === 401 && e.code !== 4003)
              clearSession();
            if (e instanceof ApiError && e.status === 403 && e.code === 4006)
              requirePasswordChange();
            throw e;
          }
        },
      }}
    />
  );
}
export function AdmissionScreen({ store }: { store: AdmissionStore }) {
  const { notify, notifyError } = useUI();
  const [plan, setPlan] = useState<Plan>();
  const [major, setMajor] = useState(""),
    [cohort, setCohort] = useState(""),
    [total, setTotal] = useState(""),
    [resume, setResume] = useState("");
  const [capacity, setCapacity] = useState<AdmissionCapacity>({
    minimum: 40,
    maximum: 50,
    reserve: 15,
  });
  const [capacityError, setCapacityError] = useState("");
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false),
    [errors, setErrors] = useState<Record<string, string>>({});
  const [count, setCount] = useState(""),
    [reuse, setReuse] = useState("auto"),
    [chosen, setChosen] = useState<number[]>([]),
    [available, setAvailable] = useState<AdministrativeClassResponse[]>([]);
  const [acceptReserve, setAcceptReserve] = useState(false),
    [acceptBelow, setAcceptBelow] = useState(false),
    [reason, setReason] = useState("");
  const [keyword, setKeyword] = useState(""),
    [classFilter, setClassFilter] = useState(""),
    [stateFilter, setStateFilter] = useState("");
  const [result, setResult] = useState<AdmissionConfirmationResponse>(),
    [notifications, setNotifications] =
      useState<AdmissionNotificationResponse[]>();
  const [page, setPage] = useState(0);
  useEffect(() => {
    let active = true;
    store
      .request<AdmissionCapacity>("admissionConfiguration")
      .then((c) => {
        if (active) setCapacity(c);
      })
      .catch((e) => {
        if (active) setCapacityError(e.message);
      });
    return () => {
      active = false;
    };
  }, [store.request]);
  function apply(p: Plan) {
    if (plan?.id !== p.id) {
      setKeyword("");
      setClassFilter("");
      setStateFilter("");
      setResult(undefined);
    }
    setPlan(p);
    setResume(String(p.id));
    setCount(p.selectedClassCount ? String(p.selectedClassCount) : "");
    setPage(0);
    setNotifications(undefined);
  }
  function showErrors(e: unknown) {
    const map: Record<string, string> = {};
    if (e instanceof ApiError)
      for (const v of e.errors)
        map[v.field] = [map[v.field], v.message].filter(Boolean).join(" ");
    map._form = e instanceof Error ? e.message : "Không thể thực hiện tác vụ.";
    if (e instanceof ApiError && e.code === 4132)
      map._form += " Hãy tải lại phương án trước khi thao tác tiếp.";
    setErrors(map);
  }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setErrors({});
    try {
      await action();
    } catch (e) {
      showErrors(e);
    } finally {
      setBusy(false);
    }
  }
  const fieldError = (key: string) =>
    errors[key] ? (
      <span className="field-error" role="alert">
        {errors[key]}
      </span>
    ) : null;
  function scope() {
    const e: Record<string, string> = {};
    if (!Number.isSafeInteger(+major) || +major < 1)
      e.majorId = "Nhập ID ngành hợp lệ.";
    if (!Number.isSafeInteger(+cohort) || +cohort < 1)
      e.cohortId = "Nhập ID khóa hợp lệ.";
    return e;
  }
  function capacityErrors() {
    const e: Record<string, string> = {};
    if (!Number.isInteger(capacity.minimum) || capacity.minimum < 1)
      e.minCapacity = "Sĩ số tối thiểu phải là số nguyên dương.";
    if (
      !Number.isInteger(capacity.maximum) ||
      capacity.maximum < capacity.minimum
    )
      e.maxCapacity = "Sĩ số tối đa phải lớn hơn hoặc bằng tối thiểu.";
    if (
      !Number.isInteger(capacity.reserve) ||
      capacity.reserve < 0 ||
      capacity.maximum + capacity.reserve > 99
    )
      e.reserveCapacity =
        "Dự phòng không âm; tối đa cộng dự phòng không vượt 99.";
    return e;
  }
  function fileErrors(): Record<string, string> {
    return !file ||
      !file.size ||
      !file.name.toLowerCase().endsWith(".xlsx") ||
      file.size > 20 * 1024 * 1024
      ? { file: "Chọn file .xlsx có dữ liệu, tối đa 20 MB." }
      : {};
  }
  async function loadClasses(p: Plan) {
    setAvailable([]);
    try {
      setAvailable(
        await store.request<AdministrativeClassResponse[]>(
          "administrativeClassesSearch",
          undefined,
          undefined,
          new URLSearchParams({
            majorId: String(p.majorId),
            cohortId: String(p.cohortId),
          }),
        ),
      );
    } catch (e) {
      notifyError(
        e instanceof Error ? e.message : "Không tải được lớp hành chính.",
      );
    }
  }
  async function created(p: Plan) {
    apply(p);
    setResult(undefined);
    setChosen([]);
    setAcceptReserve(false);
    setAcceptBelow(false);
    setReason("");
    await loadClasses(p);
  }
  const selectedScenario = plan?.scenarios.find(
    (s) => s.classCount === Number(count),
  );
  function exceptions(confirming = false) {
    return admissionExceptionErrors(
      selectedScenario,
      plan?.classes ?? [],
      confirming,
      acceptReserve,
      acceptBelow,
      reason,
    );
  }
  const locked = plan?.state === "CONFIRMING" || plan?.state === "CONFIRMED";
  const filtered = (plan?.applicants ?? []).filter(
    (a) =>
      (!classFilter || String(a.assignedClassId) === classFilter) &&
      (!stateFilter || a.state === stateFilter) &&
      [a.fullName, a.applicationCode, a.citizenId].some((x) =>
        (x ?? "")
          .toLocaleLowerCase("vi")
          .includes(keyword.trim().toLocaleLowerCase("vi")),
      ),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Phân luồng nhập học</h1>
          <p>
            Lập phương án → Chuẩn bị lớp → Phân bổ và điều chỉnh → Xác nhận nhập
            học.
          </p>
        </div>
      </div>
      <section className="card admissions-card">
        <h2>Mở lại phương án</h2>
        <form
          className="admission-inline"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!Number.isSafeInteger(+resume) || +resume < 1) {
              setErrors({ planId: "Nhập mã phương án hợp lệ." });
              return;
            }
            void run(async () =>
              created(await store.request<Plan>("admissionPlanGet", +resume)),
            );
          }}
        >
          <label>
            Mã phương án
            <input
              type="number"
              min="1"
              value={resume}
              onChange={(e) => setResume(e.target.value)}
            />
            {fieldError("planId")}
          </label>
          <button className="btn" disabled={busy}>
            Tải phương án
          </button>
        </form>
      </section>
      {!plan ? (
        <section className="card admissions-card">
          <h2>1. Lập phương án nhập học</h2>
          <p>
            Chọn đúng ID ngành và khóa được nhà trường cung cấp. File danh sách
            chỉ thuộc một ngành, một khóa.
          </p>
          {capacityError && (
            <p className="field-error">
              Không tải được cấu hình: {capacityError}. Kiểm tra sĩ số trước khi
              tạo.
            </p>
          )}
          <fieldset disabled={busy}>
            <div className="academic-fields">
              <label>
                ID ngành
                <input
                  type="number"
                  min="1"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                />
                {fieldError("majorId")}
              </label>
              <label>
                ID khóa
                <input
                  type="number"
                  min="1"
                  value={cohort}
                  onChange={(e) => setCohort(e.target.value)}
                />
                {fieldError("cohortId")}
              </label>
              {(
                [
                  ["minimum", "minCapacity", "Sĩ số tối thiểu"],
                  ["maximum", "maxCapacity", "Sĩ số tối đa"],
                  ["reserve", "reserveCapacity", "Sĩ số dự phòng"],
                ] as const
              ).map(([k, err, label]) => (
                <label key={k}>
                  {label}
                  <input
                    type="number"
                    min={k === "reserve" ? 0 : 1}
                    value={capacity[k]}
                    onChange={(e) =>
                      setCapacity({ ...capacity, [k]: Number(e.target.value) })
                    }
                  />
                  {fieldError(err)}
                </label>
              ))}
            </div>
            <div className="admission-actions">
              <button
                className="btn"
                onClick={() => {
                  const e = scope();
                  setErrors(e);
                  if (Object.keys(e).length) return;
                  void run(async () => {
                    await store.downloadTemplate(+major, +cohort);
                    notify("Đã tải cấu trúc danh sách.");
                  });
                }}
              >
                Tải cấu trúc danh sách
              </button>
            </div>
            <label>
              Danh sách trúng tuyển (.xlsx)
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => setFile(e.target.files?.[0])}
              />
              {fieldError("file")}
            </label>
            <p>
              CCCD phải là ô văn bản đủ 12 chữ số. Email và ngày sinh không bắt
              buộc. Tải mẫu theo ngành đã chọn trước khi nhập.
            </p>
            <div className="admission-actions">
              <button
                className="btn primary"
                onClick={() => {
                  const e = {
                    ...scope(),
                    ...capacityErrors(),
                    ...fileErrors(),
                  };
                  setErrors(e);
                  if (Object.keys(e).length) return;
                  void run(async () => {
                    const body = new FormData();
                    body.set("file", file!);
                    body.set("majorId", major);
                    body.set("cohortId", cohort);
                    body.set("minCapacity", String(capacity.minimum));
                    body.set("maxCapacity", String(capacity.maximum));
                    body.set("reserveCapacity", String(capacity.reserve));
                    await created(
                      await store.request<Plan>(
                        "admissionImportPlan",
                        undefined,
                        body,
                      ),
                    );
                    notify(
                      "Đã đọc danh sách và lập phương án. Kiểm tra các hồ sơ trước khi xác nhận.",
                    );
                  });
                }}
              >
                Kiểm tra danh sách và lập phương án
              </button>
            </div>
            <hr />
            <label>
              Số sinh viên dự kiến
              <input
                type="number"
                min="0"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
              />
              {fieldError("totalStudents")}
            </label>
            <div className="admission-actions">
              <button
                className="btn"
                onClick={() => {
                  const e = { ...scope(), ...capacityErrors() };
                  if (
                    total === "" ||
                    !Number.isSafeInteger(+total) ||
                    +total < 0
                  )
                    e.totalStudents = "Nhập số sinh viên dự kiến không âm.";
                  setErrors(e);
                  if (Object.keys(e).length) return;
                  void run(async () => {
                    await created(
                      await store.request<Plan>(
                        "admissionCreatePlan",
                        undefined,
                        {
                          majorId: +major,
                          cohortId: +cohort,
                          totalStudents: +total,
                          minCapacity: capacity.minimum,
                          maxCapacity: capacity.maximum,
                          reserveCapacity: capacity.reserve,
                        },
                      ),
                    );
                    notify("Đã lập phương án dự kiến.");
                  });
                }}
              >
                Lập phương án theo số dự kiến
              </button>
            </div>
          </fieldset>
        </section>
      ) : (
        <>
          <section className="card admissions-card">
            <div className="management-toolbar">
              <h2>Phương án #{plan.id}</h2>
              <span className="badge">{states[plan.state]}</span>
              <button
                className="btn"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    apply(
                      await store.request<Plan>("admissionPlanGet", plan.id),
                    );
                  })
                }
              >
                Tải lại dữ liệu
              </button>
              <button
                className="btn"
                disabled={busy}
                onClick={() => {
                  setPlan(undefined);
                  setResult(undefined);
                  setErrors({});
                  setFile(undefined);
                }}
              >
                Lập phương án khác
              </button>
            </div>
            <p>
              Ngành #{plan.majorId} · Khóa #{plan.cohortId} ·{" "}
              {plan.totalStudents} hồ sơ tính vào đợt · Phiên bản{" "}
              {plan.revision}
            </p>
            {plan.warnings.map((w, i) => (
              <p key={i} className="admission-warning">
                {w}
              </p>
            ))}
            <details>
              <summary>Nhập hoặc bổ sung danh sách thực tế</summary>
              <fieldset disabled={busy || locked}>
                <label>
                  File .xlsx
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => setFile(e.target.files?.[0])}
                  />
                  {fieldError("file")}
                </label>
                <p>
                  Hồ sơ đã nhập học thành công được giữ nguyên. Không sửa ngành
                  hoặc khóa bằng file bổ sung.
                </p>
                <button
                  className="btn"
                  onClick={() => {
                    const e = fileErrors();
                    setErrors(e);
                    if (Object.keys(e).length) return;
                    void run(async () => {
                      const body = new FormData();
                      body.set("file", file!);
                      body.set("expectedRevision", String(plan.revision));
                      apply(
                        await store.request<Plan>(
                          "admissionImportApplicants",
                          plan.id,
                          body,
                        ),
                      );
                      setResult(undefined);
                      notify(
                        "Đã cập nhật danh sách. Kiểm tra lại phương án phân lớp.",
                      );
                    });
                  }}
                >
                  Kiểm tra file bổ sung
                </button>
              </fieldset>
            </details>
          </section>
          <section className="card admissions-card">
            <h2>2. Chuẩn bị lớp hành chính</h2>
            <fieldset
              disabled={
                busy ||
                locked ||
                plan.applicants.some((a) => a.state === "ENROLLED")
              }
            >
              <div className="academic-fields">
                <label>
                  Phương án số lớp
                  <select
                    value={count}
                    onChange={(e) => {
                      setCount(e.target.value);
                      setAcceptReserve(false);
                      setAcceptBelow(false);
                    }}
                  >
                    <option value="">Chọn phương án</option>
                    {plan.scenarios.map((s) => (
                      <option key={s.classCount} value={s.classCount}>
                        {s.classCount} lớp · {states[s.level]}
                        {s.recommended ? " · Đề xuất" : ""} ·{" "}
                        {s.targetSizes.join(" / ")} sinh viên
                      </option>
                    ))}
                  </select>
                  {fieldError("classCount")}
                </label>
                <label>
                  Cách chuẩn bị lớp
                  <select
                    value={reuse}
                    onChange={(e) => setReuse(e.target.value)}
                  >
                    <option value="auto">
                      Dùng lớp trống phù hợp, tạo phần thiếu
                    </option>
                    <option value="new">Tạo mới toàn bộ</option>
                    <option value="selected">Chọn lớp trống để dùng lại</option>
                  </select>
                </label>
              </div>
              {reuse === "selected" && (
                <div className="admission-choices">
                  {available
                    .filter((c) => c.availableForAdmission)
                    .map((c) => (
                      <label key={c.id}>
                        <input
                          type="checkbox"
                          checked={chosen.includes(c.id)}
                          onChange={(e) =>
                            setChosen(
                              e.target.checked
                                ? [...chosen, c.id]
                                : chosen.filter((id) => id !== c.id),
                            )
                          }
                        />
                        {c.className}
                      </label>
                    ))}
                  {!available.some((c) => c.availableForAdmission) && (
                    <p>Không có lớp trống đủ điều kiện.</p>
                  )}
                  {fieldError("existingClassIds")}
                </div>
              )}
              {selectedScenario?.warnings.map((w, i) => (
                <p key={i} className="admission-warning">
                  {w}
                </p>
              ))}
              {selectedScenario?.insufficientRooms && (
                <p className="admission-warning">
                  Số phòng phù hợp ít hơn số lớp. Đây là cảnh báo nguồn phòng,
                  chưa phải xếp lịch.
                </p>
              )}
              <div className="admission-actions">
                <button
                  className="btn primary"
                  onClick={() => {
                    const e = exceptions();
                    if (!selectedScenario)
                      e.classCount = "Vui lòng chọn một phương án số lớp.";
                    if (
                      reuse === "selected" &&
                      (!chosen.length || chosen.length > Number(count))
                    )
                      e.existingClassIds =
                        "Chọn từ 1 đến số lớp của phương án.";
                    setErrors(e);
                    if (Object.keys(e).length) return;
                    void run(async () => {
                      apply(
                        await store.request<Plan>(
                          "admissionPrepareClasses",
                          undefined,
                          {
                            planId: plan.id,
                            expectedRevision: plan.revision,
                            classCount: Number(count),
                            ...(reuse === "auto"
                              ? {}
                              : {
                                  existingClassIds:
                                    reuse === "new" ? [] : chosen,
                                }),
                            acceptReserve,
                            acceptBelowMinimum: acceptBelow,
                            reason: reason.trim() || null,
                          },
                        ),
                      );
                      notify("Đã chuẩn bị lớp hành chính.");
                    });
                  }}
                >
                  Chuẩn bị lớp theo phương án
                </button>
              </div>
            </fieldset>
            <fieldset disabled={busy || locked}>
              <div className="admission-choices">
                <label>
                  <input
                    type="checkbox"
                    checked={acceptReserve}
                    onChange={(e) => setAcceptReserve(e.target.checked)}
                  />
                  Chấp nhận sử dụng sĩ số dự phòng{fieldError("acceptReserve")}
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={acceptBelow}
                    onChange={(e) => setAcceptBelow(e.target.checked)}
                  />
                  Chấp nhận lớp dưới sĩ số tối thiểu
                  {fieldError("acceptBelowMinimum")}
                </label>
              </div>
              <label>
                Lý do chấp nhận ngoại lệ
                <textarea
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                {fieldError("reason")}
              </label>
            </fieldset>
          </section>
          <section className="card admissions-card">
            <h2>3. Phân bổ và điều chỉnh</h2>
            <div className="admission-actions">
              <button
                className="btn primary"
                disabled={
                  busy ||
                  locked ||
                  !plan.classes.length ||
                  !plan.applicants.some(
                    (a) => a.state === "VALID" || a.state === "FAILED",
                  )
                }
                onClick={() =>
                  void run(async () => {
                    apply(
                      await store.request<Plan>(
                        "admissionPreviewAllocation",
                        plan.id,
                        { expectedRevision: plan.revision },
                      ),
                    );
                    notify(
                      "Đã phân bổ sinh viên. Kiểm tra danh sách trước khi xác nhận.",
                    );
                  })
                }
              >
                Kiểm tra và phân lớp
              </button>
            </div>
            <div className="admission-class-grid">
              {plan.classes.map((c) => (
                <div className="admission-class-card" key={c.id}>
                  <strong>{c.className}</strong>
                  <p>
                    {c.assignedSize} phân bổ · Chỉ tiêu {c.targetSize}
                  </p>
                  <small>
                    Sĩ số hiện tại {c.currentSize} · Tối đa {c.maximum} +{" "}
                    {c.reserve} dự phòng
                  </small>
                  <p>
                    Điểm trung bình:{" "}
                    {c.averageScore == null ? "—" : c.averageScore.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <p>
              Chênh lệch điểm trung bình giữa các lớp:{" "}
              {plan.averageScoreDifference}
            </p>
            <div className="academic-fields">
              <label>
                Tìm họ tên, mã hồ sơ, CCCD
                <input
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <label>
                Lớp
                <select
                  value={classFilter}
                  onChange={(e) => {
                    setClassFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">Tất cả lớp</option>
                  {plan.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.className}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Trạng thái
                <select
                  value={stateFilter}
                  onChange={(e) => {
                    setStateFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">Tất cả trạng thái</option>
                  {[
                    "VALID",
                    "INVALID",
                    "CONFLICT",
                    "EXISTING",
                    "ENROLLED",
                    "FAILED",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {states[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p>
              {filtered.length} hồ sơ phù hợp / {plan.applicants.length} hồ sơ
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {[
                      "Dòng",
                      "Mã hồ sơ",
                      "Họ tên",
                      "CCCD",
                      "Điểm",
                      "Trạng thái / Lý do",
                      "Lớp phân bổ",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(page * 20, page * 20 + 20).map((a) => (
                    <tr key={a.id}>
                      <td>{a.rowNumber}</td>
                      <td>{a.applicationCode || "—"}</td>
                      <td>{a.fullName || "—"}</td>
                      <td>{a.citizenId || "—"}</td>
                      <td>{a.entranceScore ?? "—"}</td>
                      <td>
                        <span
                          className={`badge ${["INVALID", "CONFLICT", "FAILED"].includes(a.state) ? "red" : a.state === "ENROLLED" ? "green" : ""}`}
                        >
                          {states[a.state]}
                        </span>
                        {a.error && <p className="field-error">{a.error}</p>}
                        {a.warnings.map((w, i) => (
                          <p key={i}>{w}</p>
                        ))}
                        {a.studentCode && <p>MSSV: {a.studentCode}</p>}
                        {a.reusingAccount && (
                          <small>Dùng lại tài khoản hiện có</small>
                        )}
                      </td>
                      <td>
                        <select
                          aria-label={"Lớp của " + a.fullName}
                          value={a.assignedClassId ?? ""}
                          disabled={
                            busy ||
                            locked ||
                            !["PREVIEWED", "PARTIALLY_CONFIRMED"].includes(
                              plan.state,
                            ) ||
                            !["VALID", "FAILED"].includes(a.state)
                          }
                          onChange={(e) => {
                            if (!e.target.value) return;
                            const target = Number(e.target.value);
                            void run(async () => {
                              apply(
                                await store.request<Plan>(
                                  "admissionAdjustAssignments",
                                  plan.id,
                                  {
                                    expectedRevision: plan.revision,
                                    assignments: [
                                      { applicantId: a.id, classId: target },
                                    ],
                                  },
                                ),
                              );
                              notify("Đã điều chỉnh lớp.");
                            });
                          }}
                        >
                          <option value="">Chưa phân lớp</option>
                          {plan.classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.className}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && (
                <p className="empty-state">Không có hồ sơ phù hợp.</p>
              )}
            </div>
            <div className="account-pagination">
              <button
                className="btn"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                ← Trước
              </button>
              <span>
                Trang {page + 1} / {pages}
              </span>
              <button
                className="btn"
                disabled={page + 1 >= pages}
                onClick={() => setPage(page + 1)}
              >
                Sau →
              </button>
            </div>
          </section>
          <section className="card admissions-card">
            <h2>4. Xác nhận nhập học</h2>
            <p>
              Chỉ hồ sơ hợp lệ đã được phân lớp mới được xử lý. Các hồ sơ thành
              công được giữ nguyên nếu hồ sơ khác thất bại. Việc gửi email được
              theo dõi riêng.
            </p>
            <div className="admission-actions">
              <button
                className="btn primary"
                disabled={
                  busy ||
                  locked ||
                  !["PREVIEWED", "PARTIALLY_CONFIRMED"].includes(plan.state)
                }
                onClick={() => {
                  const e = exceptions(true);
                  setErrors(e);
                  if (Object.keys(e).length) return;
                  void run(async () => {
                    const r =
                      await store.request<AdmissionConfirmationResponse>(
                        "admissionConfirmEnrollment",
                        plan.id,
                        {
                          expectedRevision: plan.revision,
                          acceptReserve,
                          acceptBelowMinimum: acceptBelow,
                          reason: reason.trim() || null,
                        },
                      );
                    setResult(r);
                    setPlan({
                      ...plan,
                      revision: r.revision,
                      state: r.state,
                      applicants: r.applicants,
                    });
                    setNotifications(undefined);
                    // Confirmation returns applicants, but no refreshed class sizes.
                    // A failed read must never retry the completed enrollment write.
                    try {
                      apply(
                        await store.request<Plan>("admissionPlanGet", plan.id),
                      );
                    } catch {
                      setErrors({
                        _form:
                          "Đã nhận kết quả xác nhận nhập học, nhưng chưa tải lại được sĩ số lớp. Bấm Tải lại dữ liệu để cập nhật; không cần xác nhận lại.",
                      });
                    }
                    notify(
                      `Nhập học: ${r.enrolled} thành công, ${r.failed} thất bại, ${r.skipped} bỏ qua.`,
                      r.failed ? "warning" : "success",
                    );
                  });
                }}
              >
                Xác nhận nhập học và cấp tài khoản
              </button>
              <button
                className="btn"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    setNotifications(
                      await store.request<AdmissionNotificationResponse[]>(
                        "admissionNotifications",
                        plan.id,
                      ),
                    );
                  })
                }
              >
                Xem trạng thái email
              </button>
            </div>
            {result && (
              <p role="status">
                Kết quả: {result.enrolled} thành công · {result.failed} thất bại
                · {result.skipped} bỏ qua.
              </p>
            )}
            {notifications && (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Mã nhập học</th>
                      <th>Trạng thái email</th>
                      <th>Số lần thất bại</th>
                      <th>Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.map((n) => (
                      <tr key={n.id}>
                        <td>{n.admissionId}</td>
                        <td>{states[n.state]}</td>
                        <td>{n.failureCount}</td>
                        <td>{n.error || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!notifications.length && <p>Chưa có thông báo nhập học.</p>}
              </div>
            )}
          </section>
        </>
      )}
      {Object.keys(errors).some(
        (k) =>
          k === "_form" ||
          ![
            "_form",
            "majorId",
            "cohortId",
            "minCapacity",
            "maxCapacity",
            "reserveCapacity",
            "totalStudents",
            "file",
            "planId",
            "classCount",
            "existingClassIds",
            "acceptReserve",
            "acceptBelowMinimum",
            "reason",
          ].includes(k),
      ) && (
        <section className="card" role="alert">
          {errors._form && <p className="field-error">{errors._form}</p>}
          {Object.entries(errors)
            .filter(
              ([k]) =>
                ![
                  "_form",
                  "majorId",
                  "cohortId",
                  "minCapacity",
                  "maxCapacity",
                  "reserveCapacity",
                  "totalStudents",
                  "file",
                  "planId",
                  "classCount",
                  "existingClassIds",
                  "acceptReserve",
                  "acceptBelowMinimum",
                  "reason",
                ].includes(k),
            )
            .map(([k, v]) => (
              <p className="field-error" key={k}>
                {v}
              </p>
            ))}
        </section>
      )}
    </>
  );
}
