import { useState } from "react";
import type {
  AdmissionPreviewResponse,
  AdmissionConfirmResponse,
} from "../../services/api/backendContract";
import { useLiveRequest } from "./client";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { message } from "./ActionForm";
export function Admission() {
  const request = useLiveRequest(),
    { session } = useAuth(),
    { notify } = useUI();
  const [batch, setBatch] = useState<AdmissionPreviewResponse>(),
    [result, setResult] = useState<AdmissionConfirmResponse>(),
    [busy, setBusy] = useState(false),
    [file, setFile] = useState<File>(),
    [error, setError] = useState(""),
    [accepted, accept] = useState(false),
    [classId, filter] = useState(""),
    [name, search] = useState(""),
    [fileError, setFileError] = useState("");
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Phân luồng nhập học</h1>
          <p>
            Kiểm tra danh sách → Xem và điều chỉnh lớp → Tạo hồ sơ, tài khoản.
          </p>
        </div>
        <a
          className="btn primary"
          href={import.meta.env.BASE_URL + "cau-truc-danh-sach-nhap-hoc.xlsx"}
          download
        >
          Tải cấu trúc danh sách
        </a>
      </div>
      <section className="card admissions-card">
        <h2>1. Danh sách trúng tuyển</h2>
        <fieldset disabled={busy}>
          <label>
            Danh sách trúng tuyển (.xlsx)
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                setFile(e.target.files?.[0]);
                setBatch(undefined);
                setResult(undefined);
                setError("");
                setFileError("");
              }}
            />
          </label>
          <p>Các cột trong sheet đầu tiên</p>
          <p>
            ma_ho_so · ho_ten · ngay_sinh · gioi_tinh · email · diem_xet_tuyen ·
            ma_nganh · ma_khoa · he_dao_tao
          </p>
          {fileError && <p className="field-error">{fileError}</p>}
          <button
            className="btn primary"
            onClick={async () => {
              if (
                !file ||
                !file.size ||
                !file.name.toLowerCase().endsWith(".xlsx")
              ) {
                setFileError("Vui lòng chọn tệp Excel .xlsx có dữ liệu.");
                return;
              }
              setBusy(true);
              setResult(undefined);
              setBatch(undefined);
              setError("");
              setFileError("");
              try {
                const form = new FormData();
                form.append("file", file);
                setBatch(
                  await request<AdmissionPreviewResponse>(
                    "admissionPreview",
                    undefined,
                    form,
                  ),
                );
                accept(false);
                filter("");
                search("");
              } catch (e) {
                setFileError(message(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Kiểm tra và phân lớp
          </button>
        </fieldset>
      </section>
      {batch && !result && (
        <section className="card admissions-card">
          <fieldset disabled={busy}>
            <h2>2. Kiểm tra và điều chỉnh</h2>
            <p>
              {batch.fileName} · {batch.totalRows} dòng · {batch.validRows} hồ
              sơ hợp lệ · {batch.errors.length} lỗi
            </p>
            {batch.errors.map((e, i) => (
              <p className="field-error" key={i}>
                Dòng {e.rowNumber} · {e.applicationCode} · {e.field} ·{" "}
                {e.reason}
              </p>
            ))}
            {[...batch.capacityWarnings, ...batch.duplicateNameWarnings].map(
              (w, i) => (
                <p key={i}>{w}</p>
              ),
            )}
            <div className="academic-fields">
              <label>
                Lớp
                <select
                  value={classId}
                  onChange={(e) => filter(e.target.value)}
                >
                  <option value="">Tất cả lớp</option>
                  {batch.classes.map((c) => (
                    <option key={c.classId} value={c.classId}>
                      {c.className}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tên hoặc mã hồ sơ
                <input value={name} onChange={(e) => search(e.target.value)} />
              </label>
            </div>
            {batch.classes
              .filter((c) => !classId || String(c.classId) === classId)
              .map((c) => (
                <section key={c.classId}>
                  <h3>{c.className}</h3>
                  <p>
                    Sĩ số dự kiến {c.projectedSize}/{c.maxCapacity} · Tối thiểu{" "}
                    {c.minCapacity} · Điểm trung bình{" "}
                    {c.projectedAverageEntranceScore}
                  </p>
                  <div className="table-scroll">
                    <table className="management-table">
                      <thead>
                        <tr>
                          {[
                            "Dòng",
                            "Mã hồ sơ",
                            "Họ tên",
                            "Email",
                            "Điểm",
                            "Lớp phân bổ",
                          ].map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {c.students
                          .filter((s) =>
                            (s.fullName + " " + s.applicationCode)
                              .toLowerCase()
                              .includes(name.toLowerCase().trim()),
                          )
                          .map((s) => (
                            <tr key={s.applicationCode}>
                              <td>{s.rowNumber}</td>
                              <td>{s.applicationCode}</td>
                              <td>{s.fullName}</td>
                              <td>{s.email}</td>
                              <td>{s.entranceScore}</td>
                              <td>
                                <select
                                  aria-label={"Lớp của " + s.fullName}
                                  value={s.assignedClassId}
                                  onChange={async (e) => {
                                    const targetClassId = Number(
                                      e.target.value,
                                    );
                                    setBusy(true);
                                    setError("");
                                    try {
                                      setBatch(
                                        await request<AdmissionPreviewResponse>(
                                          "admissionAdjustAssignment",
                                          batch.batchId,
                                          {
                                            applicationCode: s.applicationCode,
                                            targetClassId,
                                          },
                                        ),
                                      );
                                      accept(false);
                                      notify("Đã cập nhật phân lớp.");
                                    } catch (e) {
                                      setError(message(e));
                                    } finally {
                                      setBusy(false);
                                    }
                                  }}
                                >
                                  {batch.classes.map((t) => (
                                    <option key={t.classId} value={t.classId}>
                                      {t.className}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            {batch.capacityWarnings.length > 0 && (
              <label>
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => accept(e.target.checked)}
                />{" "}
                Chấp nhận cảnh báo sĩ số tối thiểu
              </label>
            )}
            <p>Chỉ {batch.validRows} hồ sơ hợp lệ sẽ được tạo tài khoản.</p>
            <button
              className="btn primary"
              disabled={
                !batch.validRows ||
                (batch.capacityWarnings.length > 0 && !accepted)
              }
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  setResult(
                    await request<AdmissionConfirmResponse>(
                      "admissionConfirm",
                      batch.batchId,
                      {
                        actor: session?.user.username,
                        acceptMinimumCapacityWarning: accepted,
                      },
                    ),
                  );
                  notify("Đã xác nhận nhập học.");
                } catch (e) {
                  setError(message(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Xác nhận tạo hồ sơ và tài khoản
            </button>
          </fieldset>
        </section>
      )}
      {result && (
        <section className="card admissions-card">
          <h2>3. Kết quả nhập học</h2>
          <p>
            Đã tạo {result.createdStudents} hồ sơ và {result.createdUsers} tài
            khoản.
          </p>
          {result.emailFailures.length > 0 && (
            <p className="field-error">
              Hồ sơ gửi email thất bại · {result.emailFailures.join(", ")}
            </p>
          )}
        </section>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </>
  );
}
