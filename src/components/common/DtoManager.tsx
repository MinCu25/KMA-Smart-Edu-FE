import {
  subjectRequest,
  prerequisiteRequest,
} from "../../services/api/requestBuilders";
import { useFormErrors } from "../../hooks/useFormErrors";
import { validateEmail, validatePhone } from "../../utils/profileValidation";
import { roomCatalog } from "../../data/mock/catalogs";
import { useState } from "react";
import { usePersistentState } from "../../hooks/usePersistentState";
import { useManagement } from "../../context/ManagementContext";
import { useUI } from "../../context/UIContext";
import {
  lecturerResponses,
  subjectResponses,
  moduleClassResponses,
  userResponses,
  semesterResponse,
} from "../../data/mock/dtoFixtures";
import type {
  CreateLecturerRequest,
  CreateSubjectRequest,
  UpdateSubjectRequest,
  CreateClassScheduleRequest,
  SetPrerequisiteRequest,
  LockUserRequest,
  ResetPasswordRequest,
  LecturerResponse,
  SubjectResponse,
  ModuleClassResponse,
  UserInfoResponse,
} from "../../types/dto";
import { ManagementHeading } from "./ManagementHeading";
import { Notice } from "./Notice";
type Kind = "teachers" | "subjects" | "classes" | "accounts";
type Model = {
  teachers: LecturerResponse[];
  subjects: SubjectResponse[];
  classes: ModuleClassResponse[];
  accounts: UserInfoResponse[];
};
type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: { id: number | string; name: string }[];
};
const titles = {
  teachers: "Giảng viên",
  subjects: "Học phần",
  classes: "Lớp học phần",
  accounts: "Tài khoản",
};
export default function DtoManager({ entity }: { entity: Kind }) {
  const { records, setRecords, log, semester } = useManagement();
  const { notify, notifyError } = useUI();
  const [data, setData] = usePersistentState<Model>("kma-dto-management-v3", {
    teachers: lecturerResponses,
    subjects: subjectResponses,
    classes: moduleClassResponses,
    accounts: userResponses,
  });
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [mode, setMode] = useState("");
  const [error, setErrorState] = useState("");
  const row = data[entity].find((x) => x.id === editing);
  const fields: Field[] =
    mode === "schedule"
      ? [
          {
            key: "roomId",
            label: "Phòng học",
            required: true,
            options: roomCatalog.map((r) => ({ id: r.id, name: r.roomCode })),
          },
          {
            key: "dayOfWeek",
            label: "Ngày học",
            required: true,
            options: Array.from({ length: 7 }, (_, i) => ({
              id: i + 2,
              name: i === 6 ? "Chủ nhật" : `Thứ ${i + 2}`,
            })),
          },
          {
            key: "lessonOrderStart",
            label: "Tiết bắt đầu",
            type: "number",
            required: true,
            min: 1,
          },
          {
            key: "lessonOrderEnd",
            label: "Tiết kết thúc",
            type: "number",
            required: true,
            min: 1,
          },
          { key: "startDate", label: "Từ ngày", type: "date" },
          { key: "endDate", label: "Đến ngày", type: "date" },
        ]
      : mode === "prerequisite"
        ? [
            {
              key: "prerequisiteSubjectIds",
              label: "Học phần tiên quyết (bỏ chọn tất cả để gỡ hết)",
              options: data.subjects
                .filter((x) => x.id !== editing)
                .map((x) => ({ id: x.id, name: x.subjectName })),
            },
          ]
        : mode === "lock" || mode === "reset"
          ? [{ key: "reason", label: "Lý do", required: mode === "lock" }]
          : entity === "teachers"
            ? [
                { key: "fullName", label: "Họ và tên", required: true },
                { key: "dateOfBirth", label: "Ngày sinh", type: "date" },
                { key: "email", label: "Email", type: "email" },
                { key: "phone", label: "Điện thoại" },
                { key: "citizenId", label: "CCCD" },
                {
                  key: "facultyId",
                  label: "Khoa",
                  required: true,
                  options: [
                    { id: 1, name: "Công nghệ thông tin" },
                    { id: 2, name: "An toàn thông tin" },
                    { id: 3, name: "Điện tử viễn thông" },
                  ],
                },
                { key: "reason", label: "Lý do thêm" },
              ]
            : entity === "subjects"
              ? [
                  ...(!row
                    ? [
                        {
                          key: "subjectCode",
                          label: "Mã học phần",
                          required: true,
                        },
                      ]
                    : []),
                  { key: "subjectName", label: "Tên học phần", required: true },
                  {
                    key: "credits",
                    label: "Tín chỉ",
                    type: "number",
                    required: true,
                    min: 1,
                    max: 5,
                  },
                  { key: "description", label: "Mô tả" },
                ]
              : [
                  {
                    key: "subjectId",
                    label: "Học phần",
                    required: true,
                    options: data.subjects.map((x) => ({
                      id: x.id,
                      name: x.subjectName,
                    })),
                  },
                  {
                    key: "semesterId",
                    label: "Học kỳ",
                    required: true,
                    options: [
                      {
                        id: semesterResponse.id,
                        name: semesterResponse.semesterName,
                      },
                    ],
                  },
                  {
                    key: "lecturerId",
                    label: "Giảng viên",
                    required: true,
                    options: data.teachers.map((x) => ({
                      id: x.id,
                      name: x.fullName,
                    })),
                  },
                  {
                    key: "moduleClassCode",
                    label: "Mã lớp học phần",
                    required: true,
                  },
                  {
                    key: "maxCapacity",
                    label: "Sĩ số tối đa",
                    required: true,
                    type: "number",
                    min: 1,
                  },
                ];
  const form = useFormErrors((f) => {
    const errors: Record<string, string[]> = {};
    for (const field of fields) {
      const value = String(f.get(field.key) ?? "").trim();
      const messages: string[] = [];
      if (field.required && !value)
        messages.push(`Vui lòng nhập ${field.label.toLowerCase()}.`);
      if (value && field.type === "number") {
        const number = Number(value);
        if (!Number.isInteger(number))
          messages.push("Vui lòng nhập số nguyên hợp lệ.");
        else if (
          (field.min != null && number < field.min) ||
          (field.max != null && number > field.max)
        )
          messages.push(
            field.max != null
              ? `Giá trị phải từ ${field.min} đến ${field.max}.`
              : `Giá trị phải từ ${field.min} trở lên.`,
          );
      }
      if (value && field.key === "email" && validateEmail(value))
        messages.push(validateEmail(value));
      if (value && field.key === "phone" && validatePhone(value))
        messages.push(validatePhone(value));
      errors[field.key] = messages;
    }
    if (mode === "schedule") {
      if (Number(f.get("lessonOrderEnd")) < Number(f.get("lessonOrderStart")))
        errors.lessonOrderEnd = [
          "Tiết kết thúc phải sau hoặc bằng tiết bắt đầu.",
        ];
      if (
        f.get("startDate") &&
        f.get("endDate") &&
        String(f.get("startDate")) > String(f.get("endDate"))
      )
        errors.endDate = ["Ngày kết thúc không được trước ngày bắt đầu."];
    }
    return errors;
  });
  function setError(message: string) {
    setErrorState(message);
    form.setFormError(message);
  }
  function open(next: string, id: number | null = null) {
    form.reset();
    setEditing(id);
    setMode(next);
    setError("");
  }
  function save(f: FormData) {
    const s = (k: string) => String(f.get(k) ?? "").trim();
    const n = (k: string) => Number(s(k));
    const next: Model = structuredClone(data);
    const id = editing ?? Math.max(0, ...data[entity].map((x) => x.id)) + 1;
    let request: unknown;
    try {
      if (entity === "classes" && semester.isLocked)
        throw Error("Thông tin kỳ học đã khóa.");
      if (mode === "lock") {
        const p: LockUserRequest = { userId: id, reason: s("reason") };
        if (!p.reason) throw Error("Cần nhập lý do khóa.");
        if (id === 1)
          throw Error("Không thể khóa tài khoản quản trị đang dùng.");
        next.accounts = next.accounts.map((x) =>
          x.id === id ? { ...x, status: "LOCKED" } : x,
        );
        request = p;
      } else if (mode === "reset") {
        const p: ResetPasswordRequest = { userId: id, reason: s("reason") };
        request = p;
        notify(
          "Đã mô phỏng yêu cầu đặt lại mật khẩu. Chưa có API để cấp mật khẩu thật.",
          "info",
        );
      } else if (mode === "prerequisite") {
        const p = prerequisiteRequest(
          f.getAll("prerequisiteSubjectIds").map(Number),
        );
        const reaches = (
          from: number,
          target: number,
          seen = new Set<number>(),
        ): boolean =>
          from === target ||
          (!seen.has(from) &&
            (seen.add(from),
            data.subjects
              .find((x) => x.id === from)
              ?.prerequisites.some((x) => reaches(x.id, target, seen)) ??
              false));
        if (p.prerequisiteSubjectIds.some((x) => reaches(x, id)))
          throw Error("Không được tạo chu trình tiên quyết.");
        next.subjects = next.subjects.map((x) =>
          x.id === id
            ? {
                ...x,
                prerequisites: p.prerequisiteSubjectIds.map((key) => {
                  const t = data.subjects.find((x) => x.id === key)!;
                  return {
                    id: t.id,
                    subjectCode: t.subjectCode,
                    subjectName: t.subjectName,
                    credits: t.credits,
                  };
                }),
              }
            : x,
        );
        next.subjects = next.subjects.map((x) => ({
          ...x,
          requiredBy: next.subjects
            .filter((t) => t.prerequisites.some((p) => p.id === x.id))
            .map((t) => ({
              id: t.id,
              subjectCode: t.subjectCode,
              subjectName: t.subjectName,
              credits: t.credits,
            })),
        }));
        request = p;
      } else if (mode === "schedule") {
        const p: CreateClassScheduleRequest = {
          moduleClassId: id,
          roomId: n("roomId"),
          dayOfWeek: n("dayOfWeek"),
          lessonOrderStart: n("lessonOrderStart"),
          lessonOrderEnd: n("lessonOrderEnd"),
          startDate: s("startDate") || undefined,
          endDate: s("endDate") || undefined,
        };
        if (p.lessonOrderEnd < p.lessonOrderStart)
          throw Error("Tiết kết thúc phải sau hoặc bằng tiết bắt đầu.");
        if (p.startDate && p.endDate && p.startDate > p.endDate)
          throw Error("Khoảng ngày không hợp lệ.");
        const room = roomCatalog.find((r) => r.id === p.roomId);
        if (!room) throw Error("Không tìm thấy phòng học.");
        const current = next.classes.find((x) => x.id === id)!;
        const clashes = next.classes.flatMap((c) =>
          c.schedules
            .filter(
              (t) =>
                t.dayOfWeek === p.dayOfWeek &&
                t.lessonOrderStart! <= p.lessonOrderEnd &&
                t.lessonOrderEnd! >= p.lessonOrderStart &&
                (!p.startDate || !t.endDate || p.startDate <= t.endDate) &&
                (!p.endDate || !t.startDate || p.endDate >= t.startDate) &&
                (t.roomCode === room.roomCode ||
                  c.lecturerName === current.lecturerName),
            )
            .map(
              (t) =>
                `${c.moduleClassCode} (${c.subjectName}): ${t.dayOfWeek === 8 ? "Chủ nhật" : `Thứ ${t.dayOfWeek}`}, tiết ${t.lessonOrderStart}–${t.lessonOrderEnd}, phòng ${t.roomCode}, giảng viên ${c.lecturerName}, từ ${t.startDate ?? "chưa xác định"} đến ${t.endDate ?? "chưa xác định"}`,
            ),
        );
        if (clashes.length)
          throw Error(
            `Không thể xếp lịch: trùng phòng hoặc giảng viên với ${clashes.join("; ")}. Lịch bạn nhập: tiết ${p.lessonOrderStart}–${p.lessonOrderEnd}, phòng ${room.roomCode}.`,
          );
        current.schedules.push({
          id: Date.now(),
          moduleClassId: id,
          roomCode: room.roomCode,
          buildingCode: room.buildingCode,
          roomNumber: room.roomNumber,
          dayOfWeek: p.dayOfWeek,
          lessonOrderStart: p.lessonOrderStart,
          lessonOrderEnd: p.lessonOrderEnd,
          startDate: p.startDate ?? null,
          endDate: p.endDate ?? null,
        });
        if (current.status === "UNSCHEDULED") current.status = "SCHEDULED";
        request = p;
      } else if (entity === "teachers") {
        const p: CreateLecturerRequest = {
          fullName: s("fullName"),
          dateOfBirth: s("dateOfBirth") || undefined,
          email: s("email"),
          phone: s("phone"),
          citizenId: s("citizenId"),
          facultyId: n("facultyId"),
          reason: s("reason"),
        };
        next.teachers.push({
          id,
          lecturerCode: `GV${String(id).padStart(3, "0")}`,
          fullName: p.fullName,
          email: p.email ?? "",
          phone: p.phone ?? "",
          facultyName: fields
            .find((x) => x.key === "facultyId")!
            .options!.find((x) => x.id === p.facultyId)!.name,
          status: "ACTIVE",
        });
        request = p;
      } else if (entity === "subjects") {
        if (row) {
          const p = subjectRequest(f, true) as UpdateSubjectRequest;
          next.subjects = next.subjects.map((x) =>
            x.id === id
              ? {
                  ...x,
                  subjectName: p.subjectName!,
                  credits: p.credits!,
                  description: p.description ?? null,
                }
              : x,
          );
          request = p;
        } else {
          const p = subjectRequest(f, false) as CreateSubjectRequest;
          if (data.subjects.some((x) => x.subjectCode === p.subjectCode))
            throw Error("Mã học phần đã tồn tại.");
          next.subjects.push({
            id,
            subjectCode: p.subjectCode,
            subjectName: p.subjectName,
            description: p.description ?? null,
            credits: p.credits,
            status: "ACTIVE",
            prerequisites: [],
            requiredBy: [],
          });
          request = p;
        }
      } else {
        const p = {
          subjectId: n("subjectId"),
          semesterId: n("semesterId"),
          lecturerId: n("lecturerId"),
          moduleClassCode: s("moduleClassCode"),
          maxCapacity: n("maxCapacity"),
        };
        if (data.classes.some((x) => x.moduleClassCode === p.moduleClassCode))
          throw Error("Mã lớp đã tồn tại.");
        const subject = data.subjects.find((x) => x.id === p.subjectId)!;
        const teacher = data.teachers.find((x) => x.id === p.lecturerId)!;
        next.classes.push({
          id,
          moduleClassCode: p.moduleClassCode,
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          credits: subject.credits,
          lecturerName: teacher.fullName,
          semesterCode: semesterResponse.semesterCode,
          maxCapacity: p.maxCapacity,
          currentSize: 0,
          status: "UNSCHEDULED",
          schedules: [],
        });
        request = p;
      }
      setData(next);
      // Legacy display models stay local; never serialize them as request payloads.
      setRecords((old) => ({
        ...old,
        teachers: next.teachers.map((x) => ({
          id: x.lecturerCode,
          name: x.fullName,
          email: x.email,
          department: x.facultyName,
          status: x.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng hoạt động",
        })),
        subjects: next.subjects.map((x) => ({
          id: x.subjectCode,
          name: x.subjectName,
          credits: String(x.credits),
          prerequisite:
            x.prerequisites.map((p) => p.subjectName).join(", ") || "Không",
          status: x.status === "ACTIVE" ? "Đang sử dụng" : "Ngừng sử dụng",
        })),
        classes: next.classes.map((x) => ({
          id: x.moduleClassCode,
          subject: x.subjectCode,
          teacher:
            next.teachers.find((t) => t.fullName === x.lecturerName)
              ?.lecturerCode ?? "",
          room: x.schedules[0]?.roomCode ?? "",
          day: `Thứ ${x.schedules[0]?.dayOfWeek ?? 2}`,
          start: String(x.schedules[0]?.lessonOrderStart ?? 0),
          end: String(x.schedules[0]?.lessonOrderEnd ?? 0),
          capacity: String(x.maxCapacity),
          status: x.status === "OPEN" ? "Đang mở" : "Tạm đóng",
        })),
      }));
      log("Hoạt động", titles[entity], `${mode} · ID ${id}`);
      setMode("");
      if (mode !== "reset") notify("Đã lưu dữ liệu.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu.");
    }
  }
  const rows = data[entity].filter((x) =>
    JSON.stringify(x).toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  function text(x: Model[Kind][number], key: string) {
    const v = (x as unknown as Record<string, unknown>)[key];
    const labels: Record<string, string> = {
      OPEN: "Mở đăng ký",
      UNSCHEDULED: "Chưa xếp lịch",
      SCHEDULED: "Đã xếp lịch",
      CANCELLED: "Đã hủy",
      ACTIVE: "Đang hoạt động",
      INACTIVE: "Ngừng hoạt động",
      LOCKED: "Đã khóa",
      SYSTEM_ADMIN: "Admin hệ thống",
      ACADEMIC_ADMIN: "Admin học vụ",
      LECTURER: "Giảng viên",
      STUDENT: "Sinh viên",
    };
    return v == null ? "—" : (labels[String(v)] ?? String(v));
  }
  const columns =
    entity === "teachers"
      ? ["lecturerCode", "fullName", "email", "phone", "facultyName", "status"]
      : entity === "subjects"
        ? ["subjectCode", "subjectName", "credits", "status"]
        : entity === "classes"
          ? [
              "moduleClassCode",
              "subjectName",
              "lecturerName",
              "semesterCode",
              "currentSize",
              "maxCapacity",
              "status",
            ]
          : ["username", "fullName", "role", "status"];
  const labels: Record<string, string> = {
    lecturerCode: "Mã GV",
    fullName: "Họ tên",
    email: "Email",
    phone: "Điện thoại",
    facultyName: "Khoa",
    status: "Trạng thái",
    subjectCode: "Mã HP",
    subjectName: "Học phần",
    credits: "TC",
    moduleClassCode: "Mã lớp",
    lecturerName: "Giảng viên",
    semesterCode: "Kỳ",
    currentSize: "Sĩ số",
    maxCapacity: "Tối đa",
    username: "Tên đăng nhập",
    role: "Vai trò",
  };
  return (
    <>
      <ManagementHeading title={titles[entity]} description="">
        {entity !== "accounts" && (
          <button className="btn primary" onClick={() => open("create")}>
            Thêm {titles[entity].toLowerCase()}
          </button>
        )}
      </ManagementHeading>
      <section className="card">
        <div className="management-toolbar">
          <label>
            Tìm kiếm
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập mã hoặc tên…"
            />
          </label>
          <span>{rows.length} bản ghi</span>
        </div>
        <div className="table-scroll">
          <table className="management-table">
            <thead>
              <tr>
                {columns.map((k) => (
                  <th key={k}>{labels[k]}</th>
                ))}
                <th>Chi tiết</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id}>
                  {columns.map((k) => (
                    <td key={k}>{text(x, k)}</td>
                  ))}
                  <td>
                    {"schedules" in x
                      ? x.schedules.map((t) => (
                          <div key={t.id}>
                            {t.dayOfWeek === 8 ? "CN" : `T${t.dayOfWeek}`} ·
                            tiết {t.lessonOrderStart}–{t.lessonOrderEnd} ·{" "}
                            {t.roomCode}
                          </div>
                        ))
                      : "prerequisites" in x
                        ? x.prerequisites
                            .map((p) => p.subjectCode)
                            .join(", ") || "Không"
                        : text(x, "firstLogin") === "true"
                          ? "Cần đổi mật khẩu"
                          : "—"}
                  </td>
                  <td>
                    <div className="management-actions">
                      {entity === "subjects" && (
                        <>
                          <button
                            className="btn"
                            onClick={() => open("edit", x.id)}
                          >
                            Sửa
                          </button>
                          <button
                            className="btn"
                            onClick={() => open("prerequisite", x.id)}
                          >
                            Tiên quyết
                          </button>
                        </>
                      )}
                      {entity === "classes" && (
                        <button
                          className="btn"
                          onClick={() => open("schedule", x.id)}
                        >
                          Thêm lịch
                        </button>
                      )}
                      {entity === "accounts" && (
                        <>
                          <button
                            className="btn"
                            disabled={
                              x.id === 1 || text(x, "status") === "Đã khóa"
                            }
                            onClick={() => open("lock", x.id)}
                          >
                            Khóa
                          </button>
                          <button
                            className="btn"
                            onClick={() => open("reset", x.id)}
                          >
                            Đặt lại mật khẩu
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {mode && (
        <div className="dialog-backdrop">
          <section
            className="dialog record-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={titles[entity]}
          >
            <h2>
              {mode === "schedule"
                ? "Thêm lịch học"
                : mode === "prerequisite"
                  ? "Thiết lập tiên quyết"
                  : mode === "lock"
                    ? "Khóa tài khoản"
                    : mode === "reset"
                      ? "Đặt lại mật khẩu"
                      : row
                        ? "Cập nhật"
                        : "Thêm mới"}{" "}
              · {titles[entity]}
            </h2>
            <form
              noValidate
              onChange={form.onChange}
              onSubmit={(e) => {
                e.preventDefault();
                if (form.check(e.currentTarget))
                  save(new FormData(e.currentTarget));
              }}
            >
              <div className="record-fields">
                {fields.map((f) => (
                  <label key={f.key}>
                    {f.label}
                    {f.options ? (
                      <select
                        {...form.props(f.key)}
                        name={f.key}
                        required={f.required}
                        multiple={f.key === "prerequisiteSubjectIds"}
                        defaultValue={
                          f.key === "prerequisiteSubjectIds" &&
                          row &&
                          "prerequisites" in row
                            ? row.prerequisites.map((x) => String(x.id))
                            : row
                              ? String(
                                  (row as unknown as Record<string, unknown>)[
                                    f.key
                                  ] ?? "",
                                )
                              : undefined
                        }
                      >
                        {f.options.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        {...form.props(f.key)}
                        name={f.key}
                        type={f.type ?? "text"}
                        required={f.required}
                        min={f.min}
                        max={f.max}
                        defaultValue={
                          row && mode === "edit"
                            ? text(row, f.key) === "—"
                              ? ""
                              : text(row, f.key)
                            : ""
                        }
                      />
                    )}
                    {!!form.errors[f.key]?.length && (
                      <div id={`${f.key}-error`} className="field-error">
                        {form.errors[f.key].map((message) => (
                          <div key={message}>{message}</div>
                        ))}
                      </div>
                    )}
                  </label>
                ))}
              </div>
              {form.formError && (
                <p className="field-error" role="alert">
                  {form.formError}
                </p>
              )}
              <div className="dialog-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setMode("")}
                >
                  Hủy
                </button>
                <button className="btn primary">Lưu</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
