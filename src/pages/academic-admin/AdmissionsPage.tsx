import { AdmissionScreen } from "../live/Admission";
import { useDemoAdmissionStore } from "../../services/mock/admissionStore";
export default function AdmissionsPage() {
  const store = useDemoAdmissionStore();
  return (
    <>
      <p className="muted">
        Danh mục hiện có: ngành Công nghệ thông tin (ID 1); khóa K2026 (ID 1),
        K2025 (ID 2).
      </p>
      <AdmissionScreen store={store} />
    </>
  );
}
