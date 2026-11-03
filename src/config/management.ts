import type { Entity } from "../types/management";
export type Field = {
  key: string;
  label: string;
  type?: "number" | "email";
  options?: string[];
  source?: Entity;
  min?: number;
  max?: number;
};
export const entityConfig: Record<
  Entity,
  { title: string; singular: string; description: string; fields: Field[] }
> = {
  teachers: {
    title: "Quản lý giảng viên",
    singular: "giảng viên",
    description: "Hồ sơ giảng viên và đơn vị công tác.",
    fields: [
      { key: "name", label: "Họ và tên" },
      { key: "email", label: "Email", type: "email" },
      {
        key: "department",
        label: "Khoa",
        options: [
          "Công nghệ thông tin",
          "An toàn thông tin",
          "Điện tử viễn thông",
        ],
      },
      {
        key: "status",
        label: "Trạng thái",
        options: ["Đang hoạt động", "Ngừng hoạt động"],
      },
    ],
  },
  subjects: {
    title: "Danh mục học phần",
    singular: "học phần",
    description: "Quản lý tín chỉ và thông tin tiên quyết tham khảo.",
    fields: [
      { key: "name", label: "Tên học phần" },
      { key: "credits", label: "Số tín chỉ", type: "number", min: 1, max: 10 },
      { key: "prerequisite", label: "Tiên quyết (ghi chú)" },
      {
        key: "status",
        label: "Trạng thái",
        options: ["Đang sử dụng", "Ngừng sử dụng"],
      },
    ],
  },
  rooms: {
    title: "Quản lý phòng học",
    singular: "phòng học",
    description:
      "Quản lý phòng học phục vụ xếp lịch.",
    fields: [
      { key: "name", label: "Tên phòng" },
      { key: "capacity", label: "Sức chứa", type: "number", min: 1, max: 500 },
      { key: "status", label: "Trạng thái", options: ["Sẵn sàng", "Bảo trì"] },
    ],
  },
  classes: {
    title: "Lớp học phần & xếp lịch",
    singular: "lớp học phần",
    description: "Phân công giảng viên, phòng học và lịch học theo kỳ.",
    fields: [
      { key: "subject", label: "Học phần", source: "subjects" },
      { key: "teacher", label: "Giảng viên", source: "teachers" },
      { key: "room", label: "Phòng học", source: "rooms" },
      {
        key: "day",
        label: "Ngày học",
        options: ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"],
      },
      { key: "start", label: "Tiết bắt đầu", type: "number", min: 1, max: 12 },
      { key: "end", label: "Tiết kết thúc", type: "number", min: 1, max: 12 },
      {
        key: "capacity",
        label: "Sĩ số tối đa",
        type: "number",
        min: 1,
        max: 500,
      },
      { key: "status", label: "Trạng thái", options: ["Đang mở", "Tạm đóng"] },
    ],
  },
  accounts: {
    title: "Tài khoản người dùng",
    singular: "tài khoản",
    description: "Quản lý hồ sơ, vai trò và trạng thái tài khoản.",
    fields: [
      { key: "name", label: "Họ và tên" },
      { key: "email", label: "Email", type: "email" },
      {
        key: "role",
        label: "Vai trò",
        options: ["Sinh viên", "Giảng viên", "Admin học vụ", "Admin hệ thống"],
      },
      {
        key: "status",
        label: "Trạng thái",
        options: ["Đang hoạt động", "Đã khóa"],
      },
    ],
  },
};
