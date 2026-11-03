# Lớp học phần và lịch học — 2026-11-03

Phạm vi: Admin học vụ, UC-19, UC-20, UC-22, UC-23, UC-25 trong BF_UCS_and_IMAGESnew.pdf, trang 88–97. Bản gốc FE: main 43759c0efc920b56c166684bcd4fc6c6c8a15b5e. Backend scheduling: develop 8253c0e2965b53bab1a3ab47e068a472a2e99255.

| Nội dung | Sửa đổi |
| --- | --- |
| Tra cứu lớp | Lọc kết hợp kỳ, mã/tên học phần, học phần, ID giảng viên, trạng thái; các bước xử lý có nút lọc riêng; giữ lịch sử kỳ đã kết thúc ở chế độ chỉ xem. |
| Mở lớp | Gom các dòng cùng học phần thành một SubjectClassesRequest, xác nhận lớp song song, giới hạn sức chứa 1–80. Các lớp đã hủy không gây cảnh báo mở thêm, mã lịch sử không bị tái sử dụng. |
| Nhu cầu mở lớp | Có bảng đúng tiến độ/học lại/chưa học/tổng dự kiến/lớp đề xuất/lớp đã mở theo OpeningSubjectResponse. Nếu chưa có dữ liệu, hiển thị trạng thái trống; không suy diễn nhu cầu học lại từ sĩ số lớp hành chính. |
| Xếp lịch | Chọn tuần đầu/cuối, đổi sang startDate/endDate trong giới hạn kỳ; kiểm tra thứ, tiết, tuần, phòng, giảng viên và roster sinh viên; gợi ý phòng trống theo khung đã chọn. |
| Kiểm tra trùng | Hai khoảng ngày giao nhau chỉ gây trùng khi thực sự có cùng ngày học định kỳ trong phần giao; không báo trùng giả ở tuần lẻ đầu/cuối. |
| Công bố | Một bộ quy tắc dùng chung cho lý do hiển thị, chọn tất cả lớp đủ điều kiện, và kiểm tra công bố; chặn lịch ngoài kỳ, thiếu giảng viên, sức chứa sai, phòng sai, trùng lịch. |
| Thời khóa biểu | Chọn/chuyển tuần trong kỳ; ngày thực tế từ thứ Hai đến Chủ nhật; đúng phạm vi ngày từng buổi, lọc ID giảng viên/phòng/học phần, sĩ số, dấu lịch đã cập nhật, mục Chưa xếp lịch và CSV đúng tuần/bộ lọc. |

## Ranh giới API và điểm khác giữa tài liệu / backend

- `CreateModuleClassRequest` hiện chỉ có `maxCapacity`; batch body là `{ subjects: [{ subjectId, confirmAdditionalClasses, classes: [{ maxCapacity }] }] }`, `semesterId` ở path. Mã do BE sinh dạng `MC_<semesterId>_<subjectCode>_<STT 3 số>`.
- `UpdateModuleClassRequest` chỉ có `maxCapacity` và `reason`. `CancelModuleClassRequest` chỉ có `reason`. Không đưa giảng viên, loại phòng hay trạng thái vào các DTO này.
- Tài liệu UC-19 yêu cầu chọn giảng viên lúc mở lớp; backend hiện tạo lớp chưa phân công và chưa có endpoint phân công trong ModuleClassController. FE giữ lựa chọn giảng viên/loại phòng trong mô hình cục bộ để thao tác theo use case; khi ghép API phải tạo lớp trước, phân công qua contract riêng. Không coi việc tạo batch thành công là phân công thành công.
- ModuleClassResponse đã bổ sung semesterId, subjectId, lecturerId, classSequence, dataSource; lecturerName có thể null. Các trường mới optional trong TS để đọc được dữ liệu trình duyệt cũ, không phải suy đoán ID từ tên khi response đã có ID.
- Controller hiện có GET opening-subjects, GET module-classes, GET detail, POST batch, PATCH capacity, POST cancel. Luồng trang vẫn dùng context cục bộ; cần adapter HTTP, phiên BE và invalidation trước khi dùng thật. Không tự dựng endpoint phân công/xếp lịch/công bố.
- `openingDemand` là dữ liệu theo kỳ dành cho kết quả opening-subjects; hiện khởi tạo rỗng. Backend phải cung cấp số liệu thực và historyComplete. Không có số liệu không đồng nghĩa nhu cầu bằng 0.
- UC-22 ghi chuyển về Đã xếp lịch, còn UC-23 cấm thu hồi lớp đang có sinh viên. FE giữ OPEN khi sửa lịch hợp lệ của lớp đang công bố, đánh dấu changedAt; xóa buổi cuối của lớp có sinh viên bị chặn. Cần nhóm thống nhất trạng thái chính thức khi triển khai API.
- Tuần 1 tính từ thứ Hai của tuần chứa ngày bắt đầu kỳ; cắt ngày đầu/cuối theo kỳ. DTO vẫn gửi ngày, không tự thêm trường startWeek/endWeek.
- DTO không quy định tiết tối đa. FE kiểm tra số nguyên dương và thứ tự tiết; chờ cấu hình khung tiết từ BE, không áp một giới hạn tự đoán.
- Xếp lịch kiểm tra roster đầy đủ trước khi lưu. Email/thông báo server chưa triển khai. Kiểm tra toàn trường và chống thao tác đồng thời thuộc trách nhiệm BE.

## Kiểm tra

`npm test` kiểm tra snapshot DTO cũ cùng snapshot scheduling riêng, payload batch, giới hạn sức chứa, tuần đầu/cuối, Chủ nhật, loại bỏ lớp hủy, trùng lịch định kỳ và điều kiện công bố; bộ kiểm thử sẵn có render các trang học vụ. `npm run build` kiểm tra TypeScript và build production. Chưa kiểm thử tương tác trong trình duyệt hoặc API thật.
