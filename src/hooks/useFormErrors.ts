import { ApiError } from "../services/api/httpClient";
import { useState, useRef, type FormEvent } from "react";
export type FieldErrors = Record<string, string[]>;
export function useFormErrors(validate: (data: FormData) => FieldErrors) {
  const fields = useRef<Set<string>>(new Set());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  function check(form: HTMLFormElement) {
    fields.current = new Set(
      Array.from(form.elements)
        .map((e) => (e as HTMLInputElement).name)
        .filter(Boolean),
    );
    const next = validate(new FormData(form));
    setSubmitted(true);
    setErrors(next);
    setFormError("");
    const first = Object.keys(next).find((key) => next[key].length);
    if (first) (form.elements.namedItem(first) as HTMLElement)?.focus();
    return !first;
  }
  function onChange(e: FormEvent<HTMLFormElement>) {
    setFormError("");
    if (submitted) setErrors(validate(new FormData(e.currentTarget)));
  }
  function applyError(error: unknown) {
    if (error instanceof ApiError && error.errors.length) {
      const next: FieldErrors = {};
      const general: string[] = [];
      for (const detail of error.errors) {
        if (fields.current.has(detail.field))
          (next[detail.field] ??= []).push(detail.message);
        else general.push(detail.message);
      }
      setErrors(next);
      setFormError(general.join(" "));
    } else
      setFormError(
        error instanceof Error ? error.message : "Không thể lưu dữ liệu.",
      );
  }
  function reset() {
    setErrors({});
    setSubmitted(false);
    setFormError("");
  }
  function props(name: string) {
    return {
      "aria-invalid": !!errors[name]?.length,
      "aria-describedby": errors[name]?.length ? `${name}-error` : undefined,
    };
  }
  return {
    applyError,
    setErrors,
    errors,
    formError,
    setFormError,
    check,
    onChange,
    reset,
    props,
  };
}
