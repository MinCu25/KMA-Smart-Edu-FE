import {
  putSourceFile,
  getSourceFile,
} from "../../services/academic/fileStore";
import {
  processKnowledge,
  setKnowledgeActive,
  deleteKnowledge,
} from "../../services/academic/integrations";
import { useState } from "react";
import { usePersistentState } from "../../hooks/usePersistentState";
import { useUI } from "../../context/UIContext";
import { useManagement } from "../../context/ManagementContext";
import {
  EditForm,
  Pager,
  str,
} from "../../components/academic-admin/AcademicUI";
type Source = {
  id: number;
  title: string;
  kind: string;
  from: string;
  to: string;
  filename: string;
  size: number;
  hash: string;
  status:
    "WAITING_API" | "INACTIVE" | "DELETED" | "PROCESSING" | "READY" | "FAILED";
  reason: string;
  jobId?: string;
  progress?: number;
  versionOf?: number;
};
export default function KnowledgePage() {
  const [sources, setSources] = usePersistentState<Source[]>(
      "kma-knowledge-sources-v1",
      [],
    ),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0);
  const { setDialog, notify, notifyError } = useUI(),
    { log } = useManagement();
  const rows = sources.filter(
    (s) =>
      s.status !== "DELETED" &&
      s.title.toLowerCase().includes(query.toLowerCase()),
  );
  function upload() {
    setDialog({
      title: "Nạp nguồn tri thức",
      content: (
        <Upload
          sources={sources}
          save={(s) => {
            setSources((old) => [...old, s]);
            log("Admin học vụ", "Lưu thông tin nguồn tri thức", s.title);
            setDialog(null);
            notify(
              "Đã lưu tệp và thông tin nguồn trên trình duyệt. Tài liệu chưa được lập chỉ mục cho chatbot.",
              "info",
            );
          }}
          close={() => setDialog(null)}
        />
      ),
    });
  }
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Nguồn tri thức AI</h1>
          <p>Quản lý tài liệu quy chế và thủ tục đào tạo phục vụ chatbot.</p>
        </div>
        <button className="btn primary" onClick={upload}>
          Nạp tài liệu
        </button>
      </div>
      <section className="card admissions-card">
        <p>
          Chưa kết nối dịch vụ xử lý tài liệu. Nguồn mới lưu tệp và thông tin
          trên trình duyệt này, chưa được gửi lên máy chủ hoặc dùng để trả lời.
          Không nạp dữ liệu cá nhân.
        </p>
        <label>
          Tìm theo tên tài liệu
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <div className="table-scroll">
          <table className="management-table">
            <thead>
              <tr>
                {[
                  "Nguồn tài liệu",
                  "Loại",
                  "Hiệu lực",
                  "Trạng thái",
                  "Thao tác",
                ].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * 10, page * 10 + 10).map((s) => (
                <tr key={s.id}>
                  <td>
                    <b>{s.title}</b>
                    <br />
                    {s.filename} · {(s.size / 1024).toFixed(0)} KB
                  </td>
                  <td>{s.kind}</td>
                  <td>
                    {s.from} → {s.to || "Không giới hạn"}
                  </td>
                  <td>
                    {
                      {
                        INACTIVE: "Đã vô hiệu hóa",
                        WAITING_API: "Chờ kết nối xử lý",
                        PROCESSING: `Đang xử lý · ${s.progress ?? 0}%`,
                        READY: "Đã lập chỉ mục",
                        FAILED: "Xử lý thất bại",
                        DELETED: "Đã xóa",
                      }[s.status]
                    }
                    <small>{s.reason}</small>
                  </td>
                  <td>
                    <div className="management-actions">
                      <button
                        className="btn"
                        disabled={
                          s.status === "PROCESSING" ||
                          s.status === "INACTIVE" ||
                          s.status === "READY"
                        }
                        onClick={async () => {
                          try {
                            const file = await getSourceFile(s.id);
                            if (!file)
                              throw Error(
                                "Không tìm thấy tệp đã lưu. Vui lòng nạp lại tài liệu gốc.",
                              );
                            setSources((old) =>
                              old.map((x) =>
                                x.id === s.id
                                  ? {
                                      ...x,
                                      status: "PROCESSING",
                                      progress: 0,
                                      reason: "",
                                    }
                                  : x,
                              ),
                            );
                            const job = await processKnowledge(file, s, (job) =>
                              setSources((old) =>
                                old.map((x) =>
                                  x.id === s.id
                                    ? {
                                        ...x,
                                        jobId: job.id,
                                        progress: job.progress,
                                        reason: job.stage,
                                      }
                                    : x,
                                ),
                              ),
                            );
                            if (job.stage !== "READY")
                              throw Error(
                                job.error ?? "Tài liệu chưa xử lý hoàn tất.",
                              );
                            setSources((old) =>
                              old.map((x) =>
                                x.id === s.id
                                  ? {
                                      ...x,
                                      status: "READY",
                                      jobId: job.id,
                                      progress: 100,
                                      reason: "",
                                    }
                                  : x.id === s.versionOf
                                    ? {
                                        ...x,
                                        status: "INACTIVE",
                                        reason: "Đã thay bằng phiên bản mới",
                                      }
                                    : x,
                              ),
                            );
                            notify("Tài liệu đã được lập chỉ mục thành công.");
                          } catch (error) {
                            const message =
                              error instanceof Error
                                ? error.message
                                : "Không thể xử lý tài liệu.";
                            setSources((old) =>
                              old.map((x) =>
                                x.id === s.id
                                  ? { ...x, status: "FAILED", reason: message }
                                  : x,
                              ),
                            );
                            log(
                              "Admin học vụ",
                              "Xử lý tài liệu chưa thành công",
                              s.title,
                            );
                            notifyError(message);
                          }
                        }}
                      >
                        Xử lý lại
                      </button>
                      <button
                        className="btn"
                        disabled={s.status === "PROCESSING"}
                        onClick={async () => {
                          const inactive = s.status !== "INACTIVE";
                          try {
                            if (s.jobId)
                              await setKnowledgeActive(s.jobId, !inactive);
                          } catch (e) {
                            notifyError(
                              e instanceof Error
                                ? e.message
                                : "Không thể cập nhật nguồn.",
                            );
                            return;
                          }
                          setSources((old) =>
                            old.map((x) =>
                              x.id === s.id
                                ? {
                                    ...x,
                                    status: inactive
                                      ? "INACTIVE"
                                      : s.jobId
                                        ? "READY"
                                        : "WAITING_API",
                                  }
                                : x,
                            ),
                          );
                          log(
                            "Admin học vụ",
                            inactive ? "Vô hiệu hóa nguồn" : "Khôi phục nguồn",
                            s.title,
                          );
                          notify(
                            inactive
                              ? `Đã vô hiệu hóa nguồn ${s.title}.`
                              : `Đã khôi phục nguồn ${s.title} về trạng thái chờ xử lý.`,
                          );
                        }}
                      >
                        {s.status === "INACTIVE" ? "Khôi phục" : "Vô hiệu hóa"}
                      </button>
                      <button
                        className="btn"
                        disabled={s.status === "PROCESSING"}
                        onClick={() =>
                          setDialog({
                            title: `Xóa nguồn ${s.title}?`,
                            body: "Xóa nguồn khỏi danh sách quản trị và gỡ chỉ mục nếu nguồn đã được xử lý.",
                            confirm: "Xóa nguồn",
                            action: async () => {
                              try {
                                if (s.jobId) await deleteKnowledge(s.jobId);
                              } catch (e) {
                                notifyError(
                                  e instanceof Error
                                    ? e.message
                                    : "Không thể xóa nguồn.",
                                );
                                return;
                              }
                              setSources((old) =>
                                old.map((x) =>
                                  x.id === s.id
                                    ? { ...x, status: "DELETED" }
                                    : x,
                                ),
                              );
                              log(
                                "Admin học vụ",
                                "Xóa nguồn tri thức",
                                s.title,
                              );
                              notify(`Đã xóa nguồn ${s.title}.`);
                            },
                          })
                        }
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="empty-state">
              {query
                ? "Không tìm thấy nguồn tài liệu phù hợp."
                : "Chưa có nguồn tri thức. Chọn “Nạp tài liệu” để bắt đầu."}
            </p>
          )}
        </div>
        <Pager total={rows.length} page={page} setPage={setPage} />
      </section>
    </>
  );
}
function Upload({
  sources,
  save,
  close,
}: {
  sources: Source[];
  save: (s: Source) => void;
  close: () => void;
}) {
  const [file, setFile] = useState<File | null>(null),
    [error, setError] = useState("");
  return (
    <EditForm
      fields={[
        { key: "title", label: "Tên tài liệu", required: true },
        {
          key: "kind",
          label: "Loại tài liệu",
          required: true,
          options: [
            { value: "Quy chế", label: "Quy chế" },
            { value: "Quy định", label: "Quy định" },
            { value: "Thủ tục", label: "Thủ tục" },
          ],
        },
        {
          key: "from",
          label: "Hiệu lực từ ngày",
          type: "date",
          required: true,
        },
        { key: "to", label: "Hiệu lực đến ngày", type: "date" },
        {
          key: "version",
          label: "Khi nội dung đã tồn tại",
          required: true,
          value: "reject",
          options: [
            { value: "reject", label: "Không nạp trùng" },
            { value: "new", label: "Tạo phiên bản mới của nguồn trùng" },
          ],
        },
      ]}
      close={close}
      submit="Lưu nguồn chờ xử lý"
      validate={(f, e) => {
        if (str(f, "to") && str(f, "to") < str(f, "from"))
          e.to = ["Ngày hết hiệu lực không được trước ngày bắt đầu."];
        return e;
      }}
      save={async (f) => {
        if (
          !file ||
          !/^.+\.(pdf|docx|txt)$/i.test(file.name) ||
          !file.size ||
          file.size > 20 * 1024 * 1024
        ) {
          setError(
            "Chọn tệp PDF, DOCX hoặc TXT, dung lượng từ 1 byte đến 20 MB.",
          );
          return;
        }
        if (!crypto.subtle) {
          setError("Vui lòng mở web HTTPS để kiểm tra nội dung tệp.");
          return;
        }
        const hash = Array.from(
          new Uint8Array(
            await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
          ),
          (b) => b.toString(16).padStart(2, "0"),
        ).join("");
        const duplicate = sources.find(
          (s) => s.hash === hash && s.status !== "DELETED",
        );
        if (duplicate && str(f, "version") !== "new") {
          setError(
            `Nội dung trùng nguồn “${duplicate.title}”. Chọn tạo phiên bản mới hoặc đổi tệp.`,
          );
          return;
        }
        const id = Date.now();
        await putSourceFile(id, file);
        save({
          id,
          title: str(f, "title"),
          kind: str(f, "kind"),
          from: str(f, "from"),
          to: str(f, "to"),
          filename: file.name,
          size: file.size,
          hash,
          status: "WAITING_API",
          reason: "Chưa tải lên / chưa lập chỉ mục",
          versionOf: duplicate?.id,
        });
      }}
    >
      <label>
        Tệp tài liệu *
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError("");
          }}
        />
        <span className="field-error">{error}</span>
      </label>
      <p>
        Bản cũ chỉ được thay thế trong chatbot sau khi bản mới xử lý thành công.
      </p>
    </EditForm>
  );
}
