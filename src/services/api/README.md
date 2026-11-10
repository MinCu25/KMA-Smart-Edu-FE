# API transport

Nguồn hiện hành: `docs/API_SPECIFICATION.md` và `docs/fe-api-contract.ts` ngày 10/11/2026.

`backendContract.ts` re-export type chính thức và ánh xạ method/URL. `apiRequest` xử lý ApiResponse, field errors, FormData và response Void; `downloadApiFile` xử lý XLSX/blob và JSON lỗi. `eduApi.ts` chứa helper auth/CRUD theo hợp đồng hiện hành, không dùng type demo làm hợp đồng mạng.

`useLiveRequest` gửi Bearer, xử lý hết phiên và token đổi mật khẩu. API mode không tự fallback mock. `passwordReset.ts` chỉ là giới hạn mô phỏng ở demo; reset thật do màn tài khoản gọi endpoint BE.

Địa chỉ `VITE_API_BASE_URL` là origin BE, không thêm `/api/v1`. Xem README gốc để chạy và các giới hạn BE trong `docs/FRONTEND-INTEGRATION-STATUS.md`.
