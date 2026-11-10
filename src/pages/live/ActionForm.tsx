import {
  EditForm,
  type Field,
} from "../../components/academic-admin/AcademicUI";
import { PrerequisiteChoices } from "../academic-admin/SubjectsPage";
import type {
  SubjectResponse,
  AdministrativeClassResponse,
} from "../../services/api/backendContract";
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
        [
          "targetGpa",
          "entranceScore",
          "maxCapacity",
          "credits",
          "recruitmentYear",
        ].includes(k)
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
  const isTeaching = action.fields.some(
    (f) => f.replace("!", "") === "teachingSubjectIds",
  );
  const [teachingIds, setTeachingIds] = useState<number[]>(
    ((row.teachingSubjects as SubjectResponse[]) ?? []).map((s) => s.id),
  );
  const [teachingChanged, setTeachingChanged] = useState(false);
  const [scope, setScope] = useState("");
  const [classes, setClasses] = useState<AdministrativeClassResponse[]>([]);
  const [classError, setClassError] = useState("");
  const [classLoading, setClassLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (action.op !== "studentCreate" || !scope) {
      setClassLoading(false);
      return;
    }
    let active = true;
    setClasses([]);
    setClassLoading(true);
    setClassError("");
    request<AdministrativeClassResponse[]>(
      "administrativeClassesSearch",
      undefined,
      undefined,
      new URLSearchParams(scope),
    )
      .then((result) => {
        if (active) setClasses(result);
      })
      .catch((error) => {
        if (active) setClassError(message(error));
      })
      .finally(() => {
        if (active) setClassLoading(false);
      });
    return () => {
      active = false;
    };
  }, [scope, action.op, request]);
  const [teachingError, setTeachingError] = useState("");
  const [selected, setSelected] = useState<number[]>(
      ((row.prerequisites as SubjectResponse[]) ?? []).map((s) => s.id),
    ),
    [options, setOptions] = useState<SubjectResponse[]>(),
    [loadError, setLoadError] = useState("");
  useEffect(() => {
    if (!isPrereq && !isTeaching) return;
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
  }, [request, isPrereq, isTeaching]);
  const fields: Field[] = action.fields
    .filter(
      (f) =>
        !["prerequisiteSubjectIds", "teachingSubjectIds"].includes(
          f.replace("!", ""),
        ),
    )
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
          key === "administrativeClassId" && action.op === "studentCreate"
            ? classes.map((c) => ({
                value: c.id,
                label:
                  c.className +
                  " · " +
                  (labels[c.trainingType] ?? c.trainingType),
              }))
            : key === "trainingType"
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
      if (k === "teachingSubjectIds") {
        if (action.op === "lecturerCreate" || teachingChanged) {
          if (!teachingIds.length)
            err[k] = "Vui lòng chọn ít nhất một học phần đang hoạt động.";
          if (
            teachingIds.some((id) => !(options ?? []).some((s) => s.id === id))
          )
            err[k] =
              "Hãy bỏ các môn đã ngừng sử dụng trước khi thay danh sách môn.";
          body[k] = teachingIds;
        }
        continue;
      }
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
        ["studentUpdate", "lecturerUpdate", "myStudentUpdate"].includes(
          action.op,
        ) &&
        raw === initial(k, row)
      )
        continue;
      if (
        (["reason", "statusReason"].includes(k) && raw.length > 500) ||
        (["fullName", "email", "citizenId", "phone"].includes(k) &&
          raw.length > 255)
      )
        err[k] = "Nội dung vượt quá độ dài cho phép.";
      if (!raw) {
        if (
          ["studentUpdate", "lecturerUpdate"].includes(action.op) &&
          ["fullName", "citizenId", "dateOfBirth"].includes(k)
        )
          err[k] = "Vui lòng nhập thông tin hợp lệ.";
        if (
          ["studentUpdate", "lecturerUpdate"].includes(action.op) &&
          ["phone", "email"].includes(k)
        )
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
          (k === "targetGpa" &&
            (n > 4 || Math.abs(n * 100 - Math.round(n * 100)) > 1e-8)) ||
          (k === "recruitmentYear" &&
            (!Number.isInteger(n) || n < 1000 || n > 9999))
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
      [
        "lecturerCreate",
        "lecturerUpdate",
        "studentCreate",
        "studentUpdate",
      ].includes(action.op) &&
      body.dateOfBirth &&
      String(body.dateOfBirth) >= new Date().toLocaleDateString("sv-SE")
    )
      err.dateOfBirth = "Ngày sinh phải trong quá khứ.";
    if (action.op === "studentCreate") {
      const chosen = classes.find((c) => c.id === body.administrativeClassId);
      if (classLoading || !chosen)
        err.administrativeClassId =
          "Vui lòng chọn lớp thuộc ngành và khóa đã chọn.";
      else if (chosen.trainingType !== body.trainingType)
        err.trainingType = "Hệ đào tạo phải khớp với lớp đã chọn.";
    }
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
      {action.op === "studentCreate" && (
        <p role="status">
          {classLoading
            ? "Đang tải lớp theo ngành và khóa…"
            : classError ||
              (scope && !classes.length
                ? "Không có lớp hành chính trong ngành và khóa đã chọn."
                : "Nhập ID ngành và khóa để tải danh sách lớp.")}
        </p>
      )}
      {fields.some((f) =>
        ["majorId", "facultyId", "administrativeClassId"].includes(f.key),
      ) && <p>Nhập ID ngành, khóa, lớp hoặc khoa do phòng đào tạo cung cấp.</p>}
      {(isPrereq || isTeaching) && !options ? (
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
          onValuesChange={
            action.op === "studentCreate"
              ? (f) => {
                  const major = Number(f.get("majorId")),
                    cohort = Number(f.get("cohortId"));
                  const next =
                    Number.isSafeInteger(major) &&
                    major > 0 &&
                    Number.isSafeInteger(cohort) &&
                    cohort > 0
                      ? new URLSearchParams({
                          majorId: String(major),
                          cohortId: String(cohort),
                        }).toString()
                      : "";
                  setScope(next);
                  if (!next) setClasses([]);
                }
              : undefined
          }
          submit={
            isPrereq
              ? "Lưu môn tiên quyết"
              : action.fields.length
                ? "Lưu thay đổi"
                : "Xác nhận"
          }
          validate={(f, errors) => {
            setTeachingError(parse(f).err.teachingSubjectIds ?? "");
            for (const [key, text] of Object.entries(parse(f).err))
              errors[key] = [text];
            return errors;
          }}
          save={async (f) => {
            const { body } = parse(f);
            setSaving(true);
            let result: Row | undefined;
            try {
              result = await request<Row | undefined>(
                action.op,
                row.id as number,
                action.fields.length ? body : undefined,
              );
            } catch (error) {
              setTeachingError(
                Object.entries(errorMap(error))
                  .filter(([key]) => key.startsWith("teachingSubjectIds"))
                  .map(([, value]) => value)
                  .join(" "),
              );
              throw error;
            } finally {
              setSaving(false);
            }
            const warnings = [
              ...(Array.isArray(result?.warnings) ? result.warnings : []),
              result?.notificationError,
            ].filter(Boolean);
            if (result?.notificationStatus === "SKIPPED")
              warnings.unshift(
                "Đã tạo hồ sơ; không gửi email vì chưa có địa chỉ nhận.",
              );
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
          {isTeaching && (
            <fieldset className="teaching-subject-choices" disabled={saving}>
              <legend>
                Học phần có thể giảng dạy{" "}
                {action.op === "lecturerCreate" ? "*" : ""}
              </legend>
              <input
                type="hidden"
                name="teachingSubjectIds"
                value={teachingIds.join(",")}
              />
              <p>
                Chọn các học phần đang hoạt động. Khi sửa, giữ nguyên lựa chọn
                để bảo toàn môn lịch sử.
              </p>
              {[
                ...(options ?? []),
                ...((row.teachingSubjects as SubjectResponse[]) ?? []).filter(
                  (s) => !(options ?? []).some((o) => o.id === s.id),
                ),
              ].map((subject) => (
                <label key={subject.id}>
                  <input
                    type="checkbox"
                    checked={teachingIds.includes(subject.id)}
                    onChange={(e) => {
                      setTeachingChanged(true);
                      setTeachingError("");
                      setTeachingIds((ids) =>
                        e.target.checked
                          ? [...ids, subject.id]
                          : ids.filter((id) => id !== subject.id),
                      );
                    }}
                  />{" "}
                  {subject.subjectCode} · {subject.subjectName}
                  {!(options ?? []).some((o) => o.id === subject.id)
                    ? " (môn lịch sử, không thể chọn mới)"
                    : ""}
                </label>
              ))}
              {!options?.length && (
                <p>Không có học phần đang hoạt động để chọn.</p>
              )}
              {teachingError && (
                <p
                  className="field-error"
                  id="teachingSubjectIds-error"
                  role="alert"
                >
                  {teachingError}
                </p>
              )}
            </fieldset>
          )}
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
