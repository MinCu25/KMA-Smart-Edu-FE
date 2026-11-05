import type { ModuleClassResponse } from "../../types/dto";
import type {
  CreateRoomRequest,
  RoomResponse,
  RoomSearchRequest,
} from "../api/backendContract";
import type { RoomRecord } from "../../context/AcademicContext";
import type { FieldErrors } from "../../hooks/useFormErrors";

export function roomInput(form: FormData): CreateRoomRequest {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const number = text("roomNumber");
  return {
    roomCode: text("roomCode").toUpperCase(),
    roomName: text("roomName"),
    campus: text("campus").toUpperCase(),
    buildingCode: text("buildingCode").toUpperCase(),
    ...(number ? { roomNumber: number } : {}),
    capacity: Number(text("capacity")),
  };
}
export function validateRoom(room: CreateRoomRequest, errors: FieldErrors) {
  const match = /^(\d+)-([A-Z0-9]+)$/.exec(room.roomCode);
  if (!match || room.roomCode.length > 50)
    errors.roomCode = ["Nhập mã dạng 102-TA1, tối đa 50 ký tự."];
  if (!room.roomName || room.roomName.length > 255)
    errors.roomName = ["Nhập tên phòng từ 1 đến 255 ký tự."];
  if ((room.campus?.length ?? 0) > 100)
    errors.campus = ["Cơ sở tối đa 100 ký tự."];
  if (
    !room.buildingCode ||
    room.buildingCode.length > 50 ||
    (match && match[2] !== room.buildingCode)
  )
    errors.buildingCode = [
      "Tòa nhà phải khớp phần sau dấu gạch ngang trong mã phòng.",
    ];
  if (
    room.roomNumber &&
    (room.roomNumber.length > 50 || (match && match[1] !== room.roomNumber))
  )
    errors.roomNumber = ["Số phòng phải khớp phần đầu mã phòng."];
  if (
    !Number.isInteger(room.capacity) ||
    room.capacity < 1 ||
    room.capacity > 2147483647
  )
    errors.capacity = ["Sức chứa phải là số nguyên từ 1 đến 2147483647."];
  return errors;
}
export function searchRooms(rows: RoomRecord[], query: RoomSearchRequest) {
  const needle = query.keyword?.trim().toLowerCase() ?? "";
  return rows
    .filter(
      (r) =>
        !r.deleted &&
        [
          r.roomCode,
          r.roomName,
          r.campus ?? "",
          r.buildingCode,
          r.roomNumber,
        ].some((v) => v.toLowerCase().includes(needle)) &&
        (!query.status || r.status === query.status) &&
        (!query.campus ||
          (r.campus ?? "").toUpperCase() === query.campus.toUpperCase()) &&
        (!query.buildingCode ||
          r.buildingCode.toUpperCase() === query.buildingCode.toUpperCase()) &&
        r.capacity >= (query.minCapacity ?? 1),
    )
    .sort(
      (a, b) =>
        (a.campus ?? "").localeCompare(b.campus ?? "") ||
        a.buildingCode.localeCompare(b.buildingCode) ||
        a.roomNumber.localeCompare(b.roomNumber) ||
        a.id - b.id,
    );
}
export function demoRoom(r: RoomRecord): RoomResponse {
  const { id, roomCode, roomName, buildingCode, roomNumber, capacity, status } =
    r;
  return {
    id,
    roomCode,
    roomName,
    campus: r.campus ?? "",
    buildingCode,
    roomNumber,
    capacity,
    status,
  };
}

// Old demo schedules identify a room by its code. Only convert unambiguous
// legacy codes so an existing booking never moves to a different room.
export function legacyRoomCodes(rooms: RoomRecord[]) {
  const changes = new Map<string, string>();
  const taken = new Set(rooms.map((r) => r.roomCode.toUpperCase()));
  for (const room of rooms) {
    const building = room.buildingCode.trim().toUpperCase();
    const number = room.roomNumber.trim();
    const code = number + "-" + building;
    if (
      /^[0-9]+-[A-Z0-9]+$/.test(code) &&
      room.roomCode.toUpperCase() === building + number &&
      !taken.has(code)
    ) {
      changes.set(room.roomCode, code);
      taken.add(code);
    }
  }
  return changes;
}

// Older demo versions seeded schedules with more rooms than the room directory.
// Recover only the legacy building+number format using the saved schedule.
export function reconcileScheduledRooms(
  rooms: RoomRecord[],
  classes: ModuleClassResponse[],
) {
  const codes = legacyRoomCodes(rooms);
  const existing = new Map(rooms.map((room) => [room.roomCode, room]));
  const added = new Map<string, RoomRecord>();
  let nextId = Math.max(0, ...rooms.map((room) => room.id)) + 1;
  for (const item of classes) {
    for (const slot of item.schedules) {
      const { roomCode, buildingCode, roomNumber } = slot;
      const canonical = roomNumber + "-" + buildingCode;
      if (
        existing.has(roomCode) ||
        roomCode !== buildingCode + roomNumber ||
        !/^[0-9]+-[A-Z0-9]+$/.test(canonical)
      )
        continue;
      const known = existing.get(canonical);
      if (
        known &&
        (known.buildingCode !== buildingCode || known.roomNumber !== roomNumber)
      )
        continue;
      codes.set(roomCode, canonical);
      if (known) continue;
      const recovered = added.get(canonical);
      if (recovered)
        recovered.capacity = Math.max(recovered.capacity, item.maxCapacity);
      else
        added.set(canonical, {
          id: nextId++,
          roomCode: canonical,
          roomName: "Phòng " + canonical,
          buildingCode,
          roomNumber,
          campus: "",
          status: "ACTIVE",
          capacity: Math.max(1, item.maxCapacity),
          roomType: "LECTURE",
        });
    }
  }
  if (!codes.size) return;
  return {
    rooms: rooms
      .map((room) =>
        codes.has(room.roomCode)
          ? { ...room, roomCode: codes.get(room.roomCode)! }
          : room,
      )
      .concat([...added.values()]),
    classes: classes.map((item) => ({
      ...item,
      schedules: item.schedules.map((slot) =>
        codes.has(slot.roomCode)
          ? { ...slot, roomCode: codes.get(slot.roomCode)! }
          : slot,
      ),
    })),
  };
}
