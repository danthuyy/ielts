# Cập nhật lớn — phiên làm đêm 06–07/08/2026

Tài liệu này ghi lại toàn bộ thay đổi trong một phiên làm việc dài, để sau này
người (hoặc AI) đọc một chỗ là nắm được, không phải lần lại từng commit.

Nguyên tắc xuyên suốt: **sau mỗi phần đều `typecheck + lint + test + build`
xanh rồi mới commit & push**, và **kiểm chứng bằng UI thật** trên trình duyệt
(vì đêm làm, hạ tầng CI của GitHub gặp sự cố — xem mục cuối).

---

## 1. Tính năng mới

### Học theo kỳ (tuần / tháng / năm)

- Màn **"Học theo kỳ"** (`/study/period`): chọn mức Tuần / Tháng / Năm, rồi chọn
  một kỳ cụ thể để **học trộn tất cả từ đã thêm trong kỳ đó**, dùng lại đúng cỗ
  máy leo-bậc của chế độ Học mix.
- Gom bài theo `date` của bài. Khoá kỳ tính từ chuỗi `YYYY-MM-DD` (không qua
  `new Date(string)`) để tránh lệch ngày do múi giờ UTC.
- Code: [`src/lib/periods.ts`](../src/lib/periods.ts) (ISO week/tháng/năm + gom
  bài, có test), [`PeriodPickerScreen`](../src/features/study/PeriodPickerScreen.tsx),
  [`MixPeriodScreen`](../src/features/study/MixPeriodScreen.tsx). Lối vào ở Trang chủ.
- Engine Học mix đã tách thành [`MixSession`](../src/features/study/MixSession.tsx)
  để dùng lại cho cả bài lẻ lẫn cả kỳ.

### Từ đồng nghĩa (synonyms) cho mọi từ

- Thêm trường `synonyms` vào schema từ (tuỳ chọn, ngăn bằng `·`).
- Hiển thị ở **Chi tiết từ**, **Flashcard** (mặt sau), tìm được trong **ô tìm
  kiếm**, và là một **bậc gợi ý** ("Từ đồng nghĩa") trên thang hint — nằm trên
  các bậc chữ cái nên gợi theo nghĩa mà không lộ mặt chữ. Rất hợp luyện
  paraphrase cho IELTS Writing/Speaking.
- Đã điền synonyms cho **toàn bộ** từ hiện có.

### Chế độ Kiểm tra: xếp loại + kỷ lục điểm

- Bài kiểm tra (15 câu, 3 dạng, **không gợi ý**) nay:
  - Cho **xếp loại chữ** S / A / B / C / D kèm nhãn (Xuất sắc … Cần ôn thêm) —
    [`src/lib/grade.ts`](../src/lib/grade.ts), có test.
  - Hiện **Kỷ lục** điểm cao nhất từng đạt cho bài đó; vượt kỷ lục thì báo "mới!".
  - Đáp án nhiễu lấy trong chính tập đang kiểm tra (không trộn từ bài khác).

### Từ vựng của ngày

- Card **"Từ vựng hôm nay"** trên Trang chủ: mỗi ngày một từ, chọn bằng cách băm
  chuỗi ngày nên ổn định qua mọi lần tải lại, **không cần lưu trữ**. Bấm vào mở
  trang chi tiết từ. Code: [`src/lib/wordOfDay.ts`](../src/lib/wordOfDay.ts), có test.

### Sửa lỗi "đáp án toàn từ bài cũ"

- Trước đây đáp án nhiễu ở Học mix và Trắc nghiệm lấy từ **toàn bộ kho từ**, nên
  học bài mới mà 3/4 lựa chọn là từ bài cũ. Nay ưu tiên lấy từ **trong phiên
  đang học**, chỉ mượn kho chung khi bài quá ít từ; và **không lặp cả từ lẫn
  nghĩa** với đáp án đúng (trước đó hai từ trùng nghĩa có thể cùng xuất hiện).
  Helper chung: [`src/lib/choices.ts`](../src/lib/choices.ts), có test.

---

## 2. Nội dung từ vựng

Từ **1 bài / 25 từ** ban đầu (thực tế 5 bài / 125 từ trước phiên này) mở rộng lên
**14 bài / 350 từ**:

| Nhóm            | Bài                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| Học thuật (AWL) | `awl_sublist_1`, `awl_sublist_2` (50 từ Academic Word List — nhóm giá trị nhất cho IELTS)             |
| Chủ đề          | Môi trường, Giáo dục, Công nghệ, Sức khoẻ, Tội phạm & Pháp luật, Truyền thông, Công việc & Kinh doanh |

Mỗi từ có: nghĩa tiếng Việt, IPA, **collocation**, **synonyms**, câu ví dụ.

> ⚠️ **Nội dung do AI soạn, cần rà lại.** IPA và một số nghĩa/ví dụ nên được người
> dạy soát qua trước khi coi là chuẩn tuyệt đối. Việc thêm/sửa từ không đụng chạm
> tiến độ người học đang có (khoá tiến độ theo `bài:từ`).

Các bài mới để `date` trong tuần hiện tại nên xuất hiện luôn ở "Học theo kỳ".

---

## 3. Đã kiểm chứng bằng UI (không chỉ test đơn vị)

Chạy dev, đi qua từng màn, soi console — **không có lỗi** ở:

- Trang chủ (card Từ vựng hôm nay, lưới 14 chủ đề, thống kê 350 từ)
- Thư viện (tìm theo synonym ra đúng từ; bộ lọc chủ đề)
- Học mix bài mới (đáp án nhiễu nằm trong bài)
- Kiểm tra: chơi trọn 15 câu → màn kết quả hiện **Xếp loại + Kỷ lục + xem lại**
- Học theo kỳ (Tuần 32 gom đủ bài mới; Tháng; Năm)
- Thống kê (donut + heatmap + lịch ôn), Cài đặt

---

## 4. Về "build fail" trên GitHub

Trong đêm, workflow **Deploy to GitHub Pages** báo đỏ với:

- `The job was not acquired by Runner of type hosted even after multiple attempts`
- `Internal server error` ở bước deploy Pages

Đây là **sự cố hạ tầng phía GitHub** (runner không nhận job, Pages lỗi nội bộ),
không phải lỗi code: các commit **trước cả phiên này** (kể cả commit của chủ repo)
cũng fail deploy y hệt, trong khi build ở máy luôn xanh. Khi runner của GitHub hồi
phục, commit mới nhất sẽ tự deploy. Không cần sửa gì trong mã.
