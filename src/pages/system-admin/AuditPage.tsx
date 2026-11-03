import { useState } from "react";
import { useManagement } from "../../context/ManagementContext";
import { ManagementHeading } from "../../components/common/ManagementHeading";
import { exportCsv } from "../../utils/exportCsv";
export default function AuditPage() {
  const { audit } = useManagement();
  const [search, setSearch] = useState("");
  const filtered = audit.filter((a) =>
    (a.actor + a.action + a.detail)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <ManagementHeading
        title="Nhật ký hoạt động"
        description="200 thao tác quản lý gần nhất trong trình duyệt."
      >
        <button
          className="btn"
          onClick={() =>
            exportCsv("nhat-ky.csv", [
              ["Thời gian", "Người thực hiện", "Hành động", "Chi tiết"],
              ...filtered.map((a) => [a.time, a.actor, a.action, a.detail]),
            ])
          }
        >
          Xuất CSV
        </button>
      </ManagementHeading>
      <section className="card">
        <div className="management-toolbar">
          <label className="management-search">
            Tìm trong nhật ký
            <input
              placeholder="Người thực hiện, hành động, mã bản ghi…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <span>{filtered.length} hoạt động</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Người thực hiện</th>
                <th>Hành động</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td className="nowrap">
                    {new Date(a.time).toLocaleString("vi-VN")}
                  </td>
                  <td>{a.actor}</td>
                  <td>
                    <span className="badge blue">{a.action}</span>
                  </td>
                  <td className="audit-detail">{a.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <div className="empty-state">
            Chưa có hoạt động phù hợp. Hãy thử thêm học phần hoặc lưu điểm.
          </div>
        )}
      </section>
    </>
  );
}
