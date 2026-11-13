import { repairSeedScheduleStorage } from "./seedScheduleRepair";
// Chỉ lớp mock này truy cập localStorage. Không dùng để phân quyền thật.
export function readStorage<T>(key: string, fallback: T): T {
  try {
    return repairSeedScheduleStorage(
      key,
      JSON.parse(localStorage.getItem(key) || "null", (key, value) =>
        key === "activityStatus" && value === "STUDING"
          ? "STUDYING"
          : value &&
              typeof value === "object" &&
              value.username &&
              value.role &&
              value.status === "INACTIVE"
            ? { ...value, status: "DISABLED" }
            : value && typeof value === "object" &&
                value.dto?.activityStatus === "DEACTIVATED" &&
                value.status === "Ngừng hoạt động"
              ? { ...value, status: "Vô hiệu hóa" }
              : value,
      ) ?? fallback,
    );
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Trình duyệt chặn lưu trữ: vẫn cho phép dùng bản mẫu trong bộ nhớ.
  }
}
