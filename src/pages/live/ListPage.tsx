import { exportCsv } from "../../utils/exportCsv";
import { useUI } from "../../context/UIContext";
import { useEffect, useRef, useState } from "react";
import { catalog, names, labels, type Row, type Action } from "./catalog";
import { readAllPages, useLiveRequest } from "./client";
import { ActionForm, fieldType, show, message } from "./ActionForm";
import { Detail, Pager } from "../../components/academic-admin/AcademicUI";
import type { PageResponse } from "../../services/api/backendContract";
import { Opening } from "./Opening";

const headings: Record<string, [string, string]> = {
  admin: ["Quản lý sinh viên", ""],
  teachers: [
    "Quản lý giảng viên",
    "Tra cứu hồ sơ và thông tin liên hệ của giảng viên.",
  ],
  subjects: ["Danh mục học phần", "Quản lý học phần và điều kiện tiên quyết."],
  terms: [
    "Quản lý kỳ học",
    "Thời gian đăng ký của kỳ và công bố từng lớp là hai điều kiện riêng.",
  ],
  classes: [
    "Lớp học phần & lịch học",
    "Tạo lớp, xếp lịch, rồi công bố cho sinh viên đăng ký.",
  ],
};
const short: Record<string, string> = {
  studentUpdate: "Sửa",
  subjectUpdate: "Sửa",
  subjectSetPrerequisites: "Tiên quyết",
  subjectDelete: "Xóa mềm",
  semesterUpdate: "Cập nhật",
  moduleClassUpdate: "Đổi sức chứa",
};
function enabled(a: Action, row: Row) {
  if (a.op.startsWith("moduleClass") && row.status === "CANCELLED")
    return false;
  if (a.op === "semesterUpdate" && (row.isLocked || row.status === "ENDED"))
    return false;
  return !(
    row.status === "INACTIVE" &&
    ["subjectUpdate", "subjectSetPrerequisites", "subjectDeactivate"].includes(
      a.op,
    )
  );
}
export function ListPage({ page }: { page: string }) {
  const s = catalog[page],
    request = useLiveRequest();
  const [query, setQuery] = useState(""),
    [index, setIndex] = useState(0),
    [revision, refresh] = useState(0),
    [result, setResult] = useState<PageResponse<Row>>(),
    [error, setError] = useState(""),
    [row, setRow] = useState<Row>(),
    [action, setAction] = useState<Action>(),
    [id, select] = useState<number>(),
    [detailError, setDetailError] = useState(""),
    [tab, setTab] = useState(0),
    [opening, setOpening] = useState(false);
  const [lookups, setLookups] = useState<Record<string, Row[]>>({}),
    [exporting, setExporting] = useState(false);
  const { notifyError } = useUI();
  useEffect(() => {
    if (page !== "classes") return;
    let active = true;
    for (const [key, op] of [
      ["semesterId", "semestersSearch"],
      ["subjectId", "subjectsSearch"],
      ["lecturerId", "lecturersSearch"],
    ] as const) {
      readAllPages<Row>(request, op, undefined, () => active)
        .then((rows) => {
          if (active) setLookups((old) => ({ ...old, [key]: rows }));
        })
        .catch(() => {
          /* Allow entering a known backend ID when a lookup is unavailable. */
        });
    }
    return () => {
      active = false;
    };
  }, [page, request]);
  const dialog = useRef<HTMLDialogElement>(null),
    modal = !!(id || action);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
  }, [modal]);
  useEffect(() => {
    let active = true;
    const q = new URLSearchParams(query);
    q.set("page", String(index));
    q.set("size", "10");
    setResult(undefined);
    setError("");
    request<PageResponse<Row>>(s.list, undefined, undefined, q)
      .then((r) => {
        if (active) {
          if (index && index >= r.totalPages)
            setIndex(Math.max(0, r.totalPages - 1));
          else setResult(r);
        }
      })
      .catch((e) => {
        if (active) setError(message(e));
      });
    return () => {
      active = false;
    };
  }, [request, s, index, query, revision]);
  useEffect(() => {
    if (!id || !s.detail) return;
    let active = true;
    setDetailError("");
    request<Row>(s.detail, id)
      .then((r) => {
        if (active) setRow(r);
      })
      .catch((e) => {
        if (active) setDetailError(message(e));
      });
    return () => {
      active = false;
    };
  }, [request, s, id]);
  function open(r: Row, a?: Action) {
    setRow(undefined);
    setDetailError("");
    select(Number(r.id));
    setAction(a);
  }
  function close() {
    select(undefined);
    setRow(undefined);
    setAction(undefined);
    setDetailError("");
  }
  const cols = s.columns.split(" "),
    applied = new URLSearchParams(query);
  const linkColumn =
    page === "subjects"
      ? "subjectName"
      : page === "teachers"
        ? "fullName"
        : page === "terms"
          ? "semesterName"
          : page === "classes"
            ? "moduleClassCode"
            : "";
  const rowActions = s.actions.filter(
    (a) => !a.op.endsWith("ResendNotification"),
  );
  const cell = (k: string, r: Row) =>
    k === "studyRange"
      ? [r.startDate, r.endDate].join(" → ")
      : k === "registrationRange"
        ? [r.registrationStart, r.registrationEnd].join(" → ")
        : k === "size"
          ? r.currentSize + " / " + r.maxCapacity
          : show(k, r[k]);
  return (
    <>
      <div className="page-title">
        <div>
          <h1>{headings[page][0]}</h1>
          {headings[page][1] && <p>{headings[page][1]}</p>}
        </div>
        {s.create && (
          <button className="btn primary" onClick={() => setAction(s.create)}>
            {page === "admin"
              ? "Thêm mới sinh viên"
              : page === "terms"
                ? "Thêm kỳ học"
                : s.create.title}
          </button>
        )}
        {page === "classes" && !tab && (
          <button className="btn primary" onClick={() => setOpening(true)}>
            Tạo lớp học phần
          </button>
        )}
      </div>
      {page === "classes" && (
        <div
          className="class-tabs"
          role="tablist"
          aria-label="Quản lý lớp học phần"
        >
          {["1. Danh sách lớp", "2. Xếp lịch", "3. Công bố đăng ký"].map(
            (name, i) => (
              <button
                key={name}
                role="tab"
                aria-selected={tab === i}
                className={tab === i ? "active" : ""}
                onClick={() => {
                  setTab(i);
                  setOpening(false);
                }}
              >
                {name}
              </button>
            ),
          )}
        </div>
      )}
      {opening && (
        <Opening
          back={() => {
            setOpening(false);
            refresh((n) => n + 1);
          }}
        />
      )}
      {tab > 0 ? (
        <section className="card">
          <h2>{tab === 1 ? "Xếp lịch học" : "Công bố đăng ký"}</h2>
          <p className="empty-state">
            Chờ API{" "}
            {tab === 1
              ? "phân công giảng viên và xếp lịch học"
              : "công bố lớp và mở đăng ký"}
            .
          </p>
        </section>
      ) : (
        <section className={page === "admin" ? "card admin-card" : "card"}>
          <form
            className="admin-filter"
            key={query}
            onSubmit={(e) => {
              e.preventDefault();
              const q = new URLSearchParams();
              for (const [k, v] of new FormData(e.currentTarget))
                if (String(v).trim()) q.set(k, String(v).trim());
              setQuery(q.toString());
              setIndex(0);
            }}
          >
            {s.filters.split(" ").map((k) => {
              const options =
                k === "status"
                  ? s.status
                  : k === "activityStatus"
                    ? "STUDYING DEACTIVATED DELETED"
                    : k === "withoutPrerequisites"
                      ? "true"
                      : k === "credits"
                        ? "1 2 3 4 5"
                        : "";
              return (
                <label key={k}>
                  {k === "keyword" && page === "admin"
                    ? "Từ khóa (MSSV hoặc họ tên)"
                    : names[k]}
                  {lookups[k] ? (
                    <select name={k} defaultValue={applied.get(k) ?? ""}>
                      <option value="">Tất cả</option>
                      {lookups[k].map((r) => (
                        <option key={Number(r.id)} value={Number(r.id)}>
                          {k === "semesterId"
                            ? show("semesterName", r.semesterName)
                            : k === "subjectId"
                              ? r.subjectCode + " · " + r.subjectName
                              : r.lecturerCode + " · " + r.fullName}
                        </option>
                      ))}
                    </select>
                  ) : options ? (
                    <select name={k} defaultValue={applied.get(k) ?? ""}>
                      <option value="">Tất cả</option>
                      {options.split(" ").map((o) => (
                        <option key={o} value={o}>
                          {labels[o] ?? (o === "true" ? "Có" : o)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={k}
                      defaultValue={applied.get(k) ?? ""}
                      type={fieldType(k)}
                      min="1"
                    />
                  )}
                </label>
              );
            })}
            <button className="btn primary">Tìm kiếm</button>
            <button
              className="btn"
              type="reset"
              onClick={() => {
                setQuery("");
                setIndex(0);
              }}
            >
              Xóa bộ lọc
            </button>
          </form>
          {page === "classes" && (
            <div className="academic-toolbar">
              <button
                className="btn"
                disabled={exporting || !result?.totalElements}
                onClick={async () => {
                  setExporting(true);
                  try {
                    const rows = await readAllPages<Row>(
                      request,
                      s.list,
                      new URLSearchParams(query),
                    );
                    exportCsv("danh-sach-lop-hoc-phan.csv", [
                      cols.map((k) => names[k]),
                      ...rows.map((r) => cols.map((k) => cell(k, r))),
                    ]);
                  } catch (e) {
                    notifyError(message(e));
                  } finally {
                    setExporting(false);
                  }
                }}
              >
                {exporting ? "Đang xuất…" : "Xuất danh sách CSV"}
              </button>
            </div>
          )}
          <div className="table-scroll">
            <table
              className={page === "admin" ? "admin-table" : "management-table"}
            >
              <thead>
                <tr>
                  {cols.map((k) => (
                    <th key={k}>{names[k]}</th>
                  ))}
                  {page !== "teachers" && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {result?.content.map((r) => (
                  <tr key={Number(r.id)}>
                    {cols.map((k) => (
                      <td key={k}>
                        {k === linkColumn ? (
                          <button className="text-link" onClick={() => open(r)}>
                            {cell(k, r)}
                          </button>
                        ) : k === "activityStatus" || k === "status" ? (
                          <span
                            className={
                              "badge " +
                              (["ACTIVE", "STUDYING", "OPEN"].includes(
                                String(r[k]),
                              )
                                ? "green"
                                : "gray")
                            }
                          >
                            {cell(k, r)}
                          </span>
                        ) : (
                          cell(k, r)
                        )}
                        {page === "terms" && k === "semesterName" && (
                          <small>{String(r.semesterCode)}</small>
                        )}
                      </td>
                    ))}
                    {page !== "teachers" && (
                      <td>
                        <div className="management-actions">
                          {page === "admin" && (
                            <button className="btn" onClick={() => open(r)}>
                              Xem
                            </button>
                          )}
                          {rowActions.map((a) => (
                            <button
                              className="btn"
                              key={a.op}
                              disabled={!enabled(a, r)}
                              onClick={() => open(r, a)}
                            >
                              {short[a.op] ?? a.title}
                            </button>
                          ))}
                          {page === "admin" && (
                            <button
                              className="btn"
                              disabled
                              title="Chờ API thay đổi trạng thái sinh viên"
                            >
                              {r.activityStatus === "DEACTIVATED"
                                ? "Tái kích hoạt"
                                : "Vô hiệu hóa"}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error ? (
            <p className="empty-state" role="alert">
              {error}{" "}
              <button className="btn" onClick={() => refresh((n) => n + 1)}>
                Thử lại
              </button>
            </p>
          ) : !result ? (
            <p className="empty-state">Đang tải…</p>
          ) : !result.content.length ? (
            <p className="empty-state">Không tìm thấy kết quả phù hợp.</p>
          ) : null}
          {result && (
            <Pager
              total={result.totalElements}
              page={index}
              setPage={setIndex}
            />
          )}
        </section>
      )}
      {modal && (
        <dialog
          className="dialog record-dialog live-dialog"
          ref={dialog}
          aria-label={action?.title ?? "Chi tiết"}
          onCancel={(e) => {
            if (dialog.current?.querySelector("form[aria-busy=true]"))
              e.preventDefault();
            else close();
          }}
        >
          {id && !row ? (
            <>
              <p>{detailError || "Đang tải chi tiết…"}</p>
              <button className="btn" onClick={close}>
                Đóng
              </button>
            </>
          ) : action ? (
            <ActionForm
              action={action}
              row={row}
              cancel={close}
              done={() => {
                close();
                refresh((n) => n + 1);
              }}
            />
          ) : (
            <>
              <h2>
                Chi tiết ·{" "}
                {String(
                  row?.fullName ??
                    row?.subjectName ??
                    row?.semesterName ??
                    row?.moduleClassCode ??
                    "",
                )}
              </h2>
              <Detail
                items={Object.entries(row ?? {}).map(([k, v]) => [
                  names[k] ?? k,
                  show(k, v),
                ])}
              />
              <div className="dialog-actions">
                <button className="btn" onClick={close}>
                  Đóng
                </button>
                {s.actions
                  .filter((a) => a.op.endsWith("ResendNotification"))
                  .map((a) => (
                    <button
                      key={a.op}
                      className="btn primary"
                      onClick={() => setAction(a)}
                    >
                      {a.title}
                    </button>
                  ))}
              </div>
            </>
          )}
        </dialog>
      )}
    </>
  );
}
