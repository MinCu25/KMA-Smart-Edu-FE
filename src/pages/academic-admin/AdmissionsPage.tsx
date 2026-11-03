import { useState } from "react";
import { readSheet as readXlsxFile } from "read-excel-file/browser";
import { useAcademic } from "../../context/AcademicContext";
import { useAuth } from "../../context/AuthContext";
import { useDemoData } from "../../context/DemoDataContext";
import { useManagement } from "../../context/ManagementContext";
import { useUI } from "../../context/UIContext";
import { usePersistentState } from "../../hooks/usePersistentState";
import { validateEmail, validatePhone } from "../../utils/profileValidation";
import { allocateByScore } from "../../utils/academicRules";
import { exportCsv } from "../../utils/exportCsv";
import { createStudent } from "../../services/mock/dtoService";
import { studentView } from "../../services/adapters";
import type {
  BatchImportStudentRequest,
  TrainingType,
  AdministrativeClassResponse,
} from "../../types/dto";
type Candidate = {
  existingId?: number;
  row: number;
  dossier: string;
  fullName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  citizenId: string;
  entranceScore: number;
  group: number;
  errors: string[];
};
const columns = [
  "maHoSo",
  "hoTen",
  "ngaySinh",
  "email",
  "sdt",
  "cccd",
  "diemDauVao",
];
function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" && !quoted) {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}
export default function AdmissionsPage() {
  const a = useAcademic(),
    auth = useAuth(),
    d = useDemoData(),
    { log } = useManagement(),
    { notify, notifyError, setDialog } = useUI();
  const [file, setFile] = useState<File | null>(null),
    [reuseExisting, setReuseExisting] = useState(false),
    [cohort, setCohort] = useState(1),
    [training, setTraining] = useState<TrainingType>("CHINH_QUY"),
    [min, setMin] = useState(20),
    [max, setMax] = useState(40),
    [rows, setRows] = useState<Candidate[]>([]),
    [groups, setGroups] = useState<string[]>([]),
    [error, setError] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [accepted, setAccepted] = useState(false);
  const [result, setResult] = usePersistentState<string[]>(
    "kma-admissions-last-result-v1",
    [],
  );
  const [imports, setImports] = usePersistentState<string[]>(
    "kma-admissions-dossiers-v1",
    [],
  );
  const cohortCode = cohort === 1 ? "K2026" : "K2025";
  const valid = rows.filter((r) => !r.errors.length);
  const groupRows = groups.map((_, i) => valid.filter((r) => r.group === i));
  const under = groupRows.some((g) => g.length < min);
  const duplicates = groupRows.flatMap((g, i) =>
    g
      .filter(
        (r, n) =>
          g.findIndex(
            (t) => t.fullName.toLowerCase() === r.fullName.toLowerCase(),
          ) !== n,
      )
      .map((r) => `${groups[i]}: ${r.fullName}`),
  );
  function invalidate() {
    setRows([]);
    setGroups([]);
    setResult([]);
    setAccepted(false);
  }
  async function preview() {
    const errors: Record<string, string> = {};
    if (!file) errors.file = "Vui lòng chọn danh sách Excel (.xlsx) hoặc CSV.";
    if (file && !/\.(xlsx|csv)$/i.test(file.name))
      errors.file = "Chỉ hỗ trợ tệp .xlsx hoặc .csv.";
    if (file && file.size > 10 * 1024 * 1024) errors.file = "Tệp tối đa 10 MB.";
    if (!Number.isInteger(min) || min < 1)
      errors.min = "Sĩ số tối thiểu phải là số nguyên dương.";
    if (!Number.isInteger(max) || max < min)
      errors.max = "Sĩ số tối đa phải là số nguyên và không nhỏ hơn tối thiểu.";
    setError(errors);
    if (Object.keys(errors).length) return;
    setBusy(true);
    setResult([]);
    try {
      const request: BatchImportStudentRequest = {
        majorId: 1,
        cohortId: cohort,
        file: file!,
      };
      const raw: unknown[][] = /\.csv$/i.test(request.file!.name)
        ? csvRows((await request.file!.text()).replace(/^\uFEFF/, ""))
        : await readXlsxFile(request.file!);
      const header = raw[0]?.map((v) => String(v ?? "").trim());
      if (!columns.every((c) => header?.includes(c)))
        throw Error(`Thiếu cột. Các cột bắt buộc: ${columns.join(", ")}.`);
      const seenEmail = new Set<string>(),
        seenDossier = new Set<string>(),
        seenCitizen = new Set<string>();
      const parsed: Candidate[] = raw
        .slice(1)
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => row.some((v) => v !== null && v !== ""))
        .map(({ row, index: i }) => {
          const get = (k: string) => {
            const v = row[header!.indexOf(k)];
            return v instanceof Date
              ? v.toISOString().slice(0, 10)
              : String(v ?? "").trim();
          };
          const r: Candidate = {
            row: i + 2,
            dossier: get("maHoSo"),
            fullName: get("hoTen"),
            dateOfBirth: get("ngaySinh"),
            email: get("email"),
            phone: get("sdt"),
            citizenId: get("cccd"),
            entranceScore: Number(get("diemDauVao")),
            group: 0,
            errors: [],
          };
          if (!r.dossier) r.errors.push("Thiếu mã hồ sơ");
          if (imports.includes(r.dossier) || seenDossier.has(r.dossier))
            r.errors.push("Mã hồ sơ đã nhập hoặc bị trùng");
          if (!r.fullName) r.errors.push("Thiếu họ tên");
          if (
            !/^\d{4}-\d{2}-\d{2}$/.test(r.dateOfBirth) ||
            !Number.isFinite(Date.parse(r.dateOfBirth)) ||
            r.dateOfBirth >= new Date().toISOString().slice(0, 10)
          )
            r.errors.push("Ngày sinh phải có dạng YYYY-MM-DD và trong quá khứ");
          if (validateEmail(r.email)) r.errors.push(validateEmail(r.email));
          if (r.phone && validatePhone(r.phone))
            r.errors.push(validatePhone(r.phone));
          if (r.citizenId && !/^\d{12}$/.test(r.citizenId))
            r.errors.push("CCCD phải có 12 chữ số");
          const matching = d.studentData.filter(
            (s) =>
              s.dto.email.toLowerCase() === r.email.toLowerCase() ||
              (r.citizenId && a.people[s.id]?.citizenId === r.citizenId),
          );
          if (seenEmail.has(r.email.toLowerCase()))
            r.errors.push("Email bị trùng trong tệp");
          if (r.citizenId && seenCitizen.has(r.citizenId))
            r.errors.push("CCCD bị trùng trong tệp");
          if (matching.length) {
            const existing = matching[0],
              linked = auth.users.find(
                (u) => u.username === existing.id && u.role === "STUDENT",
              );
            const same =
              matching.length === 1 &&
              existing.dto.email.toLowerCase() === r.email.toLowerCase() &&
              existing.dto.fullName.trim().toLowerCase() ===
                r.fullName.toLowerCase() &&
              existing.dto.dateOfBirth === r.dateOfBirth &&
              (!r.citizenId ||
                a.people[existing.id]?.citizenId === r.citizenId);
            if (!reuseExisting)
              r.errors.push(
                "Hồ sơ đã tồn tại. Chọn dùng lại hồ sơ khớp thông tin và kiểm tra lại nếu muốn phân lớp lại.",
              );
            else if (!same)
              r.errors.push(
                "Thông tin không khớp hoàn toàn hồ sơ hiện có; cần đối chiếu thủ công.",
              );
            else if (
              existing.dto.activityStatus !== "STUDYING" ||
              linked?.status !== "ACTIVE"
            )
              r.errors.push(
                "Hồ sơ hoặc tài khoản không hoạt động; xử lý trạng thái trước khi dùng lại.",
              );
            else r.existingId = existing.dto.id;
          } else if (
            r.citizenId &&
            Object.values(a.people).some((p) => p.citizenId === r.citizenId)
          )
            r.errors.push("CCCD đã thuộc hồ sơ khác; cần đối chiếu thủ công.");
          if (
            !get("diemDauVao") ||
            !Number.isFinite(r.entranceScore) ||
            r.entranceScore < 0 ||
            r.entranceScore > 30
          )
            r.errors.push("Điểm đầu vào phải từ 0 đến 30");
          seenEmail.add(r.email.toLowerCase());
          seenDossier.add(r.dossier);
          if (r.citizenId) seenCitizen.add(r.citizenId);
          return r;
        });
      if (!parsed.length)
        throw Error("Danh sách chưa có dòng dữ liệu sinh viên.");
      const good = parsed.filter((r) => !r.errors.length);
      if (!good.length) {
        setRows(parsed);
        setGroups([]);
        return;
      }
      const count = Math.ceil(good.length / max);
      const allocated = allocateByScore(good, count);
      allocated.forEach((group, i) => group.forEach((r) => (r.group = i)));
      let index = 1;
      const names: string[] = [];
      for (let i = 0; i < count; i++) {
        let name = "";
        do {
          name = `CT${cohortCode.slice(1)}-${String(index++).padStart(2, "0")}`;
        } while (a.adminClasses.some((c) => c.className === name));
        names.push(name);
      }
      setGroups(names);
      setRows(parsed);
      setAccepted(false);
    } catch (e) {
      setError({
        file: e instanceof Error ? e.message : "Không thể đọc danh sách.",
      });
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    setBusy(true);
    try {
      if (!valid.length) throw Error("Không có hồ sơ hợp lệ.");
      if (groupRows.some((g) => g.length > max))
        throw Error("Có lớp vượt sĩ số tối đa. Hãy điều chỉnh lại.");
      if (duplicates.length)
        throw Error(
          `Trùng họ tên trong cùng lớp: ${duplicates.join("; ")}. Hãy chuyển lớp trước khi xác nhận.`,
        );
      if (under && !accepted)
        throw Error("Vui lòng xác nhận các lớp dưới sĩ số tối thiểu.");
      let nextClass = Math.max(0, ...a.adminClasses.map((c) => c.id));
      if (groupRows.some((g) => g.length === 0))
        throw Error(
          "Có lớp trống. Hãy chuyển sinh viên vào lớp hoặc bỏ lớp trống trước khi xác nhận.",
        );
      const classes: AdministrativeClassResponse[] = groups.map((name, i) => ({
        id: ++nextClass,
        className: name,
        majorCode: "CT",
        majorName: "Công nghệ thông tin",
        cohortCode,
        trainingType: training,
        currentSize: groupRows[i].length,
        maxCapacity: max,
      }));
      const students = [...d.studentData.map((s) => s.dto)],
        created: {
          student: import("../../types/dto").StudentResponse;
          candidate: Candidate;
        }[] = [];
      for (const r of valid) {
        const cls = classes[r.group];
        const existing = r.existingId
          ? students.find((s) => s.id === r.existingId)
          : undefined;
        const s = existing
          ? {
              ...existing,
              className: cls.className,
              cohortCode: cls.cohortCode,
              trainingType: cls.trainingType,
              statusReason: `Phân lớp lại · ${r.dossier}`,
            }
          : createStudent(
              {
                fullName: r.fullName,
                dateOfBirth: r.dateOfBirth,
                email: r.email,
                phone: r.phone,
                citizenId: r.citizenId,
                majorId: 1,
                cohortId: cohort,
                administrativeClassId: cls.id,
                entranceScore: r.entranceScore,
                reason: `Nhập học · ${r.dossier}`,
              },
              students,
              [...a.adminClasses, ...classes],
            );
        if (existing)
          students[students.findIndex((x) => x.id === existing.id)] = s;
        else students.push(s);
        created.push({ student: s, candidate: r });
      }
      await auth.provisionAccounts(
        created
          .filter(({ candidate }) => !candidate.existingId)
          .map(({ student: s }) => ({
            username: s.studentCode,
            email: s.email,
            fullName: s.fullName,
            role: "STUDENT",
          })),
      );
      a.setAdminClasses((old) => [
        ...old.map((c) => ({
          ...c,
          currentSize:
            c.currentSize === null
              ? null
              : Math.max(
                  0,
                  c.currentSize -
                    created.filter(
                      (x) =>
                        x.candidate.existingId &&
                        d.studentData.find(
                          (s) => s.dto.id === x.candidate.existingId,
                        )?.className === c.className,
                    ).length,
                ),
        })),
        ...classes,
      ]);
      d.updateStudents(students.map(studentView));
      a.setPeople((old) => ({
        ...old,
        ...Object.fromEntries(
          created.map(({ student: s, candidate: r }) => [
            s.studentCode,
            {
              ...old[s.studentCode],
              citizenId: r.citizenId,
              dateOfBirth: r.dateOfBirth,
              reason: r.dossier,
              emailStatus: r.existingId
                ? old[s.studentCode]?.emailStatus
                : "Chưa gửi — chưa kết nối dịch vụ email",
            },
          ]),
        ),
      }));
      setImports((old) => [...old, ...valid.map((r) => r.dossier)]);
      log(
        "Admin học vụ",
        "Phân luồng nhập học",
        `${created.length} sinh viên · ${groups.join(", ")}`,
      );
      setResult(
        created.map(
          ({ student: s }) =>
            `${s.studentCode} · ${s.fullName} · ${s.className} · ${created.find((x) => x.student.id === s.id)?.candidate.existingId ? "Dùng lại tài khoản" : "Tài khoản mới"}`,
        ),
      );
      setRows([]);
      setGroups([]);
      notify(
        `Đã phân lớp ${created.length} sinh viên; tạo ${created.filter((x) => !x.candidate.existingId).length} tài khoản mới. Email cấp tài khoản chưa được gửi.`,
      );
    } catch (e) {
      setError({
        confirm:
          e instanceof Error ? e.message : "Không thể xác nhận nhập học.",
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Phân luồng nhập học</h1>
          <p>
            Kiểm tra danh sách → Xem và điều chỉnh lớp → Tạo hồ sơ, tài khoản.
          </p>
        </div>
        <button
          className="btn"
          onClick={() =>
            exportCsv("cau-truc-danh-sach-nhap-hoc.csv", [columns])
          }
        >
          Tải cấu trúc danh sách
        </button>
      </div>
      <section className="card admissions-card">
        <h2>1. Danh sách trúng tuyển</h2>
        <div className="academic-fields">
          <label>
            Ngành
            <select>
              <option>Công nghệ thông tin</option>
            </select>
          </label>
          <label>
            Khóa
            <select
              value={cohort}
              onChange={(e) => {
                setCohort(+e.target.value);
                invalidate();
              }}
            >
              <option value="1">K2026</option>
              <option value="2">K2025</option>
            </select>
          </label>
          <label>
            Hệ đào tạo
            <select
              value={training}
              onChange={(e) => {
                setTraining(e.target.value as TrainingType);
                invalidate();
              }}
            >
              <option value="CHINH_QUY">Chính quy</option>
              <option value="LIEN_THONG">Liên thông</option>
              <option value="VAN_BANG_2">Văn bằng 2</option>
            </select>
          </label>
          <label>
            Sĩ số tối thiểu
            <input
              type="number"
              value={min}
              onChange={(e) => {
                setMin(+e.target.value);
                invalidate();
              }}
            />
            <span className="field-error">{error.min}</span>
          </label>
          <label>
            Sĩ số tối đa
            <input
              type="number"
              value={max}
              onChange={(e) => {
                setMax(+e.target.value);
                invalidate();
              }}
            />
            <span className="field-error">{error.max}</span>
          </label>
          <label>
            Danh sách Excel / CSV
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                invalidate();
              }}
            />
            <span className="field-error">{error.file}</span>
          </label>
        </div>
        <label className="check-line">
          <input
            type="checkbox"
            checked={reuseExisting}
            onChange={(e) => {
              setReuseExisting(e.target.checked);
              invalidate();
            }}
          />
          Dùng lại hồ sơ và tài khoản đang hoạt động khi họ tên, ngày sinh,
          email và CCCD khớp. Giữ nguyên MSSV, mật khẩu và lịch sử học tập; cập
          nhật lớp, khóa và hệ đào tạo theo đợt này.
        </label>
        <p style={{ marginBottom: "10px" }}>
          Ngày sinh: YYYY-MM-DD. Số điện thoại và CCCD cần giữ dạng văn bản để
          không mất số 0 đầu. Giới hạn tệp: 10 MB.
        </p>
        <button className="btn primary" disabled={busy} onClick={preview}>
          {busy ? "Đang xử lý…" : "Kiểm tra và phân lớp"}
        </button>
      </section>
      {!!rows.length && (
        <section className="card admissions-card">
          <h2>2. Kiểm tra và điều chỉnh</h2>
          <p>
            <b>{valid.length}</b> hồ sơ hợp lệ ·{" "}
            <b>{rows.length - valid.length}</b> hồ sơ cần sửa. Các dòng lỗi
            không được nhập.
          </p>
          <p>
            Phân lớp đề xuất theo điểm giảm dần, luân phiên chiều phân bổ để cân
            bằng điểm. Có thể điều chỉnh từng sinh viên trước khi xác nhận.
          </p>
          <div className="admission-stats">
            {groups.map((name, i) => (
              <div key={name}>
                <b>{name}</b>
                <span>
                  {groupRows[i].length}/{max} sinh viên
                </span>
                <small>
                  Điểm TB:{" "}
                  {groupRows[i].length
                    ? (
                        groupRows[i].reduce((s, r) => s + r.entranceScore, 0) /
                        groupRows[i].length
                      ).toFixed(2)
                    : "—"}
                </small>
                {!groupRows[i].length && (
                  <button
                    className="btn"
                    onClick={() => {
                      setGroups((old) => old.filter((_, n) => n !== i));
                      setRows((old) =>
                        old.map((r) => ({
                          ...r,
                          group: r.group > i ? r.group - 1 : r.group,
                        })),
                      );
                    }}
                  >
                    Bỏ lớp trống
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            style={{ marginBottom: "10px" }}
            className="btn"
            onClick={() =>
              setGroups((old) => {
                let n = 1,
                  name = "";
                do {
                  name = `CT${cohortCode.slice(1)}-${String(n++).padStart(2, "0")}-BS`;
                } while (
                  old.includes(name) ||
                  a.adminClasses.some((c) => c.className === name)
                );
                return [...old, name];
              })
            }
          >
            Thêm lớp để điều chỉnh
          </button>
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
                    "Lớp phân bổ / lỗi",
                  ].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td>{r.dossier}</td>
                    <td>
                      {r.fullName}
                      {r.existingId && (
                        <small>Dùng lại hồ sơ #{r.existingId}</small>
                      )}
                    </td>
                    <td>{r.email}</td>
                    <td>{r.entranceScore}</td>
                    <td>
                      {r.errors.length ? (
                        <span className="field-error">
                          {r.errors.join("; ")}
                        </span>
                      ) : (
                        <select
                          aria-label={`Lớp của ${r.fullName}`}
                          value={r.group}
                          onChange={(e) =>
                            setRows((old) =>
                              old.map((x) =>
                                x.row === r.row
                                  ? { ...x, group: +e.target.value }
                                  : x,
                              ),
                            )
                          }
                        >
                          {groups.map((g, i) => (
                            <option key={g} value={i}>
                              {g}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {under && (
            <label className="check-line">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              Tôi chấp nhận các lớp dưới sĩ số tối thiểu sau khi kiểm tra phân
              bổ.
            </label>
          )}
          {!!duplicates.length && (
            <p className="field-error">
              Cần tách sinh viên trùng họ tên trong cùng lớp:{" "}
              {duplicates.join("; ")}.
            </p>
          )}
          <p className="field-error">{error.confirm}</p>
          <button
            className="btn primary"
            disabled={busy || !valid.length || !!duplicates.length}
            onClick={() =>
              setDialog({
                title: "Xác nhận phân luồng nhập học",
                body: `Phân lớp ${valid.length} sinh viên: ${valid.filter((r) => !r.existingId).length} hồ sơ/tài khoản mới và ${valid.filter((r) => r.existingId).length} hồ sơ dùng lại. Tài khoản dùng lại giữ nguyên mật khẩu và lịch sử. Tài khoản mới bắt buộc đổi mật khẩu lần đầu; email chưa được gửi.`,
                confirm: "Xác nhận tạo",
                action: () => {
                  void commit();
                },
              })
            }
          >
            Xác nhận phân lớp và cấp tài khoản
          </button>
        </section>
      )}
      {!!result.length && (
        <section className="card admissions-card">
          <h2>Kết quả đợt phân lớp gần nhất · {result.length} sinh viên</h2>
          <p>
            Mật khẩu khởi tạo của tài khoản mới theo use case: <b>12345</b>.
            Người dùng bắt buộc đổi mật khẩu trước khi vào chức năng chính.
          </p>
          <p>
            Email cấp tài khoản chưa được gửi. Không đánh dấu đã gửi khi chưa có
            dịch vụ email.
          </p>
          <ul>
            {result.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <button
            className="btn"
            onClick={() =>
              notifyError(
                "Chưa kết nối dịch vụ email. Hồ sơ và tài khoản đã tạo được giữ nguyên; cần ghép API gửi lại email để tiếp tục.",
              )
            }
          >
            Gửi lại email cấp tài khoản
          </button>
        </section>
      )}
    </>
  );
}

