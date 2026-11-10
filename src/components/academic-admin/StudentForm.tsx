import { useAcademic } from "../../context/AcademicContext";
import { useAuth } from "../../context/AuthContext";
import { useManagement } from "../../context/ManagementContext";
import { EditForm, str, type Field } from "./AcademicUI";
import { studentView } from "../../services/adapters";
import { createStudent, updateStudent } from "../../services/mock/dtoService";
import type { Student } from "../../types/student";
import type {
  CreateStudentRequest,
  UpdateStudentRequest,
} from "../../types/dto";
type Props = {
  student?: Student;
  studentData: Student[];
  onSave: (s: Student[]) => void;
  onClose: () => void;
  onNotify: (s: string) => void;
};
export function StudentForm({
  student,
  studentData,
  onSave,
  onClose,
  onNotify,
}: Props) {
  const a = useAcademic(),
    auth = useAuth(),
    { log } = useManagement(),
    d = student?.dto;
  const fields: Field[] = [
    ...(d
      ? [
          {
            key: "studentCode",
            label: "MSSV",
            value: d.studentCode,
            readOnly: true,
          },
        ]
      : []),
    { key: "fullName", label: "Họ và tên", required: true, value: d?.fullName },
    {
      key: "dateOfBirth",
      label: "Ngày sinh",
      type: "date",
      value: d?.dateOfBirth ?? "",
    },
    {
      key: "citizenId",
      label: "CCCD",
      required: !d,
      value: d?.citizenId ?? a.people[d?.studentCode ?? ""]?.citizenId,
    },
    {
      key: "email",
      label: "Email",
      type: "email",
      value: d?.email,
    },
    { key: "phone", label: "Số điện thoại", value: d?.phone },
    ...(!d
      ? [
          {
            key: "administrativeClassId",
            label: "Lớp hành chính",
            required: true,
            options: a.adminClasses.map((c) => ({
              value: c.id,
              label: `${c.className} · ${c.majorName} · ${c.cohortCode}`,
            })),
          },
        ]
      : []),
    ...(d
      ? [
          {
            key: "targetGpa",
            label: "GPA mục tiêu",
            type: "number",
            min: 0,
            max: 4,
            step: "0.01",
            value: d.targetGpa ?? "",
          },
        ]
      : [
          {
            key: "entranceScore",
            label: "Điểm đầu vào",
            type: "number",
            min: 0,
            step: "0.01",
          },
        ]),
    {
      key: "reason",
      label: d ? "Lý do cập nhật" : "Lý do thêm mới",
      required: !d,
    },
  ];
  return (
    <EditForm
      fields={fields}
      close={onClose}
      submit={d ? "Lưu hồ sơ" : "Tạo hồ sơ và tài khoản"}
      validate={(f, e) => {
        if (
          str(f, "citizenId") &&
          studentData.some(
            s => s.dto.id !== d?.id && s.dto.activityStatus !== "DELETED" && (s.dto.citizenId ?? a.people[s.id]?.citizenId) === str(f, "citizenId"),
          )
        )
          e.citizenId = ["CCCD đã tồn tại."];
        const cls = a.adminClasses.find(
          (c) => c.id === +str(f, "administrativeClassId"),
        );
        if (
          cls &&
          cls.className !== d?.className &&
          cls.maxCapacity &&
          studentData.filter((s) => s.dto.activityStatus !== "DELETED" && s.dto.className === cls.className).length >=
            cls.maxCapacity
        )
          e.administrativeClassId = ["Lớp hành chính đã đủ sức chứa."];
        for (const key of ["fullName", "email", "phone"]) {
          if (str(f, key).length > 255) e[key] = ["Nội dung tối đa 255 ký tự."];
        }
        if (str(f, "reason").length > 500)
          e.reason = ["Lý do tối đa 500 ký tự."];
        const gpa = str(f, "targetGpa");
        if (
          gpa &&
          (Number(gpa) < 0 ||
            Number(gpa) > 4 ||
            Math.abs(Number(gpa) * 100 - Math.round(Number(gpa) * 100)) > 1e-8)
        )
          e.targetGpa = ["GPA phải từ 0 đến 4, tối đa hai chữ số thập phân."];
        return e;
      }}
      save={async (f) => {
        const cls = a.adminClasses.find(
          (c) => c.id === +str(f, "administrativeClassId"),
        )!;
        const common = {
          fullName: str(f, "fullName"),
          dateOfBirth: str(f, "dateOfBirth") || undefined,
          email: str(f, "email"),
          phone: str(f, "phone"),
          citizenId: str(f, "citizenId") || undefined,
        };
        let next: Student;
        if (d) {
          const request: UpdateStudentRequest = {
            ...common,
            targetGpa: str(f, "targetGpa") ? +str(f, "targetGpa") : undefined,
            statusReason: str(f, "reason"),
          };
          next = studentView(updateStudent(d, request));
          auth.setUsers((old) =>
            old.map((u) =>
              u.username === d.studentCode
                ? {
                    ...u,
                    fullName: common.fullName,
                    email: common.email.trim().toLowerCase(),
                  }
                : u,
            ),
          );
        } else {
          const request: CreateStudentRequest = {
            ...common,
            administrativeClassId: cls.id,
            majorId: 1,
            cohortId: cls.cohortCode === "K2026" ? 1 : 2,
            entranceScore: str(f, "entranceScore")
              ? +str(f, "entranceScore")
              : undefined,
            reason: str(f, "reason"),
          };
          next = studentView(
            createStudent(
              request,
              studentData.map((s) => s.dto),
              a.adminClasses,
            ),
          );
          await auth.provisionAccounts([
            {
              username: next.id,
              fullName: next.name,
              role: "STUDENT",
              email: next.dto.email,
            },
          ]);
        }
        a.setPeople((old) => ({
          ...old,
          [next.id]: {
            ...old[next.id],
            ...(common.citizenId ? {citizenId: common.citizenId} : {}),
            ...(common.dateOfBirth ? {dateOfBirth: common.dateOfBirth} : {}),
            reason: str(f, "reason"),
            ...(!d
              ? { emailStatus: "Chưa gửi — chưa kết nối dịch vụ email" }
              : {}),
          },
        }));
        onSave(
          d
            ? studentData.map((s) => (s.dto.id === d.id ? next : s))
            : [...studentData, next],
        );
        log(
          "Admin học vụ",
          d ? "Cập nhật sinh viên" : "Tạo sinh viên",
          `${next.id} · ${str(f, "reason")}`,
        );
        onClose();
        onNotify(
          d
            ? `Đã cập nhật hồ sơ ${next.id}.`
            : `Đã tạo hồ sơ và tài khoản ${next.id}. Email cấp tài khoản chưa được gửi.`,
        );
      }}
    />
  );
}
