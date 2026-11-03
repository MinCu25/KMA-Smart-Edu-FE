# API transport

Client `eduApi.ts` khớp 7 controller tại develop 8253c0e. Xem `docs/API-READINESS.md`.

`apiRequest` bóc ApiResponse.data, giữ ApiError.code/errors, hỗ trợ 204 và FormData. `createEduApi` nhận token provider và callback 401; không tự refresh hoặc fallback về mock. VITE_API_BASE_URL là origin BE, client thêm /api/v1.

Client chưa được gắn vào toàn bộ context/UI. Chỉ chuyển nguồn khi có URL/auth, lookup, mapping ID và contract còn thiếu; không gửi ID fixtures lên database thật.
