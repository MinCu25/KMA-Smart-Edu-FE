export const enrollmentStates = {
  available: {label: "Đủ điều kiện", color: "green"},
  registered: {label: "Đã đăng ký", color: "green"},
  duplicate: {label: "Đã đăng ký lớp khác", color: "red"},
  closed: {label: "Ngoài thời gian đăng ký", color: "red"},
  creditLimit: {label: "Vượt giới hạn tín chỉ", color: "red"},
  missing: {label: "Thiếu tiên quyết", color: "yellow"},
  conflict: {label: "Trùng lịch", color: "red"},
  full: {label: "Lớp đã đủ", color: "red"},
} as const;
