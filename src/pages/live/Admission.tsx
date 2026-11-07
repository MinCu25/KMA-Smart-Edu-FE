import { useEffect, useState } from "react";
import {
  Download,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Mail,
  Clock3,
  AlertCircle,
} from "lucide-react";
import { useLiveRequest } from "./client";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../services/api/httpClient";
import type {
  AdmissionPlan,
  AdmissionConfirmation,
  AdmissionNotification,
  Capacity,
} from "../../services/api/admissionTypes";
import { message } from "./ActionForm";
import "./admission.css";

const states: Record<string, string> = {
  DRAFT: "Bản nháp",
  CLASSES_READY: "Đã chuẩn bị lớp",
  PREVIEWED: "Đã phân bổ",
  CONFIRMING: "Đang xác nhận",
  PARTIALLY_CONFIRMED: "Hoàn tất một phần",
  CONFIRMED: "Đã nhập học",
  VALID: "Hợp lệ",
  INVALID: "Không hợp lệ",
  CONFLICT: "Mâu thuẫn",
  EXISTING: "Đã tồn tại",
  ENROLLED: "Đã nhập học",
  FAILED: "Thất bại",
  PENDING: "Chờ gửi",
  SENT: "Đã gửi",
  PROCESSING: "Đang gửi",
};
export function Admission() {
  const request = useLiveRequest();
  const { session, clearSession } = useAuth();
  const [plan, setPlan] = useState<AdmissionPlan>();
  const [result, setResult] = useState<AdmissionConfirmation>();
  const [notifications, setNotifications] = useState<AdmissionNotification[]>();
  const [notificationError, setNotificationError] = useState("");
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [capacity, setCapacity] = useState<Record<keyof Capacity, string>>();
  const [majorId, setMajor] = useState("");
  const [cohortId, setCohort] = useState("");
  const [total, setTotal] = useState("");
  const [entryMode, setEntryMode] = useState<"file" | "estimate">("file");
  const [planId, setPlanId] = useState(
    () => sessionStorage.getItem("admission-plan-id") || "",
  );
  const [file, setFile] = useState<File>();
  const [showUpload, setShowUpload] = useState(false);
  const [count, setCount] = useState(0);
  const [reserve, setReserve] = useState(false);
  const [below, setBelow] = useState(false);
  const [reason, setReason] = useState("");
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  useEffect(() => {
    let active = true;
    request<Capacity>("admissionConfiguration")
      .then((c) => {
        if (active)
          setCapacity({
            minimum: String(c.minimum),
            maximum: String(c.maximum),
            reserve: String(c.reserve),
          });
      })
      .catch((e) => {
        if (active) setError(message(e));
      });
    return () => {
      active = false;
    };
  }, [request]);
  function update(p: AdmissionPlan) {
    setShowUpload(false);
    setFile(undefined);
    setPlan(p);
    setPlanId(String(p.id));
    sessionStorage.setItem("admission-plan-id", String(p.id));
    setCount(
      p.selectedClassCount ??
        p.scenarios.find((s) => s.recommended)?.classCount ??
        p.scenarios[0]?.classCount ??
        0,
    );
    setReview(false);
    // Keep the accepted exceptions while working on the same plan.
    // Opening a different plan starts a separate confirmation.
    if (p.id !== plan?.id) {
      setReserve(false);
      setBelow(false);
      setReason("");
    }
    setResult(undefined);
    setNotifications(undefined);
  }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(
        message(e) +
          (e instanceof ApiError && e.status === 409
            ? " Hãy tải lại phương án trước khi tiếp tục."
            : ""),
      );
    } finally {
      setBusy(false);
    }
  }
  function upload() {
    if (!file || !file.size || !/\.xlsx$/i.test(file.name))
      throw Error("Chọn tệp Excel .xlsx có dữ liệu.");
    if (file.size > 10 * 1024 * 1024) throw Error("Tệp tối đa 10 MB.");
    const form = new FormData();
    form.set("file", file);
    return form;
  }
  function scope() {
    if (
      ![majorId, cohortId].every(
        (v) => Number.isSafeInteger(Number(v)) && Number(v) > 0,
      )
    )
      throw Error("Nhập ID ngành và khóa hợp lệ.");
    if (
      !capacity ||
      Number(capacity.minimum) < 1 ||
      Number(capacity.maximum) > 99 ||
      Number(capacity.minimum) > Number(capacity.maximum) ||
      Number(capacity.reserve) < 0 ||
      Number(capacity.reserve) > 98 ||
      !Object.values(capacity).every(
        (value) => value.trim() !== "" && Number.isInteger(Number(value)),
      )
    )
      throw Error(
        "Kiểm tra cấu hình sĩ số: tối thiểu ≤ tối đa (1–99), dự bị 0–98.",
      );
    return {
      majorId: Number(majorId),
      cohortId: Number(cohortId),
      minCapacity: Number(capacity.minimum),
      maxCapacity: Number(capacity.maximum),
      reserveCapacity: Number(capacity.reserve),
    };
  }
  const editable = plan && !["CONFIRMED", "CONFIRMING"].includes(plan.state);
  const scenario = plan?.scenarios.find((s) => s.classCount === count);
  const hasEnrolled = plan?.applicants.some((a) => a.state === "ENROLLED");
  const notificationPlanId =
    plan && (hasEnrolled || plan.state === "CONFIRMED") ? plan.id : undefined;
  useEffect(() => {
    if (!notificationPlanId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setLoadingNotifications(true);
    setNotificationError("");
    async function refresh() {
      try {
        const items = await request<AdmissionNotification[]>(
          "admissionNotifications",
          notificationPlanId,
        );
        if (!active) return;
        setNotifications(items);
        setNotificationError("");
        // Failed deliveries may still be retried by the mail worker.
        if (
          !items.length ||
          items.some(
            (item) =>
              ["PENDING", "PROCESSING"].includes(item.state) ||
              (item.state === "FAILED" && item.failureCount < 4),
          )
        ) {
          timer = setTimeout(() => void refresh(), 5000);
        }
      } catch (e) {
        if (active) setNotificationError(message(e));
      } finally {
        if (active) setLoadingNotifications(false);
      }
    }
    void refresh();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [notificationPlanId, request]);
  const eligible =
    plan?.applicants.filter((a) => ["VALID", "FAILED"].includes(a.state)) ?? [];
  const rows =
    plan?.applicants.filter(
      (a) =>
        (!classFilter || String(a.assignedClassId) === classFilter) &&
        `${a.fullName} ${a.applicationCode} ${a.email}`
          .toLocaleLowerCase("vi")
          .includes(query.trim().toLocaleLowerCase("vi")),
    ) ?? [];
  // Confirmation uses the actual assignments, including already enrolled applicants.
  const projectedSizes =
    plan?.classes.map(
      (c) =>
        plan.applicants.filter(
          (a) =>
            ["VALID", "FAILED", "ENROLLED"].includes(a.state) &&
            a.assignedClassId === c.id,
        ).length,
    ) ?? [];
  const needsReserve = review
    ? projectedSizes.some((size) => size > plan!.capacity.maximum)
    : (scenario?.reserveUsed ?? 0) > 0;
  const needsBelowMinimum = review
    ? projectedSizes.some((size) => size < plan!.capacity.minimum)
    : scenario?.belowMinimum === true;
  const needsException = needsReserve || needsBelowMinimum;
  const emailSent =
    notifications?.filter((n) => n.state === "SENT").length ?? 0;
  const emailFailed =
    notifications?.filter((n) => n.state === "FAILED").length ?? 0;
  const emailWaiting =
    notifications?.filter((n) => ["PENDING", "PROCESSING"].includes(n.state))
      .length ?? 0;
  const emailSkipped =
    notifications?.filter((n) => n.state === "SKIPPED").length ?? 0;
  const allEmailsSent =
    !!notifications?.length && emailSent === notifications.length;
  const acceptance = needsException ? (
    <div className="admission-acceptance">
      <div className="admission-acceptance-title">
        Ngoại lệ sĩ số{" "}
        <small>Chỉ chọn khi phương án cần sử dụng ngoại lệ.</small>
      </div>
      {needsReserve && (
        <label className="check-line">
          <input
            type="checkbox"
            checked={reserve}
            onChange={(e) => setReserve(e.target.checked)}
          />
          Chấp nhận sử dụng suất dự bị
        </label>
      )}
      {needsBelowMinimum && (
        <label className="check-line">
          <input
            type="checkbox"
            checked={below}
            onChange={(e) => setBelow(e.target.checked)}
          />
          Chấp nhận lớp dưới sĩ số tối thiểu
        </label>
      )}
      {((needsReserve && reserve) || (needsBelowMinimum && below)) && (
        <label>
          Lý do ngoại lệ
          <input
            maxLength={500}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Bắt buộc khi chấp nhận ngoại lệ"
          />
        </label>
      )}
    </div>
  ) : null;
  return (
    <>
      <div className="page-title admission-heading">
        <div>
          <h1>Phân luồng nhập học</h1>
          <p>Lập phương án, tổ chức lớp và xác nhận nhập học đầu khóa.</p>
        </div>
      </div>
      <section className="admission-workspace" aria-busy={busy}>
        <ol className="admission-steps">
          {["Lập phương án", "Kiểm tra & phân lớp", "Xác nhận & kết quả"].map(
            (s, i) => (
              <li
                key={s}
                className={
                  i ===
                  (!plan
                    ? 0
                    : review || result || plan.state === "CONFIRMED"
                      ? 2
                      : 1)
                    ? "active"
                    : ""
                }
              >
                <span>0{i + 1}</span>
                {s}
              </li>
            ),
          )}
        </ol>
        <fieldset disabled={busy} className="admission-plan-content">
          <div className="admission-resume">
            <label>
              Mã phương án
              <input
                type="number"
                min="1"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
              />
            </label>
            <button
              className="btn"
              disabled={!Number.isSafeInteger(+planId) || +planId < 1}
              onClick={() =>
                void run(async () =>
                  update(
                    await request<AdmissionPlan>("admissionPlanGet", +planId),
                  ),
                )
              }
            >
              <RefreshCw size={16} />
              Tải phương án
            </button>
            {plan && (
              <button
                className="btn"
                onClick={() => {
                  setPlan(undefined);
                  setResult(undefined);
                  setReview(false);
                  setFile(undefined);
                  setNotifications(undefined);
                }}
              >
                Lập phương án khác
              </button>
            )}
          </div>
          {!plan ? (
            <>
              <h2>1. Thông tin đợt nhập học</h2>
              <p className="admission-helper">
                Nhập ID ngành và khóa theo danh mục quản lý đào tạo.
              </p>
              <div className="academic-fields">
                <label>
                  ID ngành
                  <input
                    type="number"
                    min="1"
                    value={majorId}
                    onChange={(e) => setMajor(e.target.value)}
                  />
                </label>
                <label>
                  ID khóa
                  <input
                    type="number"
                    min="1"
                    value={cohortId}
                    onChange={(e) => setCohort(e.target.value)}
                  />
                </label>
                {(["minimum", "maximum", "reserve"] as const).map((key, i) => (
                  <label key={key}>
                    {["Sĩ số tối thiểu", "Sĩ số tối đa", "Suất dự bị"][i]}
                    <input
                      type="number"
                      min={key === "reserve" ? 0 : 1}
                      max={key === "reserve" ? 98 : 99}
                      disabled={!capacity}
                      value={capacity?.[key] ?? ""}
                      onChange={(e) =>
                        setCapacity((c) => c && { ...c, [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="admission-method-heading">
                <h3>Chọn cách lập phương án</h3>
                <p className="admission-helper">
                  Bạn đã có file Excel danh sách sinh viên chưa?
                </p>
              </div>
              <div
                className="admission-methods"
                role="group"
                aria-label="Cách lập phương án"
              >
                <button
                  type="button"
                  aria-pressed={entryMode === "file"}
                  onClick={() => setEntryMode("file")}
                >
                  <FileSpreadsheet size={22} aria-hidden="true" />
                  <span>
                    <strong>Đã có danh sách Excel</strong>
                    <small>Nhập hồ sơ sinh viên để đề xuất và phân lớp.</small>
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={entryMode === "estimate"}
                  onClick={() => setEntryMode("estimate")}
                >
                  <span className="admission-method-number" aria-hidden="true">
                    123
                  </span>
                  <span>
                    <strong>Chưa có danh sách — lập dự kiến</strong>
                    <small>
                      Chuẩn bị lớp theo số lượng, bổ sung Excel sau.
                    </small>
                  </span>
                </button>
              </div>
              {entryMode === "file" && (
                <section
                  className="admission-entry-panel"
                  aria-label="Nhập danh sách Excel"
                >
                  <div className="admission-section-head">
                    <div>
                      <h3>Danh sách trúng tuyển</h3>
                      <p>Tải mẫu theo ngành và khóa trước khi nhập dữ liệu.</p>
                    </div>
                    <button
                      className="btn"
                      onClick={() =>
                        void run(async () => {
                          scope();
                          const base =
                            import.meta.env.VITE_API_BASE_URL?.trim().replace(
                              /\/+$/,
                              "",
                            );
                          if (base === undefined || !session)
                            throw Error(
                              "Chưa có cấu hình API hoặc phiên đăng nhập.",
                            );
                          const response = await fetch(
                            `${base}/api/v1/student-admissions/template?majorId=${majorId}&cohortId=${cohortId}`,
                            {
                              headers: {
                                Authorization: `Bearer ${session.accessToken}`,
                              },
                            },
                          );
                          if (!response.ok) {
                            if (response.status === 401) clearSession();
                            let detail = `Không tải được mẫu (HTTP ${response.status}).`;
                            try {
                              detail =
                                (await response.json()).message || detail;
                            } catch {}
                            throw Error(detail);
                          }
                          const url = URL.createObjectURL(
                            await response.blob(),
                          );
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "admission-template.xlsx";
                          a.click();
                          setTimeout(() => URL.revokeObjectURL(url), 1000);
                        })
                      }
                    >
                      <Download size={16} />
                      Tải mẫu Excel
                    </button>
                  </div>
                  <label className="admission-file-row">
                    <FileSpreadsheet size={22} />
                    <input
                      type="file"
                      accept=".xlsx"
                      onChange={(e) => setFile(e.target.files?.[0])}
                    />
                  </label>
                  <p className="admission-helper">
                    Tệp .xlsx tối đa 10 MB. Giữ nguyên tên cột và mã ngành, mã
                    khóa trong mẫu.
                  </p>
                  <div className="admission-actions">
                    <button
                      className="btn primary"
                      disabled={!file || !capacity}
                      onClick={() =>
                        void run(async () => {
                          const values = scope();
                          const form = upload();
                          Object.entries(values).forEach(([k, v]) =>
                            form.set(k, String(v)),
                          );
                          update(
                            await request<AdmissionPlan>(
                              "admissionPlanImport",
                              undefined,
                              form,
                            ),
                          );
                        })
                      }
                    >
                      Lập phương án từ danh sách
                    </button>
                  </div>
                </section>
              )}
              {entryMode === "estimate" && (
                <section
                  className="admission-entry-panel admission-estimate"
                  aria-label="Lập phương án dự kiến"
                >
                  <h3>Lập phương án theo số lượng dự kiến</h3>
                  <p className="admission-helper">
                    Chỉ cần số sinh viên dự kiến để chuẩn bị lớp. Khi có danh
                    sách chính thức, bạn nhập Excel vào phương án này để tiếp
                    tục.
                  </p>
                  <label>
                    Số sinh viên dự kiến
                    <input
                      type="number"
                      min="1"
                      value={total}
                      onChange={(e) => setTotal(e.target.value)}
                      placeholder="Nhập số sinh viên dự kiến"
                    />
                  </label>
                  <button
                    className="btn primary"
                    disabled={
                      !capacity ||
                      !Number.isSafeInteger(Number(total)) ||
                      Number(total) < 1
                    }
                    onClick={() =>
                      void run(async () =>
                        update(
                          await request<AdmissionPlan>(
                            "admissionPlanCreate",
                            undefined,
                            { ...scope(), totalStudents: Number(total) },
                          ),
                        ),
                      )
                    }
                  >
                    Lập phương án dự kiến
                  </button>
                </section>
              )}
            </>
          ) : (
            <>
              <div className="admission-section-head">
                <div>
                  <h2>Phương án #{plan.id}</h2>
                  <p>
                    Ngành #{plan.majorId} · Khóa #{plan.cohortId} ·{" "}
                    {plan.totalStudents} sinh viên ·{" "}
                    {states[plan.state] ?? plan.state}
                  </p>
                </div>
                <span>Phiên bản {plan.revision}</span>
              </div>
              {plan.warnings.map((w, i) => (
                <p className="admission-warning" key={i}>
                  {w}
                </p>
              ))}
              {editable && !hasEnrolled && !review && (
                <>
                  <h3>2. Chọn phương án lớp</h3>
                  <div
                    className="admission-scenarios"
                    role="group"
                    aria-label="Phương án lớp"
                  >
                    {plan.scenarios.map((s) => (
                      <label
                        key={s.classCount}
                        className={s.classCount === count ? "selected" : ""}
                      >
                        <input
                          type="radio"
                          name="scenario"
                          checked={count === s.classCount}
                          onChange={() => {
                            setCount(s.classCount);
                            setReserve(false);
                            setBelow(false);
                          }}
                        />
                        <strong>
                          {s.classCount} lớp {s.recommended ? "· Đề xuất" : ""}
                        </strong>
                        <span>Sĩ số: {s.targetSizes.join(" / ")}</span>
                        <span>
                          Dự bị: {s.reserveUsed} · Phòng phù hợp:{" "}
                          {s.suitableRooms}
                        </span>
                        {s.warnings.map((w, i) => (
                          <small key={i}>{w}</small>
                        ))}
                      </label>
                    ))}
                  </div>
                  {acceptance}
                  <button
                    className="btn"
                    disabled={
                      !scenario ||
                      (scenario.reserveUsed > 0 && !reserve) ||
                      (scenario.belowMinimum && !below) ||
                      ((reserve || below) && !reason.trim())
                    }
                    onClick={() =>
                      void run(async () =>
                        update(
                          await request<AdmissionPlan>(
                            "admissionPrepareClasses",
                            undefined,
                            {
                              planId: plan.id,
                              expectedRevision: plan.revision,
                              classCount: count,
                              acceptReserve: reserve,
                              acceptBelowMinimum: below,
                              reason: reason.trim() || null,
                            },
                          ),
                        ),
                      )
                    }
                  >
                    Chuẩn bị {count || ""} lớp theo phương án
                  </button>
                </>
              )}
              {!!plan.classes.length && (
                <div className="admission-stats">
                  {plan.classes.map((c) => (
                    <div key={c.id}>
                      <b>{c.className}</b>
                      <span>
                        Phân bổ {c.assignedSize} / {c.maximum} · Dự bị{" "}
                        {c.reserveUsed}/{c.reserve}
                      </span>
                      <small>
                        Hiện có {c.currentSize} · Điểm TB{" "}
                        {c.averageScore ?? "—"}
                      </small>
                    </div>
                  ))}
                </div>
              )}
              {editable &&
                !review &&
                (showUpload || !plan.applicants.length) && (
                  <div className="admission-estimate">
                    <h3>
                      {plan.applicants.length
                        ? "Cập nhật danh sách Excel"
                        : "Nhập danh sách sinh viên"}
                    </h3>
                    <p className="admission-helper">
                      Hồ sơ đã nhập học được giữ nguyên khi nhập lại.
                    </p>
                    <input
                      id="admission-plan-upload"
                      aria-label="Danh sách nhập lại"
                      type="file"
                      accept=".xlsx"
                      onChange={(e) => setFile(e.target.files?.[0])}
                    />
                    <div className="admission-actions">
                      <button
                        className="btn"
                        disabled={!file}
                        onClick={() =>
                          void run(async () => {
                            const form = upload();
                            form.set("expectedRevision", String(plan.revision));
                            update(
                              await request<AdmissionPlan>(
                                "admissionApplicants",
                                plan.id,
                                form,
                              ),
                            );
                          })
                        }
                      >
                        Nhập danh sách vào phương án
                      </button>
                      {!!plan.applicants.length && (
                        <button
                          className="btn"
                          onClick={() => {
                            setShowUpload(false);
                            setFile(undefined);
                          }}
                        >
                          Hủy cập nhật
                        </button>
                      )}
                    </div>
                  </div>
                )}
              <div className="admission-section-head">
                <div>
                  <h3>
                    {review
                      ? "3. Kiểm tra trước khi xác nhận"
                      : "Danh sách hồ sơ"}
                  </h3>
                  <p>
                    {plan.applicants.length} hồ sơ · {eligible.length} hồ sơ chờ
                    xử lý
                  </p>
                </div>
                {editable && !review && !!plan.applicants.length && (
                  <div className="admission-roster-actions">
                    <button
                      className="btn"
                      aria-expanded={showUpload}
                      aria-controls="admission-plan-upload"
                      onClick={() => {
                        setShowUpload(!showUpload);
                        setFile(undefined);
                      }}
                    >
                      {" "}
                      {showUpload
                        ? "Đóng cập nhật Excel"
                        : "Cập nhật danh sách Excel"}
                    </button>
                    <button
                      className="btn primary"
                      disabled={!plan.classes.length || !eligible.length}
                      onClick={() =>
                        void run(async () =>
                          update(
                            await request<AdmissionPlan>(
                              "admissionAllocation",
                              plan.id,
                              { expectedRevision: plan.revision },
                            ),
                          ),
                        )
                      }
                    >
                      {plan.state === "PREVIEWED"
                        ? "Chạy lại phân bổ"
                        : "Chạy phân bổ / xem trước"}
                    </button>
                  </div>
                )}
              </div>
              {editable &&
                !review &&
                !!plan.applicants.length &&
                !plan.classes.length && (
                  <p className="admission-helper">
                    Chuẩn bị lớp theo phương án ở trên để tiếp tục phân bổ sinh
                    viên.
                  </p>
                )}
              <div className="academic-fields">
                <label>
                  Tìm tên, mã hồ sơ, email
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <label>
                  Lọc lớp
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                  >
                    <option value="">Tất cả</option>
                    {plan.classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.className}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="table-scroll admission-table-wrap">
                <table className="management-table">
                  <thead>
                    <tr>
                      {[
                        "Dòng / mã hồ sơ",
                        "Họ tên / email",
                        "Điểm",
                        "Trạng thái",
                        "Lớp",
                        "Kết quả / lưu ý",
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a) => (
                      <tr key={a.id}>
                        <td>
                          {a.rowNumber} · {a.applicationCode}
                        </td>
                        <td>
                          {a.fullName}
                          <small>{a.email}</small>
                        </td>
                        <td>{a.entranceScore ?? "—"}</td>
                        <td>
                          <span
                            className={`admission-status admission-status-${a.state.toLowerCase()}`}
                          >
                            {states[a.state] ?? a.state}
                          </span>
                        </td>
                        <td>
                          {!review &&
                          plan.state === "PREVIEWED" &&
                          a.state === "VALID" ? (
                            <select
                              aria-label={`Lớp của ${a.fullName}`}
                              value={a.assignedClassId ?? ""}
                              onChange={(e) => {
                                const classId = +e.target.value;
                                void run(async () =>
                                  update(
                                    await request<AdmissionPlan>(
                                      "admissionAllocationAdjust",
                                      plan.id,
                                      {
                                        expectedRevision: plan.revision,
                                        assignments: [
                                          { applicantId: a.id, classId },
                                        ],
                                      },
                                    ),
                                  ),
                                );
                              }}
                            >
                              <option disabled value="">
                                Chưa phân lớp
                              </option>
                              {plan.classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.className}
                                </option>
                              ))}
                            </select>
                          ) : (
                            (plan.classes.find(
                              (c) => c.id === a.assignedClassId,
                            )?.className ?? "Chưa phân lớp")
                          )}
                        </td>
                        <td>
                          <span className="field-error">{a.error}</span>
                          {a.studentCode && <span>MSSV: {a.studentCode}</span>}
                          {a.reusingAccount && (
                            <small>Dùng lại tài khoản</small>
                          )}
                          {a.warnings.map((w, i) => (
                            <small key={i}>{w}</small>
                          ))}
                        </td>
                      </tr>
                    ))}
                    {!rows.length && (
                      <tr>
                        <td colSpan={6}>Chưa có hồ sơ phù hợp.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {plan.averageScoreDifference != null && (
                <p className="admission-helper">
                  Chênh lệch điểm trung bình giữa các lớp:{" "}
                  {plan.averageScoreDifference}
                </p>
              )}
              {editable &&
                ["PREVIEWED", "PARTIALLY_CONFIRMED"].includes(plan.state) &&
                !review && (
                  <div className="admission-actions">
                    <button
                      className="btn primary"
                      disabled={!eligible.some((a) => a.assignedClassId)}
                      onClick={() => {
                        setReview(true);
                        // Retain only acceptances that still apply to the final allocation.
                        setReserve(
                          reserve &&
                            projectedSizes.some(
                              (size) => size > plan.capacity.maximum,
                            ),
                        );
                        setBelow(
                          below &&
                            projectedSizes.some(
                              (size) => size < plan.capacity.minimum,
                            ),
                        );
                      }}
                    >
                      Tiếp tục xác nhận nhập học
                    </button>
                  </div>
                )}
              {review && (
                <div className="admission-estimate">
                  <h3>Xác nhận tạo hồ sơ và tài khoản</h3>
                  <p>
                    Hệ thống xử lý các hồ sơ hợp lệ đã phân lớp.
                    {needsException
                      ? " Kiểm tra ngoại lệ sĩ số trước khi xác nhận."
                      : " Sĩ số các lớp nằm trong giới hạn cho phép."}
                  </p>
                  {acceptance}
                  <div className="admission-actions">
                    <button className="btn" onClick={() => setReview(false)}>
                      Quay lại kiểm tra
                    </button>
                    <button
                      className="btn primary"
                      disabled={
                        (needsReserve && !reserve) ||
                        (needsBelowMinimum && !below) ||
                        (needsException && !reason.trim())
                      }
                      onClick={() =>
                        void run(async () => {
                          const r = await request<AdmissionConfirmation>(
                            "admissionPlanConfirm",
                            plan.id,
                            {
                              expectedRevision: plan.revision,
                              acceptReserve: needsReserve && reserve,
                              acceptBelowMinimum: needsBelowMinimum && below,
                              reason: needsException
                                ? reason.trim() || null
                                : null,
                            },
                          );
                          setResult(r);
                          setPlan({
                            ...plan,
                            revision: r.revision,
                            state: r.state,
                            applicants: r.applicants,
                          });
                          setReview(false);
                        })
                      }
                    >
                      Xác nhận nhập học
                    </button>
                  </div>
                </div>
              )}
              {result && (
                <div className="admission-guide" role="status">
                  Kết quả: {result.enrolled} nhập học · {result.failed} thất bại
                  · {result.skipped} bỏ qua.{" "}
                  {result.failed > 0 &&
                    "Kiểm tra lỗi, tải lại phương án và xử lý hồ sơ còn lại."}
                </div>
              )}
              {(hasEnrolled || result || plan.state === "CONFIRMED") && (
                <div className="admission-estimate">
                  <div className="admission-section-head admission-notification-heading">
                    <div>
                      <h3>Email thông báo nhập học</h3>
                      <p className="admission-helper">
                        Theo dõi kết quả gửi email cho sinh viên đã nhập học.
                      </p>
                    </div>
                    <button
                      className="btn"
                      onClick={() =>
                        void run(async () =>
                          setNotifications(
                            await request<AdmissionNotification[]>(
                              "admissionNotifications",
                              plan.id,
                            ),
                          ),
                        )
                      }
                    >
                      <RefreshCw size={15} aria-hidden="true" /> Làm mới
                    </button>
                  </div>
                  {loadingNotifications && (
                    <p role="status" className="admission-helper">
                      Đang tải trạng thái email…
                    </p>
                  )}
                  {notificationError && (
                    <p role="alert" className="field-error">
                      {notificationError}
                    </p>
                  )}
                  {notifications && (
                    <>
                      {!!notifications.length && (
                        <div
                          className={`admission-mail-result ${allEmailsSent ? "success" : emailFailed ? "warning" : "pending"}`}
                          role="status"
                          aria-live="polite"
                        >
                          <span className="admission-mail-result-icon">
                            {allEmailsSent ? (
                              <CheckCircle2 size={25} aria-hidden="true" />
                            ) : emailFailed ? (
                              <AlertCircle size={25} aria-hidden="true" />
                            ) : (
                              <Mail size={25} aria-hidden="true" />
                            )}
                          </span>
                          <div>
                            <strong>
                              {allEmailsSent
                                ? "Đã gửi email thông báo thành công"
                                : emailFailed
                                  ? "Một số email chưa gửi thành công"
                                  : "Đang xử lý email thông báo"}
                            </strong>
                            <p>
                              {allEmailsSent
                                ? `Đã gửi ${emailSent}/${notifications.length} email thông báo nhập học đến địa chỉ email của sinh viên.`
                                : `${emailSent}/${notifications.length} email đã gửi. ${emailWaiting > 0 ? `${emailWaiting} email đang chờ xử lý. ` : ""}${emailFailed > 0 ? `${emailFailed} email gửi thất bại, xem chi tiết bên dưới. ` : ""}${emailSkipped > 0 ? `${emailSkipped} email được bỏ qua.` : ""}`}
                            </p>
                          </div>
                        </div>
                      )}
                      {!!notifications.length && (
                        <div className="admission-mail-counts">
                          <span>
                            <CheckCircle2 size={15} aria-hidden="true" />
                            Đã gửi <b>{emailSent}</b>
                          </span>
                          <span>
                            <Clock3 size={15} aria-hidden="true" />
                            Chờ xử lý <b>{emailWaiting}</b>
                          </span>
                          <span>
                            <AlertCircle size={15} aria-hidden="true" />
                            Thất bại <b>{emailFailed}</b>
                          </span>
                        </div>
                      )}
                      <details className="admission-mail-details">
                        <summary>
                          Xem chi tiết gửi email ({notifications.length})
                        </summary>
                        <div className="table-scroll admission-table-wrap">
                          <table className="management-table">
                            <thead>
                              <tr>
                                <th>Mã nhập học</th>
                                <th>Trạng thái</th>
                                <th>Số lần thất bại</th>
                                <th>Chi tiết</th>
                              </tr>
                            </thead>
                            <tbody>
                              {notifications.map((n) => (
                                <tr key={n.id}>
                                  <td>{n.admissionId}</td>
                                  <td>
                                    <span
                                      className={`admission-status admission-status-${n.state === "SENT" ? "enrolled" : n.state === "FAILED" ? "failed" : "pending"}`}
                                    >
                                      {states[n.state] ?? n.state}
                                    </span>
                                  </td>
                                  <td>{n.failureCount}</td>
                                  <td>{n.error || "—"}</td>
                                </tr>
                              ))}
                              {!notifications.length && (
                                <tr>
                                  <td colSpan={4}>
                                    Chưa có email được ghi nhận cho đợt nhập học
                                    này.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    </>
                  )}
                </div>
              )}
            </>
          )}
          {busy && <p role="status">Đang xử lý…</p>}
          {error && (
            <p role="alert" className="field-error admission-error">
              {error}
            </p>
          )}
        </fieldset>
      </section>
    </>
  );
}
