import { useEffect, useState } from "react";
import { useLiveRequest } from "./client";

interface AdministrativeClass {
  id: number;
  className: string;
  currentSize: number | null;
  maxCapacity: number | null;
}

export function AdministrativeClassSelect({
  majorId,
  cohortId,
  name,
  initialValue = "",
  required = false,
}: {
  majorId: string;
  cohortId: string;
  name: string;
  initialValue?: string;
  required?: boolean;
}) {
  const request = useLiveRequest();
  const [items, setItems] = useState<AdministrativeClass[]>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [value, setValue] = useState(initialValue);
  const ready = [majorId, cohortId].every(
    (v) => v.trim() !== "" && Number.isSafeInteger(Number(v)) && Number(v) > 0,
  );
  useEffect(() => {
    if (!ready) return;
    let active = true;
    setItems(undefined);
    setError("");
    const timer = setTimeout(() => {
      request<AdministrativeClass[]>(
        "administrativeClasses",
        undefined,
        undefined,
        new URLSearchParams({ majorId, cohortId }),
      )
        .then((rows) => {
          if (active) setItems(rows);
        })
        .catch((e) => {
          if (active)
            setError(
              e instanceof Error ? e.message : "Không tải được danh sách lớp.",
            );
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [request, majorId, cohortId, ready, retry]);
  const hint = !ready
    ? "Nhập ID ngành và ID khóa để chọn lớp."
    : error
      ? "Không tải được danh sách lớp."
      : !items
        ? "Đang tải danh sách lớp…"
        : !items.length
          ? "Ngành và khóa này chưa có lớp hành chính."
          : "";
  return (
    <>
      <select
        name={name}
        required={required}
        disabled={!ready || !items || !!error || !items.length}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Lớp hành chính"
      >
        <option value="">
          {hint ||
            (required ? "Chọn lớp hành chính" : "Tất cả / giữ nguyên lớp")}
        </option>
        {items?.map((c) => (
          <option key={c.id} value={c.id}>
            {c.className} · {c.currentSize ?? 0}/{c.maxCapacity ?? "—"} sinh
            viên
          </option>
        ))}
      </select>
      {hint && <small>{hint}</small>}
      {error && (
        <span className="field-error" role="alert">
          {error}{" "}
          <button
            className="text-link"
            type="button"
            onClick={() => setRetry((n) => n + 1)}
          >
            Thử lại
          </button>
        </span>
      )}
    </>
  );
}
