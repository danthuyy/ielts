# Chính sách bảo mật

## Phạm vi

Đây là một trang tĩnh chạy hoàn toàn trong trình duyệt. Không có máy chủ ứng
dụng, không có tài khoản người dùng, không có mật khẩu.

Dữ liệu học nằm trong IndexedDB và localStorage của chính trình duyệt bạn. Nếu
bật đồng bộ, dữ liệu đó cũng được ghi vào một hàng trong bảng Supabase.

## Về khóa Supabase trong mã nguồn

`VITE_SUPABASE_ANON_KEY` là khóa **publishable** và nằm công khai trong bundle
— đúng theo thiết kế của Supabase. Quyền của nó bị Row Level Security giới hạn
xuống đúng một hàng. Đây **không** phải lỗ hổng.

Điều thực sự nghiêm trọng sẽ là khóa `service_role` bị lộ. Khóa đó không bao
giờ được đặt vào repo này.

Hệ quả cần biết: ai đọc được mã nguồn cũng đọc và ghi được hàng đồng bộ đó. Dữ
liệu ở đây chỉ là tiến độ học từ vựng nên rủi ro chấp nhận được, nhưng đừng lưu
bất cứ thứ gì riêng tư vào đó.

## Báo lỗi bảo mật

Dùng tab **Security → Report a vulnerability** của repo để gửi báo cáo riêng
tư. Đừng mở issue công khai cho lỗi bảo mật.

Xin nêu rõ: cách tái hiện, ảnh hưởng thực tế, và phiên bản/trình duyệt bạn thử.

## Những gì đã có sẵn

- CodeQL quét mã mỗi lần push và hằng tuần.
- Dependabot cập nhật phụ thuộc npm và GitHub Actions.
- Workflow chạy với quyền tối thiểu; job nào cần ghi thì khai báo riêng.
- Job xử lý nội dung của pull request chạy bằng token chỉ đọc.
