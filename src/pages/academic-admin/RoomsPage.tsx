import { useEffect, useMemo, useRef, useState } from "react";
import { useAcademic } from "../../context/AcademicContext";
import { useUI } from "../../context/UIContext";
import {
  EditForm,
  Detail,
  Pager,
  type Field,
} from "../../components/academic-admin/AcademicUI";
import { useLiveRequest } from "../live/client";
import { ApiError } from "../../services/api/httpClient";
import type {
  RoomResponse as Room,
  RoomSearchRequest as Query,
  CreateRoomRequest as Input,
  RoomStatus,
  PageResponse,
} from "../../services/api/backendContract";
import {
  demoRoom,
  roomInput,
  searchRooms,
  validateRoom,
} from "../../services/academic/rooms";

export const roomTypes = [
  { value: "LECTURE", label: "Phòng lý thuyết" },
  { value: "COMPUTER", label: "Phòng máy" },
  { value: "LAB", label: "Phòng thực hành" },
];
interface RoomsStore {
  list(
    query: Query,
  ): Promise<Pick<PageResponse<Room>, "content" | "totalElements">>;
  get(id: number): Promise<Room>;
  save(input: Input, id?: number): Promise<unknown>;
  status(id: number, status: RoomStatus): Promise<unknown>;
  remove(id: number): Promise<unknown>;
}
const pageSize = 10;
export function LiveRoomsPage() {
  const request = useLiveRequest();
  const store = useMemo<RoomsStore>(
    () => ({
      list(query) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
          if (value !== undefined && value !== "")
            params.set(key, String(value));
        }
        return request<PageResponse<Room>>(
          "roomsSearch",
          undefined,
          undefined,
          params,
        );
      },
      get: (id) => request("roomGet", id),
      save: (input, id) =>
        request(id === undefined ? "roomCreate" : "roomUpdate", id, input),
      status: (id, status) => request("roomStatus", id, { status }),
      remove: (id) => request("roomDelete", id),
    }),
    [request],
  );
  return <RoomsScreen store={store} />;
}
export default function RoomsPage() {
  const a = useAcademic();
  function find(id: number) {
    const r = a.rooms.find((r) => r.id === id && !r.deleted);
    if (!r) throw Error("Phòng đã bị xóa hoặc không tồn tại.");
    return r;
  }
  function guard(id: number, capacity?: number) {
    const r = find(id);
    const today = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date());
    const blocked = a.data.classes.filter(
      (c) =>
        c.status !== "CANCELLED" &&
        (a.termFor(c)?.endDate ?? "") >= today &&
        c.schedules.some((s) => s.roomCode === r.roomCode) &&
        (capacity === undefined || c.maxCapacity > capacity),
    );
    if (blocked.length)
      throw new ApiError(
        capacity === undefined
          ? "Phòng còn lịch sử dụng."
          : "Sức chứa phòng thấp hơn sức chứa lớp.",
        409,
        capacity === undefined ? 4330 : 4331,
        blocked.map((c) => ({
          field: "moduleClasses[" + c.id + "]",
          message:
            c.moduleClassCode +
            " · " +
            c.semesterCode +
            " · tối đa " +
            c.maxCapacity +
            " sinh viên",
        })),
      );
  }
  const store: RoomsStore = {
    async list(query) {
      const rows = searchRooms(a.rooms, query);
      const start = (query.page ?? 0) * pageSize;
      return {
        content: rows.slice(start, start + pageSize).map(demoRoom),
        totalElements: rows.length,
      };
    },
    async get(id) {
      return demoRoom(find(id));
    },
    async save(body, id) {
      const old = id === undefined ? undefined : find(id);
      const roomNumber = body.roomNumber ?? body.roomCode.split("-")[0];
      const others = a.rooms.filter((r) => r.id !== id);
      if (others.some((r) => r.roomCode.toUpperCase() === body.roomCode))
        throw new ApiError("Trùng mã phòng.", 409, 4327, [
          { field: "roomCode", message: "Mã phòng đã được sử dụng." },
        ]);
      if (
        others.some(
          (r) =>
            (r.campus ?? "").toUpperCase() === (body.campus ?? "") &&
            r.buildingCode.toUpperCase() === body.buildingCode &&
            r.roomNumber === roomNumber,
        )
      )
        throw new ApiError("Trùng vị trí phòng.", 409, 4328, [
          { field: "roomNumber", message: "Vị trí này đã có phòng." },
        ]);
      if (old && body.capacity < old.capacity) guard(old.id, body.capacity);
      const record = {
        ...old,
        ...body,
        campus: body.campus ?? "",
        roomNumber,
        id: id ?? Math.max(0, ...a.rooms.map((r) => r.id)) + 1,
        status: old?.status ?? "ACTIVE",
        roomType: old?.roomType ?? "LECTURE",
      };
      a.setRooms((rows) =>
        old ? rows.map((r) => (r.id === id ? record : r)) : [...rows, record],
      );
      if (old && old.roomCode !== body.roomCode)
        a.setData((data) => ({
          ...data,
          classes: data.classes.map((c) => ({
            ...c,
            schedules: c.schedules.map((s) =>
              s.roomCode === old.roomCode
                ? {
                    ...s,
                    roomCode: body.roomCode,
                    buildingCode: body.buildingCode,
                    roomNumber,
                  }
                : s,
            ),
          })),
        }));
    },
    async status(id, status) {
      const r = find(id);
      if (r.status === status) return;
      if (status === "INACTIVE") guard(id);
      a.setRooms((rows) =>
        rows.map((r) => (r.id === id ? { ...r, status } : r)),
      );
    },
    async remove(id) {
      guard(id);
      a.setRooms((rows) =>
        rows.map((r) => (r.id === id ? { ...r, deleted: true } : r)),
      );
    },
  };
  return <RoomsScreen store={store} />;
}
const fieldNames = {
  roomCode: "Mã phòng",
  roomName: "Tên phòng",
  campus: "Cơ sở",
  buildingCode: "Tòa nhà",
  roomNumber: "Số phòng",
  capacity: "Sức chứa",
} as const;
const keys = Object.keys(fieldNames) as (keyof typeof fieldNames)[];
const modes = {
  create: "Thêm phòng học",
  edit: "Cập nhật phòng",
  detail: "Chi tiết phòng",
  off: "Ngừng sử dụng",
  on: "Đưa vào sử dụng lại",
  delete: "Xóa mềm",
};
type Selection = { mode: keyof typeof modes; id?: number };
const statusText = (status: RoomStatus) =>
  status === "ACTIVE" ? "Đang sử dụng" : "Ngừng sử dụng";
function presentError(error: unknown): never {
  if (error instanceof ApiError) {
    if (error.code === 4330 || error.code === 4331) {
      const details = [
        error.message,
        ...error.errors.map((e) => e.message),
      ].join(" · ");
      if (error.code === 4331)
        throw new ApiError(details, 409, 4331, [
          { field: "capacity", message: details },
        ]);
      throw Error(details);
    }
    const field =
      error.code === 4327 || error.code === 4329
        ? "roomCode"
        : error.code === 4328
          ? "roomNumber"
          : undefined;
    if (field && !error.errors.length)
      throw new ApiError(error.message, error.status, error.code, [
        { field, message: error.message },
      ]);
  }
  throw error;
}
function RoomsScreen({ store }: { store: RoomsStore }) {
  const { notify } = useUI();
  const [query, setQuery] = useState<Query>({}),
    [page, setPage] = useState(0),
    [revision, refresh] = useState(0),
    [rows, setRows] = useState<Room[]>([]),
    [total, setTotal] = useState(0),
    [pending, setPending] = useState(true),
    [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");
  const [sel, select] = useState<Selection>(),
    [room, setRoom] = useState<Room>(),
    [detailError, setDetailError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let active = true;
    setPending(true);
    setError("");
    store
      .list({ ...query, page, size: pageSize })
      .then((result) => {
        if (active) {
          setRows(result.content);
          setTotal(result.totalElements);
          setPage(
            Math.min(
              page,
              Math.max(0, Math.ceil(result.totalElements / pageSize) - 1),
            ),
          );
          setPending(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setPending(false);
        }
      });
    return () => {
      active = false;
    };
  }, [store, query, page, revision]);
  useEffect(() => {
    if (!sel) return;
    dialog.current?.showModal();
    let active = true;
    if (sel.id !== undefined)
      store
        .get(sel.id)
        .then((r) => {
          if (active) {
            setRoom(r);
            setDetailError("");
          }
        })
        .catch((e) => {
          if (active) {
            setRoom(undefined);
            setDetailError(e.message);
          }
        });
    return () => {
      active = false;
    };
  }, [sel, store]);
  function open(mode: Selection["mode"], id?: number) {
    setRoom(undefined);
    setDetailError("");
    select({ mode, id });
  }
  const close = () => select(undefined);
  const fields: Field[] = keys.map((key) => ({
    key,
    label: fieldNames[key],
    required: ["roomCode", "roomName", "buildingCode", "capacity"].includes(
      key,
    ),
    value: room?.[key],
    type: key === "capacity" ? "number" : "text",
    ...(key === "capacity" ? { min: 1, max: 2147483647 } : {}),
    hint:
      key === "roomCode"
        ? "Ví dụ 102-TA1"
        : key === "roomNumber"
          ? "Để trống để lấy số phòng từ mã phòng."
          : undefined,
  }));
  const editing = sel?.mode === "create" || sel?.mode === "edit";
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Quản lý phòng học</h1>
          <p>Tra cứu phòng theo cơ sở, tòa nhà và sức chứa.</p>
        </div>
        <button className="btn primary" onClick={() => open("create")}>
          Thêm phòng học
        </button>
      </div>
      <section className="card student-workspace">
        <form
          noValidate
          className="admin-filter"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const text = (k: string) => String(f.get(k) ?? "").trim();
            const capacity = e.currentTarget.elements.namedItem(
              "minCapacity",
            ) as HTMLInputElement;
            const minimum =
              capacity.value === "" ? undefined : Number(capacity.value);
            if (
              capacity.validity.badInput ||
              (minimum !== undefined &&
                (!Number.isInteger(minimum) ||
                  minimum < 1 ||
                  minimum > 2147483647))
            ) {
              setFilterError(
                "Nhập sức chứa tối thiểu là số nguyên từ 1 đến 2147483647.",
              );
              capacity.focus();
              return;
            }
            setFilterError("");
            setQuery({
              keyword: text("keyword"),
              buildingCode: text("buildingCode").toUpperCase(),
              campus: text("campus").toUpperCase(),
              status: (text("status") as RoomStatus) || undefined,
              minCapacity: minimum,
            });
            setPage(0);
          }}
        >
          <label>
            Từ khóa
            <input
              name="keyword"
              placeholder="Mã, tên, cơ sở, tòa hoặc số phòng"
            />
          </label>
          <label>
            Cơ sở
            <input name="campus" />
          </label>
          <label>
            Tòa nhà
            <input name="buildingCode" />
          </label>
          <label>
            Sức chứa tối thiểu
            <input
              aria-invalid={!!filterError}
              aria-describedby={filterError ? "room-filter-error" : undefined}
              name="minCapacity"
              type="number"
              min="1"
              max="2147483647"
              step="1"
            />
            {filterError && (
              <span id="room-filter-error" className="field-error">
                {filterError}
              </span>
            )}
          </label>
          <label>
            Trạng thái
            <select name="status">
              <option value="">Tất cả</option>
              <option value="ACTIVE">Đang sử dụng</option>
              <option value="INACTIVE">Ngừng sử dụng</option>
            </select>
          </label>
          <button className="btn primary">Tìm kiếm</button>
          <button
            className="btn"
            type="reset"
            onClick={() => {
              setFilterError("");
              setQuery({});
              setPage(0);
            }}
          >
            Xóa bộ lọc
          </button>
        </form>
        <div className="table-scroll">
          <table className="management-table">
            <thead>
              <tr>
                {[...Object.values(fieldNames), "Trạng thái", "Thao tác"].map(
                  (h) => (
                    <th key={h}>{h}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {!pending &&
                !error &&
                rows.map((r) => (
                  <tr key={r.id}>
                    {keys.map((k) => (
                      <td key={k}>
                        {k === "roomCode" ? (
                          <button
                            className="text-link"
                            onClick={() => open("detail", r.id)}
                          >
                            {r.roomCode}
                          </button>
                        ) : (
                          r[k] || "—"
                        )}
                      </td>
                    ))}
                    <td><span className={"badge " + (r.status === "ACTIVE" ? "green" : "gray")}>{statusText(r.status)}</span></td>
                    <td>
                      <div className="management-actions">
                        <button
                          className="btn"
                          onClick={() => open("edit", r.id)}
                        >
                          Sửa
                        </button>
                        <button
                          className="btn"
                          onClick={() =>
                            open(r.status === "ACTIVE" ? "off" : "on", r.id)
                          }
                        >
                          {r.status === "ACTIVE" ? modes.off : modes.on}
                        </button>
                        <button
                          className="btn"
                          onClick={() => open("delete", r.id)}
                        >
                          Xóa mềm
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {pending ? (
          <p className="empty-state">Đang tải…</p>
        ) : error ? (
          <p className="empty-state" role="alert">
            {error}{" "}
            <button className="btn" onClick={() => refresh((v) => v + 1)}>
              Thử lại
            </button>
          </p>
        ) : (
          <>
            {!rows.length && (
              <p className="empty-state">Không tìm thấy phòng học phù hợp.</p>
            )}
            <Pager total={total} page={page} setPage={setPage} />
          </>
        )}
      </section>
      {sel && (
        <dialog
          ref={dialog}
          className="dialog record-dialog live-dialog"
          aria-label={modes[sel.mode]}
          onCancel={(e) => {
            if (dialog.current?.querySelector('form[aria-busy="true"]'))
              e.preventDefault();
            else close();
          }}
        >
          <h2>
            {modes[sel.mode]} {room?.roomCode}
          </h2>
          {sel.id !== undefined && !room ? (
            <>
              <p role="status">{detailError || "Đang tải thông tin phòng…"}</p>
              <button className="btn" onClick={close}>
                Đóng
              </button>
            </>
          ) : sel.mode === "detail" && room ? (
            <>
              <Detail
                items={[
                  ...keys.map(
                    (k) => [fieldNames[k], room[k]] as [string, unknown],
                  ),
                  ["Trạng thái", statusText(room.status)],
                ]}
              />
              <button className="btn" onClick={close}>
                Đóng
              </button>
            </>
          ) : (
            <EditForm
              key={sel.mode}
              fields={editing ? fields : []}
              close={close}
              submit={editing ? "Lưu thay đổi" : "Xác nhận"}
              validate={(f, e) => (editing ? validateRoom(roomInput(f), e) : e)}
              save={async (f) => {
                try {
                  if (editing) await store.save(roomInput(f), sel.id);
                  else if (sel.mode === "delete") await store.remove(sel.id!);
                  else
                    await store.status(
                      sel.id!,
                      sel.mode === "off" ? "INACTIVE" : "ACTIVE",
                    );
                  close();
                  refresh((v) => v + 1);
                  notify(
                    {
                      create: "Đã thêm phòng học.",
                      edit: "Đã cập nhật phòng học.",
                      delete: "Đã xóa mềm phòng học.",
                      off: "Đã ngừng sử dụng phòng học.",
                      on: "Đã đưa phòng học vào sử dụng lại.",
                      detail: "",
                    }[sel.mode],
                  );
                } catch (e) {
                  presentError(e);
                }
              }}
            >
              {!editing && (
                <p>
                  Bạn muốn {modes[sel.mode].toLowerCase()} phòng{" "}
                  {room?.roomCode}?
                </p>
              )}
            </EditForm>
          )}
        </dialog>
      )}
    </>
  );
}
