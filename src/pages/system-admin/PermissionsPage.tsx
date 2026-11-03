import { useManagement } from "../../context/ManagementContext";
import { useUI } from "../../context/UIContext";
import { ManagementHeading } from "../../components/common/ManagementHeading";
const roles = ["Sinh viên", "Giảng viên", "Admin học vụ", "Admin hệ thống"];
const rules = [
  ["Học vụ cá nhân", [0]],
  ["Đăng ký học phần", [0]],
  ["Nhập điểm lớp phụ trách", [1]],
  ["Quản lý hồ sơ và học phần", [2]],
  ["Điều hành kỳ học", [2]],
  ["Quản trị tài khoản", [3]],
  ["Cấu hình và nhật ký", [3]],
] as const;
export default function PermissionsPage() {
  const { permissions, setPermissions, log } = useManagement();
  const { notify } = useUI();
  return (
    <>
      <ManagementHeading
        title="Vai trò & phân quyền"
        description="Ma trận cấu hình quyền cho bốn nhóm người dùng."
      />

      <section className="card">
        <div className="table-scroll">
          <table className="permission-table">
            <thead>
              <tr>
                <th>Chức năng</th>
                {roles.map((r) => (
                  <th key={r}>{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map(([label, defaults], i) => (
                <tr key={label}>
                  <td>
                    <b>{label}</b>
                  </td>
                  {roles.map((r, j) => (
                    <td key={r}>
                      <input
                        type="checkbox"
                        aria-label={label + " · " + r}
                        checked={
                          permissions[i + "-" + j] ??
                          (defaults as readonly number[]).includes(j)
                        }
                        disabled={j === 3 && i >= 5}
                        onChange={(e) => {
                          setPermissions((old) => ({
                            ...old,
                            [i + "-" + j]: e.target.checked,
                          }));
                          log(
                            "Admin hệ thống",
                            "Cập nhật quyền",
                            r + " / " + label + " / " + e.target.checked,
                          );
                          notify("Đã lưu cấu hình quyền.");
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="section-description">
          Quyền quản trị cốt lõi của Admin hệ thống được giữ để tránh cấu hình
          mất quyền.
        </p>
      </section>
    </>
  );
}
