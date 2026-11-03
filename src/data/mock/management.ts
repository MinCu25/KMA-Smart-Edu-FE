import type { Entity, RecordRow } from "../../types/management";
export const managementSeed: Record<Entity, RecordRow[]> = {
  teachers: [
    {
      id: "GV001",
      name: "Nguyễn Minh Tuấn",
      email: "tuan.nm@kma.edu.vn",
      department: "Công nghệ thông tin",
      status: "Đang hoạt động",
    },
    {
      id: "GV002",
      name: "Trần Thu Hà",
      email: "ha.tt@kma.edu.vn",
      department: "An toàn thông tin",
      status: "Đang hoạt động",
    },
    {
      id: "GV003",
      name: "Lê Hoàng Nam",
      email: "nam.lh@kma.edu.vn",
      department: "Công nghệ thông tin",
      status: "Đang hoạt động",
    },
  ],
  subjects: [
    {
      id: "INT1401",
      name: "Giao diện người dùng",
      credits: "3",
      prerequisite: "Lập trình cơ bản",
      status: "Đang sử dụng",
    },
    {
      id: "INT1301",
      name: "Cơ sở dữ liệu",
      credits: "3",
      prerequisite: "Không",
      status: "Đang sử dụng",
    },
    {
      id: "INT1340",
      name: "Lập trình hướng đối tượng",
      credits: "3",
      prerequisite: "Lập trình cơ bản",
      status: "Đang sử dụng",
    },
    {
      id: "INT1405",
      name: "Công nghệ phần mềm",
      credits: "3",
      prerequisite: "Cơ sở dữ liệu",
      status: "Đang sử dụng",
    },
  ],
  rooms: [
    { id: "A201", name: "Phòng A201", capacity: "60", status: "Sẵn sàng" },
    { id: "A305", name: "Phòng máy A305", capacity: "40", status: "Sẵn sàng" },
    { id: "B202", name: "Phòng B202", capacity: "80", status: "Sẵn sàng" },
  ],
  classes: [
    {
      id: "INT1401.1",
      subject: "INT1401",
      teacher: "GV001",
      room: "A201",
      day: "Thứ 2",
      start: "1",
      end: "3",
      capacity: "50",
      status: "Đang mở",
    },
    {
      id: "INT1340.1",
      subject: "INT1340",
      teacher: "GV001",
      room: "A305",
      day: "Thứ 3",
      start: "2",
      end: "4",
      capacity: "35",
      status: "Đang mở",
    },
    {
      id: "INT1301.2",
      subject: "INT1301",
      teacher: "GV002",
      room: "B202",
      day: "Thứ 4",
      start: "5",
      end: "7",
      capacity: "60",
      status: "Đang mở",
    },
    {
      id: "INT1405.3",
      subject: "INT1405",
      teacher: "GV003",
      room: "A201",
      day: "Thứ 5",
      start: "8",
      end: "10",
      capacity: "50",
      status: "Đang mở",
    },
  ],
  accounts: [
    {
      id: "admin",
      name: "Quản trị hệ thống",
      email: "admin@kma.edu.vn",
      role: "Admin hệ thống",
      status: "Đang hoạt động",
    },
    {
      id: "hocvu",
      name: "Phòng đào tạo",
      email: "hocvu@kma.edu.vn",
      role: "Admin học vụ",
      status: "Đang hoạt động",
    },
    {
      id: "GV001",
      name: "Nguyễn Minh Tuấn",
      email: "tuan.nm@kma.edu.vn",
      role: "Giảng viên",
      status: "Đang hoạt động",
    },
    {
      id: "CT080101",
      name: "Nguyễn Văn An",
      email: "ct080101@kma.edu.vn",
      role: "Sinh viên",
      status: "Đang hoạt động",
    },
  ],
};
export const demoRosters: Record<string, string[]> = {
  "INT1401.1": ["CT080101", "CT080214", "CT080327", "CT080342"],
  "INT1340.1": ["CT080101", "CT080214"],
};

// Response adapters for existing dashboard and lecturer display components.
import {
  lecturerResponses,
  subjectResponses,
  moduleClassResponses,
  userResponses,
} from "./dtoFixtures";
managementSeed.teachers = lecturerResponses.map((x) => ({
  id: x.lecturerCode,
  name: x.fullName,
  email: x.email,
  department: x.facultyName,
  status: x.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng hoạt động",
}));
managementSeed.subjects = subjectResponses.map((x) => ({
  id: x.subjectCode,
  name: x.subjectName,
  credits: String(x.credits),
  prerequisite: x.prerequisites.map((t) => t.subjectName).join(", ") || "Không",
  status: x.status === "ACTIVE" ? "Đang sử dụng" : "Ngừng sử dụng",
}));
managementSeed.classes = moduleClassResponses.map((x) => ({
  id: x.moduleClassCode,
  subject: x.subjectCode,
  teacher:
    lecturerResponses.find((t) => t.fullName === x.lecturerName)
      ?.lecturerCode ?? "",
  room: x.schedules[0]?.roomCode ?? "",
  day: `Thứ ${x.schedules[0]?.dayOfWeek ?? 2}`,
  start: String(x.schedules[0]?.lessonOrderStart ?? 0),
  end: String(x.schedules[0]?.lessonOrderEnd ?? 0),
  capacity: String(x.maxCapacity),
  status: x.status === "OPEN" ? "Đang mở" : "Tạm đóng",
}));
managementSeed.accounts = userResponses.map((x) => ({
  id: x.username,
  name: x.fullName,
  role: x.role,
  status: x.status === "ACTIVE" ? "Đang hoạt động" : "Đã khóa",
}));
demoRosters["INT1306.1"] = ["CT080101", "CT080214", "CT080327", "CT080342"];
