import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Info, X } from "lucide-react";
import "./admission.css";
import type {
  AdmissionPreviewResponse,
  AdmissionConfirmResponse,
} from "../../services/api/backendContract";
import { useLiveRequest } from "./client";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { message } from "./ActionForm";
export function Admission() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [guide, setGuide] = useState(false);
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
      <div className="page-title admission-heading">
        <div>
          <h1>Phân luồng nhập học</h1>
          <p>
            Tiếp nhận danh sách trúng tuyển và tổ chức phân lớp đầu khóa.
          </p>
        </div>
        <button className="btn" aria-expanded={guide} onClick={() => setGuide(!guide)}>Hướng dẫn nhập danh sách</button>
      </div>
      {guide && <div className="admission-guide">Tải tệp mẫu, điền đủ 9 cột trong sheet đầu tiên và chọn tệp .xlsx. Kiểm tra kết quả phân lớp, điều chỉnh lớp nếu cần, sau đó xác nhận tạo hồ sơ và tài khoản.</div>}
      <section className="admission-workspace" aria-label="Quy trình phân luồng nhập học">
        <ol className="admission-steps">{["Nhập danh sách", "Kiểm tra & phân lớp", "Xác nhận & tạo hồ sơ"].map((label, index) => {
          const step = result ? 2 : batch ? 1 : 0;
          return <li key={label} className={index === step ? "active" : index < step ? "done" : ""} aria-current={index === step ? "step" : undefined}><span>0{index + 1}</span>{label}</li>;
        })}</ol>
        {!batch && !result && <>
        <fieldset disabled={busy}>
          <div className="admission-section-head"><div><h2>Nhập danh sách trúng tuyển</h2><p>Sử dụng tệp Excel theo mẫu của hệ thống.</p></div><a href={import.meta.env.BASE_URL + "cau-truc-danh-sach-nhap-hoc.xlsx"} download><Download size={18} />Tải tệp mẫu (.xlsx)</a></div>
          <div className="admission-upload-grid"><div>
          <label htmlFor="admission-file">Tệp danh sách trúng tuyển</label>
            <input
              ref={fileInput}
              id="admission-file"
              hidden
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
          <div className="admission-file-row"><button type="button" className="btn" onClick={() => fileInput.current?.click()}>Chọn tệp Excel</button><span>{file?.name || "Chưa chọn tệp"}</span>{file && <button type="button" aria-label="Bỏ tệp đã chọn" onClick={() => { setFile(undefined); setFileError(""); if (fileInput.current) fileInput.current.value = ""; }}><X size={18} /></button>}</div>
          <p className="admission-helper">Định dạng được hỗ trợ: .xlsx</p>
          <div className={"admission-drop-zone " + (dragging ? "dragging" : "")} onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (busy) return; const selected = e.dataTransfer.files[0]; if (selected && !selected.name.toLowerCase().endsWith(".xlsx")) { setFileError("Chỉ hỗ trợ tệp Excel .xlsx."); return; } if (selected) {setFile(selected); setFileError(""); setError("");} }}><FileSpreadsheet size={27} /><span>Có thể kéo thả tệp vào vùng này</span></div>
          <p className="admission-inline-note"><Info size={17} />Bạn có thể kiểm tra và điều chỉnh trước khi xác nhận.</p>
          </div><aside className="admission-schema"><h3>Nội dung tệp gồm 9 cột</h3><table><thead><tr><th>Nhóm thông tin</th><th>Trường dữ liệu</th></tr></thead><tbody><tr><td>Hồ sơ</td><td>Mã hồ sơ · Họ tên</td></tr><tr><td>Cá nhân</td><td>Ngày sinh · Giới tính · Email</td></tr><tr><td>Đào tạo</td><td>Điểm xét tuyển · Mã ngành<br />Mã khóa · Hệ đào tạo</td></tr></tbody></table><p className="admission-helper">Giữ nguyên tên cột trong tệp mẫu.</p></aside></div>
          {fileError && <p className="field-error">{fileError}</p>}
          <div className="admission-work-footer"><div><strong>Bước 1 / 3</strong><p>{file ? "Tệp đã sẵn sàng để kiểm tra" : "Chưa có dữ liệu để kiểm tra"}</p></div>
          <button
            className="btn primary"
            disabled={!file || busy}
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
            {busy ? "Đang kiểm tra…" : "Kiểm tra & tiếp tục"}
          </button>
          </div>
        </fieldset>
        </>}
      {batch && !result && (
        <section className="card admissions-card">
          <fieldset disabled={busy}>
            <h2>2. Kiểm tra và điều chỉnh</h2>
            <button type="button" className="btn" onClick={() => {setBatch(undefined); setError("");}}>Quay lại chọn tệp</button>
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
      </section>
      <div className="admission-workflow-caption"><strong>Quy trình xử lý</strong><span>Kiểm tra dữ liệu</span><span>Xem trước kết quả phân lớp</span><span>Xác nhận tạo hồ sơ & tài khoản</span></div>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </>
  );
}
