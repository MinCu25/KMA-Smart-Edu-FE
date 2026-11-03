import { useState } from "react";
import { useAcademic, type RoomRecord } from "../../context/AcademicContext";
import { useManagement } from "../../context/ManagementContext";
import { useUI } from "../../context/UIContext";
import {
  EditForm,
  Pager,
  str,
  type Field,
} from "../../components/academic-admin/AcademicUI";
export const roomTypes = [
  { value: "LECTURE", label: "Phòng lý thuyết" },
  { value: "COMPUTER", label: "Phòng máy" },
  { value: "LAB", label: "Phòng thực hành" },
];
export default function RoomsPage() {
  const a = useAcademic(),
    { log } = useManagement(),
    { setDialog, notify } = useUI();
  const [q, setQ] = useState(""),
    [building, setBuilding] = useState(""),
    [type, setType] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(0);
  const close = () => setDialog(null);
  const linked = (r: RoomRecord) =>
    a.data.classes.filter(
      (c) =>
        c.status !== "CANCELLED" &&
        a.termFor(c)?.endDate! >= new Date().toISOString().slice(0, 10) &&
        c.schedules.some((s) => s.roomCode === r.roomCode),
    );
  const rows = a.rooms.filter(
    (r) =>
      !r.deleted &&
      (r.roomCode + " " + r.roomName).toLowerCase().includes(q.toLowerCase()) &&
      (!building || r.buildingCode === building) &&
      (!type || r.roomType === type) &&
      (!status || r.status === status),
  );
  function edit(r?: RoomRecord) {
    const fields: Field[] = [
      {
        key: "roomCode",
        label: "Mã phòng",
        required: true,
        value: r?.roomCode,
        readOnly: !!r,
      },
      {
        key: "roomName",
        label: "Tên phòng",
        required: true,
        value: r?.roomName,
      },
      {
        key: "buildingCode",
        label: "Tòa nhà / cơ sở",
        required: true,
        value: r?.buildingCode,
      },
      {
        key: "roomNumber",
        label: "Số phòng",
        required: true,
        value: r?.roomNumber,
      },
      {
        key: "roomType",
        label: "Loại phòng",
        required: true,
        options: roomTypes,
        value: r?.roomType,
      },
      {
        key: "capacity",
        label: "Sức chứa",
        required: true,
        type: "number",
        min: 1,
        value: r?.capacity,
      },
    ];
    setDialog({
      title: r ? `Cập nhật phòng ${r.roomCode}` : "Thêm phòng học",
      content: (
        <EditForm
          fields={fields}
          close={close}
          validate={(f, e) => {
            if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(str(f, "roomCode")))
              e.roomCode = [
                "Mã phòng chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.",
              ];
            if (
              a.rooms.some(
                (x) =>
                  x.id !== r?.id &&
                  x.roomCode.toLowerCase() === str(f, "roomCode").toLowerCase(),
              )
            )
              e.roomCode = ["Mã phòng đã tồn tại."];
            if (r) {
              const affected = linked(r).filter(
                (c) => c.maxCapacity > +str(f, "capacity"),
              );
              if (affected.length)
                e.capacity = [
                  `Không đủ sức chứa cho: ${affected.map((c) => `${c.moduleClassCode} (${c.maxCapacity} chỗ)`).join(", ")}.`,
                ];
              if (linked(r).length && str(f, "roomType") !== r.roomType)
                e.roomType = [
                  "Phòng đang có lịch học. Hãy chuyển lịch trước khi đổi loại phòng.",
                ];
            }
            return e;
          }}
          save={(f) => {
            const record: RoomRecord = {
              id: r?.id ?? Math.max(0, ...a.rooms.map((x) => x.id)) + 1,
              roomCode: str(f, "roomCode"),
              roomName: str(f, "roomName"),
              buildingCode: str(f, "buildingCode"),
              roomNumber: str(f, "roomNumber"),
              roomType: str(f, "roomType"),
              capacity: +str(f, "capacity"),
              status: r?.status ?? "ACTIVE",
            };
            a.setRooms((old) =>
              r
                ? old.map((x) => (x.id === r.id ? record : x))
                : [...old, record],
            );
            log(
              "Admin học vụ",
              r ? "Cập nhật phòng" : "Thêm phòng",
              record.roomCode,
            );
            close();
            notify(
              `Đã ${r ? "cập nhật" : "thêm"} phòng học ${record.roomCode}.`,
            );
          }}
        />
      ),
    });
  }
  function action(r: RoomRecord, remove: boolean) {
    const related = linked(r);
    setDialog({
      title: `${remove ? "Xóa mềm" : "Ngừng sử dụng"} phòng ${r.roomCode}`,
      content: (
        <EditForm
          fields={[{ key: "reason", label: "Lý do", required: true }]}
          close={close}
          submit="Xác nhận"
          validate={(f, e) => {
            if (related.length)
              e.reason = [
                `Phòng còn được sử dụng bởi ${related.map((c) => c.moduleClassCode).join(", ")}. Hãy chuyển lịch các lớp này trước.`,
              ];
            return e;
          }}
          save={(f) => {
            a.setRooms((old) =>
              old.map((x) =>
                x.id === r.id
                  ? { ...x, status: "INACTIVE", deleted: remove }
                  : x,
              ),
            );
            log(
              "Admin học vụ",
              remove ? "Xóa mềm phòng" : "Ngừng sử dụng phòng",
              `${r.roomCode} · ${str(f, "reason")}`,
            );
            close();
            notify(
              `Đã ${remove ? "xóa mềm" : "ngừng sử dụng"} phòng ${r.roomCode}.`,
            );
          }}
        />
      ),
    });
  }
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Quản lý phòng học</h1>
          <p>Danh mục phòng dùng chung cho xếp lịch và kiểm tra sức chứa.</p>
        </div>
        <button className="btn primary" onClick={() => edit()}>
          Thêm phòng học
        </button>
      </div>
      <section className="card">
        <div className="admin-filter">
          <label>
            Mã / tên phòng
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label>
            Tòa nhà
            <select
              value={building}
              onChange={(e) => {
                setBuilding(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Tất cả</option>
              {[...new Set(a.rooms.map((r) => r.buildingCode))].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <label>
            Loại phòng
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Tất cả</option>
              {roomTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trạng thái
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Tất cả</option>
              <option value="ACTIVE">Đang sử dụng</option>
              <option value="INACTIVE">Ngừng sử dụng</option>
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table className="management-table">
            <thead>
              <tr>
                {[
                  "Mã phòng",
                  "Tên phòng",
                  "Tòa nhà",
                  "Loại phòng",
                  "Sức chứa",
                  "Trạng thái",
                  "Thao tác",
                ].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * 10, page * 10 + 10).map((r) => (
                <tr key={r.id}>
                  <td>{r.roomCode}</td>
                  <td>{r.roomName}</td>
                  <td>{r.buildingCode}</td>
                  <td>
                    {roomTypes.find((t) => t.value === r.roomType)?.label}
                  </td>
                  <td>{r.capacity}</td>
                  <td>
                    {r.status === "ACTIVE" ? "Đang sử dụng" : "Ngừng sử dụng"}
                  </td>
                  <td>
                    <div className="management-actions">
                      <button className="btn" onClick={() => edit(r)}>
                        Sửa
                      </button>
                      {r.status === "ACTIVE" && (
                        <button
                          className="btn"
                          onClick={() => action(r, false)}
                        >
                          Ngừng sử dụng
                        </button>
                      )}
                      <button className="btn" onClick={() => action(r, true)}>
                        Xóa mềm
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="empty-state">Không tìm thấy phòng học phù hợp.</p>
          )}
        </div>
        <Pager total={rows.length} page={page} setPage={setPage} />
      </section>
    </>
  );
}
