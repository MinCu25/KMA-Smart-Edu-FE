# Tích hợp AI — 13/11/2026

Nguồn: CanhhTran-01/edu-hub, nhánh feature/ai-assistant-01, commit 3cbf6f905be02fae2b26481d6aa80c758d77d041. Đối chiếu AiChatController, AiDocumentController, AiChatService, ChatHistoryService, DocumentIngestionService và các DTO AI.

## API đang sử dụng

| Method | Path | Vai trò / dữ liệu |
|---|---|---|
| POST | /api/v1/ai/chat | STUDENT; {message, sessionId}; null tạo phiên mới; message không blank, <=2000 ký tự |
| GET | /api/v1/ai/sessions?page=0&size=20 | STUDENT; PageResponse<AiSession> |
| GET | /api/v1/ai/sessions/{sessionId} | STUDENT; chi tiết và messages |
| POST | /api/v1/ai/documents | ACADEMIC_ADMIN; multipart file |

Tất cả dùng Bearer JWT và ApiResponse. ID hội thoại/message giữ string, không ép Number; role tin nhắn USER/ASSISTANT. Các phản hồi hiện là JSON hoàn chỉnh, chưa dùng SSE/streaming.

Chat không hiện toast thành công. Câu hỏi thất bại được giữ trong ô nhập, không tự retry POST. Đổi trang trong khi request đang chạy không đưa phản hồi cũ vào cuộc trò chuyện mới. Lịch sử lấy từ BE; nguồn trích dẫn được hiển thị dạng văn bản an toàn, không render HTML từ LLM/tài liệu. Thiếu số trang trong citation không tự điền số trang.

Upload chỉ nhận TXT UTF-8, không rỗng, <=20 MiB; FE kiểm tra encoding. Người dùng xác nhận việc thay thế file cùng tên. Response {sourceTitle, chunkCount}. Không tự upload lại nếu lỗi. Không dựng danh sách tài liệu giả khi chưa có API danh sách.

## Giới hạn BE

- Chat service hiện trả scenario=null, chỉ KNOWLEDGE hoặc OUT_OF_SCOPE; chưa tính GPA/lộ trình tốt nghiệp. Tab tư vấn giải thích giới hạn, không giả lập kết quả trong chế độ API.
- Chưa có list/delete/download/status tài liệu hoặc rename/delete hội thoại.
- Upload cùng tên thay nguồn theo sourceTitle. BE xóa vector cũ trước khi thêm mới: cần kiểm thử rollback khi embedding/vector store lỗi.
- Hạ tầng cần PostgreSQL/pgvector, migrations, GOOGLE_API_KEY và model khả dụng phía BE. Không đưa key AI vào VITE_* hoặc trình duyệt.
- Cần BE cho phép origin FE (CORS), URL truy cập được và tài khoản thử đúng vai trò.

## Kiểm chứng / chạy

npm test; npm run build. Có kiểm thử HTTP với phản hồi giả lập, ID lớn, UTF-8, multipart, lỗi auth và nội dung trích dẫn không thực thi HTML. Đây không thay cho kiểm thử LLM/database thật.

Đặt VITE_AUTH_MODE=api, VITE_API_BASE_URL=<URL BE>, khởi động lại Vite. Đăng nhập Admin học vụ để tải TXT; đăng nhập Sinh viên để hỏi, xem nguồn, tạo phiên mới, mở lại lịch sử. Demo vẫn độc lập; không gọi LLM hay gửi tài liệu lên BE.
