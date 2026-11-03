import { useState } from "react";
import { Plus, Download, Search, Pencil, Trash2 } from "lucide-react";
import { useManagement } from "../../context/ManagementContext";
import { useUI } from "../../context/UIContext";
import { entityConfig } from "../../config/management";
import { ManagementHeading } from "./ManagementHeading";
import type { Entity, RecordRow } from "../../types/management";
import { exportCsv } from "../../utils/exportCsv";
export default function RecordManager({ entity }: { entity: Entity }) {
  const { records, setRecords, log } = useManagement();
  const { notify, notifyError, setDialog } = useUI();
  const config = entityConfig[entity];
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [draft, setDraft] = useState<RecordRow | null>(null),
    [editing, setEditing] = useState(false),
    [error, setErrorState] = useState("");
  const filtered = records[entity].filter(
    (r) =>
      Object.values(r)
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")) &&
      (!status || r.status === status),
  );
  const count = Math.max(1, Math.ceil(filtered.length / 8));
  const current = Math.min(page, count);
  function setError(message: string) {
    setErrorState(message);
    if (message) notifyError(message);
  }
  function open(row?: RecordRow) {
    setEditing(!!row);
    setError("");
    setDraft(
      row
        ? { ...row }
        : (Object.fromEntries([
            ["id", ""],
            ...config.fields.map((f) => [
              f.key,
              f.options?.[0] ??
                (f.source ? (records[f.source][0]?.id ?? "") : ""),
            ]),
          ]) as RecordRow),
    );
  }
  function save() {
    if (!draft) return;
    const value = Object.fromEntries(
      Object.entries(draft).map(([k, v]) => [k, v.trim()]),
    ) as RecordRow;
    if (Object.values(value).some((v) => !v))
      return setError("Vui lòng điền đầy đủ thông tin.");
    if (
      !editing &&
      records[entity].some((r) => r.id.toLowerCase() === value.id.toLowerCase())
    )
      return setError("Mã đã tồn tại. Vui lòng sử dụng mã khác.");
    if (
      entity === "subjects" &&
      records.subjects.some(
        (r) =>
          r.id !== value.id &&
          r.name.toLowerCase() === value.name.toLowerCase(),
      )
    )
      return setError("Tên học phần đã tồn tại.");
    if (
      entity === "accounts" &&
      value.id === "admin" &&
      (value.role !== "Admin hệ thống" || value.status !== "Đang hoạt động")
    )
      return setError(
        "Không được thay đổi quyền hoặc khóa tài khoản quản trị đang dùng.",
      );
    if (entity === "classes") {
      if (+value.start > +value.end)
        return setError("Tiết kết thúc phải lớn hơn hoặc bằng tiết bắt đầu.");
      const room = records.rooms.find((r) => r.id === value.room);
      const teacher = records.teachers.find((r) => r.id === value.teacher);
      const subject = records.subjects.find((r) => r.id === value.subject);
      if (
        !room ||
        room.status !== "Sẵn sàng" ||
        teacher?.status !== "Đang hoạt động" ||
        subject?.status !== "Đang sử dụng"
      )
        return setError(
          "Phòng, giảng viên và học phần phải ở trạng thái hoạt động.",
        );
      if (+value.capacity > +room.capacity)
        return setError("Sĩ số vượt quá sức chứa của phòng.");
      const clash = records.classes.find(
        (r) =>
          r.id !== value.id &&
          r.status === "Đang mở" &&
          value.status === "Đang mở" &&
          r.day === value.day &&
          +r.start <= +value.end &&
          +value.start <= +r.end &&
          (r.room === value.room || r.teacher === value.teacher),
      );
      if (clash)
        return setError(
          "Trùng lịch phòng hoặc giảng viên với lớp " + clash.id + ".",
        );
    }
    setRecords((old) => ({
      ...old,
      [entity]: editing
        ? old[entity].map((r) => (r.id === value.id ? value : r))
        : [...old[entity], value],
    }));
    log(
      entity === "accounts" ? "Admin hệ thống" : "Admin học vụ",
      editing ? "Cập nhật" : "Thêm mới",
      config.singular + " " + value.id,
    );
    setDraft(null);
    notify("Đã lưu " + config.singular + ".");
  }
  function remove(row: RecordRow) {
    const linked =
      (entity === "subjects" || entity === "teachers" || entity === "rooms") &&
      records.classes.some(
        (r) =>
          r[
            entity === "subjects"
              ? "subject"
              : entity === "teachers"
                ? "teacher"
                : "room"
          ] === row.id,
      );
    if (
      linked ||
      entity === "classes" ||
      (entity === "accounts" && row.id === "admin")
    )
      return notifyError(
        "Bản ghi đang được sử dụng. Hãy cập nhật trạng thái thay vì xóa.",
      );
    setDialog({
      title: "Xóa " + config.singular + "?",
      body: "Xóa " + row.id + " khỏi dữ liệu. Thao tác này không thể hoàn tác.",
      confirm: "Xóa",
      action: () => {
        setRecords((old) => ({
          ...old,
          [entity]: old[entity].filter((r) => r.id !== row.id),
        }));
        log(
          entity === "accounts" ? "Admin hệ thống" : "Admin học vụ",
          "Xóa",
          row.id,
        );
        notify("Đã xóa bản ghi.");
      },
    });
  }
  function cell(row: RecordRow, key: string) {
    const f = config.fields.find((f) => f.key === key);
    return f?.source
      ? (records[f.source].find((r) => r.id === row[key])?.name ?? row[key])
      : row[key];
  }
  return (
    <>
      <ManagementHeading title={config.title} description={config.description}>
        <button
          className="btn"
          onClick={() =>
            exportCsv(entity + ".csv", [
              ["Mã", ...config.fields.map((f) => f.label)],
              ...filtered.map((r) => [
                r.id,
                ...config.fields.map((f) => cell(r, f.key)),
              ]),
            ])
          }
        >
          <Download size={15} />
          Xuất CSV
        </button>
        <button className="btn primary" onClick={() => open()}>
          <Plus size={16} />
          Thêm {config.singular}
        </button>
      </ManagementHeading>
      <section className="card">
        <div className="management-toolbar">
          <label className="management-search">
            <span>
              <Search size={14} /> Tìm kiếm
            </span>
            <input
              placeholder="Nhập mã, tên hoặc thông tin…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            Trạng thái
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              {[...new Set(records[entity].map((r) => r.status))].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <span className="result-count">{filtered.length} bản ghi</span>
        </div>
        <div className="table-scroll">
          <table className="management-table">
            <thead>
              <tr>
                <th>Mã</th>
                {config.fields.map((f) => (
                  <th key={f.key}>{f.label}</th>
                ))}
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice((current - 1) * 8, current * 8).map((r) => (
                <tr key={r.id}>
                  <td>
                    <b className="code-text">{r.id}</b>
                  </td>
                  {config.fields.map((f) => (
                    <td key={f.key}>
                      {f.key === "status" ? (
                        <span
                          className={
                            "badge " +
                            (/Đang|Sẵn/.test(r.status) ? "green" : "gray")
                          }
                        >
                          {r.status}
                        </span>
                      ) : (
                        cell(r, f.key)
                      )}
                    </td>
                  ))}
                  <td>
                    <div className="management-actions">
                      <button
                        className="btn"
                        aria-label={"Sửa " + r.id}
                        onClick={() => open(r)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn"
                        aria-label={"Xóa " + r.id}
                        onClick={() => remove(r)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <div className="empty-state">Không tìm thấy bản ghi phù hợp.</div>
        )}
        <div className="table-footer">
          <span>
            Trang {current} / {count}
          </span>
          <div className="management-actions">
            <button
              className="btn"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              Trước
            </button>
            <button
              className="btn"
              disabled={current === count}
              onClick={() => setPage(current + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </section>
      {draft && (
        <div className="dialog-backdrop" onClick={() => setDraft(null)}>
          <section
            className="dialog record-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setDraft(null);
            }}
          >
            <h2 id="record-title">
              {editing ? "Cập nhật" : "Thêm"} {config.singular}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <div className="record-fields">
                <label>
                  Mã
                  <input
                    autoFocus
                    required
                    value={draft.id}
                    disabled={editing}
                    onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                  />
                </label>
                {config.fields.map((f) => (
                  <label key={f.key}>
                    {f.label}
                    {f.options || f.source ? (
                      <select
                        value={draft[f.key]}
                        required
                        onChange={(e) =>
                          setDraft({ ...draft, [f.key]: e.target.value })
                        }
                      >
                        {f.source ? (
                          <>
                            <option value="">
                              Chọn {f.label.toLowerCase()}
                            </option>
                            {records[f.source].map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.id} — {r.name}
                              </option>
                            ))}
                          </>
                        ) : (
                          f.options?.map((o) => <option key={o}>{o}</option>)
                        )}
                      </select>
                    ) : (
                      <input
                        required
                        type={f.type ?? "text"}
                        min={f.min}
                        max={f.max}
                        step={1}
                        value={draft[f.key]}
                        onChange={(e) =>
                          setDraft({ ...draft, [f.key]: e.target.value })
                        }
                      />
                    )}
                  </label>
                ))}
              </div>
              {error && (
                <p className="notice red" role="alert">
                  {error}
                </p>
              )}
              <div className="dialog-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setDraft(null)}
                >
                  Hủy
                </button>
                <button className="btn primary">Lưu thông tin</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
