import { useEffect, useRef, useState } from "react";
import { useAiApi } from "./useAiApi";
import { documentError, type AiUpload } from "../../services/api/aiApi";
import { useUI } from "../../context/UIContext";
import { ApiError } from "../../services/api/httpClient";
import "./ai.css";
export function AiDocuments() {
  const api = useAiApi(),
    { notify } = useUI();
  const [file, setFile] = useState<File | null>(null),
    [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<AiUpload>();
  const pending = useRef(false),
    mounted = useRef(true),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setResult(undefined);
    try {
      const next: Record<string, string> = {};
      const problem = await documentError(file);
      if (problem) next.file = problem;
      if (!accepted)
        next.accepted = "Vui lòng xác nhận quy tắc thay thế tài liệu cùng tên.";
      if (!mounted.current) return;
      setErrors(next);
      if (Object.keys(next).length) return;
      const response = await api.upload(file!);
      if (!mounted.current) return;
      setResult(response);
      setFile(null);
      setAccepted(false);
      if (input.current) input.current.value = "";
      notify("Đã tải tài liệu vào nguồn tri thức AI.");
    } catch (e) {
      if (mounted.current) {
        const next: Record<string, string> = {};
        if (e instanceof ApiError)
          for (const d of e.errors)
            next[d.field === "file" ? "file" : "general"] = [
              next[d.field === "file" ? "file" : "general"],
              d.message,
            ]
              .filter(Boolean)
              .join(" ");
        if (!Object.keys(next).length)
          next.general =
            e instanceof Error ? e.message : "Không tải được tài liệu.";
        setErrors(next);
      }
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Nguồn tri thức AI</h1>
          <p>Tải tài liệu để trợ lý trả lời các câu hỏi học vụ.</p>
        </div>
      </div>
      <section className="card ai-upload">
        <h2>Thêm hoặc thay thế tài liệu</h2>
        <p>
          Chấp nhận file TXT mã hóa UTF-8, tối đa 20 MB. Nội dung sẽ được chia
          thành các đoạn để tìm kiếm và trích dẫn.
        </p>
        <form noValidate onSubmit={submit} aria-busy={busy}>
          <fieldset disabled={busy}>
            <label htmlFor="ai-document">Tài liệu</label>
            <input
              id="ai-document"
              ref={input}
              type="file"
              accept=".txt,text/plain"
              aria-invalid={!!errors.file}
              aria-describedby={errors.file ? "ai-file-error" : undefined}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setAccepted(false);
                setErrors({});
                setResult(undefined);
              }}
            />
            {errors.file && (
              <p id="ai-file-error" className="field-error" role="alert">
                {errors.file}
              </p>
            )}
            <label className="ai-ack">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                aria-invalid={!!errors.accepted}
              />
              Tôi hiểu rằng tải file trùng tên sẽ thay thế nội dung tài liệu đã
              có.
            </label>
            {errors.accepted && (
              <p className="field-error" role="alert">
                {errors.accepted}
              </p>
            )}
            {errors.general && (
              <p className="field-error" role="alert">
                {errors.general}
              </p>
            )}
            <button className="btn primary">
              {busy ? "Đang xử lý tài liệu…" : "Tải tài liệu"}
            </button>
          </fieldset>
        </form>
        {result && (
          <div className="ai-upload-result" role="status">
            <strong>Đã xử lý: {result.sourceTitle}</strong>
            <p>Số đoạn tri thức: {result.chunkCount}</p>
          </div>
        )}
        <p className="muted">
          Hiện chưa hỗ trợ tra cứu danh sách, tải xuống, xóa hoặc bật/tắt tài
          liệu qua API.
        </p>
      </section>
    </>
  );
}
