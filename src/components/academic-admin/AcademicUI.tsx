import { useState, useEffect, type ReactNode } from "react";
import { useFormErrors, type FieldErrors } from "../../hooks/useFormErrors";
import { validateEmail, validatePhone } from "../../utils/profileValidation";
export type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
  options?: { value: string | number; label: string }[];
  value?: string | number;
  readOnly?: boolean;
  hint?: string;
};
export const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
export function baseValidation(fields: Field[], f: FormData): FieldErrors {
  const e: FieldErrors = {};
  for (const x of fields) {
    const v = str(f, x.key);
    e[x.key] = [];
    if (x.required && !v)
      e[x.key].push(x.type === "checkbox" ? "Vui lòng tích ô xác nhận để tiếp tục." : `Vui lòng nhập ${x.label.toLowerCase()}.`);
    if (!v) continue;
    if (
      x.type === "number" &&
      (!Number.isFinite(+v) ||
        (x.step !== "0.01" && !Number.isInteger(+v)) ||
        (x.min !== undefined && +v < x.min) ||
        (x.max !== undefined && +v > x.max))
    )
      e[x.key].push(
        `Giá trị phải ${x.step === "0.01" ? "là số" : "là số nguyên"}${x.min !== undefined ? ` từ ${x.min}` : ""}${x.max !== undefined ? ` đến ${x.max}` : ""}.`,
      );
    if (
      x.type === "date" &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(v) ||
        !Number.isFinite(Date.parse(v)) ||
        new Date(v).toISOString().slice(0, 10) !== v)
    )
      e[x.key].push("Ngày không hợp lệ.");
    if (x.type === "email") {
      const msg = validateEmail(v);
      if (msg) e[x.key].push(msg);
    }
    if (x.key === "phone") {
      const msg = validatePhone(v);
      if (msg) e[x.key].push(msg);
    }
    if (x.key === "citizenId" && !/^\d{12}$/.test(v))
      e[x.key].push("CCCD phải có đúng 12 chữ số.");
    if (
      x.key === "dateOfBirth" &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(v) ||
        v >= new Date().toISOString().slice(0, 10))
    )
      e[x.key].push("Ngày sinh phải là ngày hợp lệ trong quá khứ.");
    if (x.options && !x.options.some((o) => String(o.value) === v))
      e[x.key].push("Lựa chọn không còn hợp lệ.");
  }
  return e;
}
export function EditForm({
  fields,
  validate,
  save,
  close,
  submit = "Lưu thay đổi",
  children,
  onValuesChange,
}: {
  fields: Field[];
  validate?: (f: FormData, e: FieldErrors) => FieldErrors;
  save: (f: FormData) => void | Promise<void>;
  close: () => void;
  submit?: string;
  children?: ReactNode;
  onValuesChange?: (data: FormData) => void;
}) {
  const form = useFormErrors((f) =>
    validate
      ? validate(f, baseValidation(fields, f))
      : baseValidation(fields, f),
  );
  const [busy, setBusy] = useState(false);
  return (
    <form
      aria-busy={busy}
      className="student-form"
      noValidate
      onChange={(event) => {
        form.onChange(event);
        onValuesChange?.(new FormData(event.currentTarget));
      }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || !form.check(e.currentTarget)) return;
        const f = new FormData(e.currentTarget);
        setBusy(true);
        try {
          await save(f);
        } catch (error) {
          form.applyError(error);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="academic-fields">
        {fields.map((x) => (
          <label key={x.key} className={x.type === "checkbox" ? "confirmation-field" : undefined}>
            {x.type !== "checkbox" && <>{x.label}{x.required ? " *" : ""}</>}
            {x.type === "checkbox" ? (
              <span className="confirmation-choice">
                <input type="checkbox" name={x.key} value="yes"
                  defaultChecked={x.value === "yes"} disabled={busy}
                  {...form.props(x.key)} />
                <span>{x.options?.[0]?.label ?? x.label}{x.required ? " *" : ""}</span>
              </span>
            ) : x.options ? (
              <select
                name={x.key}
                disabled={busy}
                defaultValue={x.value ?? ""}
                {...form.props(x.key)}
              >
                <option value="">Chọn {x.label.toLowerCase()}</option>
                {x.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={x.key}
                type={x.type ?? "text"}
                defaultValue={x.value ?? ""}
                disabled={busy}
                readOnly={x.readOnly}
                min={x.min}
                max={x.max}
                step={x.step ?? "1"}
                {...form.props(x.key)}
              />
            )}{" "}
            {x.hint && <small>{x.hint}</small>}
            <span className="field-error" id={`${x.key}-error`}>
              {form.errors[x.key]?.join(" ")}
            </span>
          </label>
        ))}
      </div>
      {children}
      {form.errors._form?.length ? (
        <p className="field-error" role="alert">
          {form.errors._form.join(" ")}
        </p>
      ) : null}
      {form.formError && (
        <p className="field-error" role="alert">
          {form.formError}
        </p>
      )}
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={close} disabled={busy}>
          Hủy
        </button>
        <button className="btn primary" disabled={busy}>
          {busy ? "Đang xử lý…" : submit}
        </button>
      </div>
    </form>
  );
}
export function Pager({
  total,
  page,
  setPage,
  size = 10,
}: {
  total: number;
  page: number;
  setPage: (n: number) => void;
  size?: number;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  useEffect(() => {
    if (page >= pages) setPage(pages - 1);
  }, [total, page, pages, setPage]);
  return (
    <div className="academic-pagination">
      <span>
        <b>{total}</b> kết quả · Hiển thị{" "}
        {total ? Math.min(page * size + 1, total) : 0}–
        {Math.min((page + 1) * size, total)}
      </span>
      <div>
        <button
          className="btn"
          disabled={page <= 0}
          onClick={() => setPage(page - 1)}
        >
          Trước
        </button>
        <span>
          Trang {page + 1} / {pages}
        </span>
        <button
          className="btn"
          disabled={page + 1 >= pages}
          onClick={() => setPage(page + 1)}
        >
          Sau
        </button>
      </div>
    </div>
  );
}
export function Detail({ items }: { items: [string, unknown][] }) {
  return (
    <dl className="academic-detail">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>
            {v === null || v === undefined || v === ""
              ? "Chưa có thông tin"
              : ((
                  {
                    CHINH_QUY: "Chính quy",
                    LIEN_THONG: "Liên thông",
                    VAN_BANG_2: "Văn bằng 2",
                    ACTIVE: "Đang hoạt động",
                    LOCKED: "Đã khóa",
                    INACTIVE: "Ngừng hoạt động",
                  } as Record<string, string>
                )[String(v)] ?? String(v))}
          </dd>
        </div>
      ))}
    </dl>
  );
}
export const faculties = [
  "Công nghệ thông tin",
  "An toàn thông tin",
  "Điện tử viễn thông",
].map((label, i) => ({ value: i + 1, label }));
export const personFields: Field[] = [
  { key: "fullName", label: "Họ và tên", required: true },
  { key: "dateOfBirth", label: "Ngày sinh", type: "date" },
  { key: "citizenId", label: "CCCD" },
  { key: "email", label: "Email", type: "email", required: true },
  { key: "phone", label: "Số điện thoại" },
  { key: "facultyId", label: "Khoa", required: true, options: faculties },
  { key: "reason", label: "Lý do thêm mới", required: true },
];
