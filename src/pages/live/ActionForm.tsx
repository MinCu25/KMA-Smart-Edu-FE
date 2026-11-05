import {
  EditForm,
  type Field,
} from "../../components/academic-admin/AcademicUI";
import { PrerequisiteChoices } from "../academic-admin/SubjectsPage";
import type { SubjectResponse } from "../../services/api/backendContract";
import { useEffect, useState } from "react";
import { useUI } from "../../context/UIContext";
import { ApiError } from "../../services/api/httpClient";
import { semesterWireName } from "../../services/api/eduApi";
import { semesterFormName } from "../../utils/semesterValidation";
import { names, labels, type Action, type Row } from "./catalog";
import { readAllPages, useLiveRequest } from "./client";
export const message = (e: unknown) =>
  e instanceof Error ? e.message : "Yêu cầu thất bại.";
export function errorMap(e: unknown) {
  const fields: Record<string, string> = {};
  if (e instanceof ApiError)
    for (const item of e.errors)
      fields[item.field] = [fields[item.field], item.message]
        .filter(Boolean)
        .join(" ");
  return fields;
}
export function show(key: string, v: unknown): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v))
    return (
      v
        .map((x) =>
          typeof x === "object"
            ? (x.subjectName ?? Object.values(x).join(" · "))
            : x,
        )
        .join(", ") || "—"
    );
  if (typeof v === "boolean") return v ? "Có" : "Không";
  if (key === "semesterName") return semesterFormName(String(v));
  return labels[String(v)] ?? String(v);
}
const toggle = ["confirmed", "confirmDateChange"];
export const fieldType = (k: string) =>
  toggle.includes(k)
    ? "checkbox"
    : (k.endsWith("Id") && k !== "citizenId") ||
        ["targetGpa", "entranceScore", "maxCapacity", "credits"].includes(k)
      ? "number"
      : [
            "dateOfBirth",
            "registrationStart",
            "registrationEnd",
            "startDate",
            "endDate",
          ].includes(k)
        ? "date"
        : k === "email"
          ? "email"
          : "text";
function initial(k: string, row: Row) {
  if (k === "prerequisiteSubjectIds")
    return ((row.prerequisites as Row[]) ?? []).map((x) => x.id).join(", ");
  if (k === "semesterName" && row[k]) return semesterFormName(String(row[k]));
  if (["reason", "statusReason"].includes(k)) return "";
  return String(row[k] ?? "");
}
export function ActionForm({
  action,
  row = {},
  done,
  cancel,
}: {
  action: Action;
  row?: Row;
  done: () => void;
  cancel: () => void;
}) {
  const request = useLiveRequest(),
    { notify } = useUI();
  const isPrereq = action.op === "subjectSetPrerequisites";
  const [selected, setSelected] = useState<number[]>(
      ((row.prerequisites as SubjectResponse[]) ?? []).map((s) => s.id),
    ),
    [options, setOptions] = useState<SubjectResponse[]>(),
    [loadError, setLoadError] = useState("");
  useEffect(() => {
    if (!isPrereq) return;
    let active = true;
    async function load() {
      const rows = await readAllPages<SubjectResponse>(
        request,
        "subjectsSearch",
        new URLSearchParams({ status: "ACTIVE" }),
        () => active,
      );
      if (active) setOptions(rows);
    }
    load().catch((e) => {
      if (active) setLoadError(message(e));
    });
    return () => {
      active = false;
    };
  }, [request, isPrereq]);
  const fields: Field[] = action.fields
    .filter((f) => f !== "prerequisiteSubjectIds")
    .map((f) => {
      const key = f.replace("!", "");
      return {
        key,
        label: names[key],
        type: fieldType(key),
        required: f.endsWith("!"),
        value: fieldType(key) === "checkbox" ? "yes" : initial(key, row),
        step: ["targetGpa", "entranceScore"].includes(key) ? "0.01" : "1",
        options:
          key === "trainingType"
            ? ["CHINH_QUY", "LIEN_THONG", "VAN_BANG_2"].map((v) => ({
                value: v,
                label: labels[v],
              }))
            : undefined,
      };
    });
  function parse(f: FormData) {
    const body: Row = {},
      err: Record<string, string> = {};
    for (const field of action.fields) {
      const k = field.replace("!", ""),
        raw = String(f.get(k) ?? "").trim(),
        type = fieldType(k);
      if (field.endsWith("!") && !raw)
        err[k] =
          "Vui lòng " +
          (type === "checkbox" ? "xác nhận." : "điền trường này.");
      if (type === "checkbox") {
        body[k] = !!raw;
        continue;
      }
      if (k === "prerequisiteSubjectIds") {
        body[k] = selected;
        continue;
      }
      if (
        ["studentUpdate", "myStudentUpdate"].includes(action.op) &&
        raw === initial(k, row)
      )
        continue;
      if (
        (k === "reason" &&
          ["studentCreate", "lecturerCreate"].includes(action.op) &&
          raw.length > 500) ||
        (["fullName", "email", "citizenId", "phone"].includes(k) &&
          raw.length > 255)
      )
        err[k] = "Nội dung vượt quá độ dài cho phép.";
      if (!raw) {
        if (action.op === "studentUpdate" && ["email", "fullName"].includes(k))
          err[k] = "Vui lòng nhập thông tin hợp lệ.";
        if (action.op === "studentUpdate" && ["phone", "citizenId"].includes(k))
          body[k] = "";
        if (action.op === "myStudentUpdate") body[k] = null;
        else if (
          [
            "academicWarningReason",
            "academicWarningStatus",
            "description",
          ].includes(k)
        )
          body[k] = "";
        continue;
      }
      if (k === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw))
        err[k] = "Email chưa hợp lệ.";
      if (
        k === "phone" &&
        !/^(?:0|\+84)(?:3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])\d{7}$/.test(raw)
      )
        err[k] = "Số điện thoại di động Việt Nam chưa hợp lệ.";
      if (type === "number") {
        const n = Number(raw);
        if (
          !Number.isFinite(n) ||
          n < 0 ||
          ((k.endsWith("Id") || k === "credits" || k === "maxCapacity") &&
            (!Number.isSafeInteger(n) || n < 1)) ||
          (k === "credits" && n > 5) ||
          (k === "maxCapacity" && n > 80) ||
          (k === "targetGpa" && action.op === "myStudentUpdate" && n > 4)
        )
          err[k] = "Giá trị ngoài phạm vi cho phép.";
        body[k] = n;
      } else if (k === "semesterName") {
        try {
          body[k] = semesterWireName(raw);
        } catch {
          err[k] = "Nhập theo dạng HK_1 - 2026-2027.";
        }
      } else body[k] = raw;
    }
    if (body.registrationStart) {
      for (const [a, b] of [
        ["registrationStart", "registrationEnd"],
        ["registrationEnd", "startDate"],
        ["startDate", "endDate"],
      ])
        if (String(body[a]) >= String(body[b]))
          err[b] = "Ngày này phải sau " + names[a].toLowerCase() + ".";
    }
    if (
      ["lecturerCreate", "studentUpdate"].includes(action.op) &&
      body.dateOfBirth &&
      String(body.dateOfBirth) >= new Date().toLocaleDateString("sv-SE")
    )
      err.dateOfBirth = "Ngày sinh phải trong quá khứ.";
    return { err, body };
  }
  return (
    <>
      <h2>
        {action.title}
        {row.studentCode || row.subjectCode || row.moduleClassCode
          ? " · " +
            String(row.studentCode || row.subjectCode || row.moduleClassCode)
          : ""}
      </h2>
      {fields.some((f) =>
        ["majorId", "facultyId", "administrativeClassId"].includes(f.key),
      ) && <p>Nhập ID ngành, khóa, lớp hoặc khoa do phòng đào tạo cung cấp.</p>}
      {isPrereq && !options ? (
        <>
          <p>{loadError || "Đang tải danh mục học phần…"}</p>
          <button className="btn" onClick={cancel}>
            Đóng
          </button>
        </>
      ) : (
        <EditForm
          fields={fields}
          close={cancel}
          submit={
            isPrereq
              ? "Lưu môn tiên quyết"
              : action.fields.length
                ? "Lưu thay đổi"
                : "Xác nhận"
          }
          validate={(f, errors) => {
            for (const [key, text] of Object.entries(parse(f).err))
              errors[key] = [text];
            return errors;
          }}
          save={async (f) => {
            const { body } = parse(f);
            const result = await request<Row | undefined>(
              action.op,
              row.id as number,
              action.fields.length ? body : undefined,
            );
            const warnings = [
              ...(Array.isArray(result?.warnings) ? result.warnings : []),
              result?.notificationError,
            ].filter(Boolean);
            if (result?.notificationStatus === "FAILED")
              warnings.unshift("Gửi email tài khoản thất bại.");
            notify(
              action.title +
                " · " +
                (warnings.length ? warnings.join(" ") : "Thành công."),
              warnings.length ? "warning" : "success",
            );
            done();
          }}
        >
          {isPrereq && (
            <PrerequisiteChoices
              subjects={(options ?? []).filter((s) => s.id !== row.id)}
              selected={selected}
              setSelected={setSelected}
            />
          )}
        </EditForm>
      )}
    </>
  );
}
