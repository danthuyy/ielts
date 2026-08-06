# IELTS Vocab Trainer

Ứng dụng web học từ vựng IELTS bằng tiếng Việt. Chạy hoàn toàn trên trình duyệt, không cần tài khoản, dùng được khi mất mạng.

Bản chạy thử: https://danthuyy.github.io/ielts/

> Dùng AI để thêm bài học? Hướng dẫn dành riêng cho agent nằm ở [AGENTS.md](AGENTS.md).
> Trạng thái dự án và nợ kỹ thuật: [docs/TRANG_THAI.md](docs/TRANG_THAI.md).

## Tính năng

- **Flashcard SRS** — lặp lại ngắt quãng theo thuật toán SM-2, tự động xếp lịch ôn từng từ.
- **4 chế độ quiz** — điền từ, nghe viết, nối từ, trắc nghiệm.
- **Bài kiểm tra tổng hợp** — trộn từ của nhiều bài học để kiểm tra lại.
- **Thống kê** — theo dõi số từ đã học, chuỗi ngày học, tiến độ từng bài.
- **Đếm ngược ngày thi** — đặt ngày thi, trang chủ tính số từ cần học mỗi ngày để kịp.
- **Nhắc học hàng ngày** — thông báo trình duyệt vào giờ bạn chọn.
- **Hoàn tác chấm điểm** — bấm nhầm mức không làm hỏng lịch ôn của từ đó.
- **Trang chi tiết từ** — lịch ôn, độ chính xác và hệ số dễ của riêng từng từ.
- **Sticker phản hồi** — bộ sticker riêng phản ứng theo từng tình huống: đúng, sai, xong bài đúng hết, hay sai nhiều. Tắt được trong Cài đặt.
- **Âm thanh đúng/sai** — tiếng ngắn, tổng hợp trực tiếp trong trình duyệt nên không tải file nào.
- **Thanh tiến độ đổi màu** theo tỉ lệ trả lời đúng của phiên đang học.
- **Học đến khi thuộc** — làm sai thì từ đó ở lại cho tới khi bạn trả lời đúng, hoặc tự bấm bỏ qua; bỏ qua thì nó quay lại ở cuối phiên.
- **Chấm từng chữ cái** — gõ sai chính tả thì tô đỏ đúng chữ sai, chữ thiếu hiện dấu `·`, không lộ đáp án. Gõ gần đúng được báo là "gần đúng" chứ không phải "sai".
- **Gợi ý chống học vẹt** — chỉ hiện sau khi đã thử, và đi từ nghĩa tới ngữ cảnh rồi mới tới chữ cái: số ký tự → nghĩa → collocation và câu ví dụ **có chỗ trống thay cho từ cần tìm** → phiên âm → mở dần chữ cái. Buộc bạn nhớ từ theo nghĩa chứ không phải theo mặt chữ.
- **Đảo thứ tự mỗi phiên** — tránh học thuộc vị trí thay vì học từ.
- **Học từ mới** — phiên riêng lấy đúng số từ theo mục tiêu hàng ngày.
- **Luyện từ hay sai** — gom những từ có độ chính xác thấp nhất thành một phiên riêng, không phải chờ tới lịch ôn.
- **Thống kê chi tiết** — heatmap hoạt động 26 tuần, lịch ôn 14 ngày tới, và bảng xếp hạng từ yếu.
- **Tìm kiếm từ vựng** — tìm theo từ tiếng Anh, nghĩa tiếng Việt hoặc collocation trên mọi bài học.
- **Giao diện sáng/tối** — theo hệ điều hành hoặc tự chọn; mọi màu đều đạt WCAG AA ở cả hai chế độ.
- **Sao lưu ra file** — xuất và khôi phục toàn bộ tiến độ; bản duy nhất không bị đồng bộ ghi đè.
- **Từ đã lưu** — đánh dấu từ khó để ôn riêng.
- **Nghe người bản xứ** — mỗi từ có nút mở YouGlish, nghe từ đó trong hàng loạt video thật.
- **Text-to-speech** — phát âm từ và ví dụ, chọn được giọng đọc.
- **Đồng bộ đa thiết bị** — tùy chọn, qua Supabase; không bật thì mọi thứ vẫn nằm trên máy.
- **Hoạt động offline** — PWA, cài được vào màn hình chính và dùng khi không có mạng.

## Công nghệ

| Mảng              | Công cụ                             |
| ----------------- | ----------------------------------- |
| Build             | Vite 8 (Rolldown)                   |
| Ngôn ngữ          | TypeScript (strict)                 |
| UI                | React 19, React Router (HashRouter) |
| Lưu trữ cục bộ    | Dexie (IndexedDB)                   |
| Đồng bộ           | Supabase REST (tùy chọn)            |
| Kiểm tra nội dung | Zod                                 |
| Chất lượng mã     | ESLint (flat config), Prettier      |
| Kiểm thử          | Vitest, Testing Library             |
| Offline           | vite-plugin-pwa                     |
| CI/CD             | GitHub Actions                      |

## Bắt đầu nhanh

Yêu cầu: **Node.js 22.18 trở lên** — các script nội dung import thẳng `src/content/schema.ts`
và dựa vào khả năng strip type sẵn có của Node.

```bash
git clone https://github.com/danthuyy/ielts.git
```

```bash
cd ielts
```

```bash
npm ci
```

```bash
npm run dev
```

Mở địa chỉ mà Vite in ra (mặc định http://localhost:5173).

## Các npm script

| Lệnh                                                  | Tác dụng                                         |
| ----------------------------------------------------- | ------------------------------------------------ |
| `npm run dev`                                         | Chạy dev server                                  |
| `npm run build`                                       | Typecheck + kiểm tra nội dung + build production |
| `npm run preview`                                     | Chạy thử bản build production ở máy              |
| `npm run test`                                        | Chạy Vitest một lượt                             |
| `npm run test:watch`                                  | Chạy Vitest ở chế độ watch                       |
| `npm run lint`                                        | Chạy ESLint                                      |
| `npm run lint:fix`                                    | Chạy ESLint và tự sửa                            |
| `npm run format`                                      | Định dạng mã bằng Prettier                       |
| `npm run typecheck`                                   | `tsc --noEmit`                                   |
| `npm run validate:content`                            | Kiểm tra mọi file trong `content/lessons`        |
| `npm run lesson:new -- --id <slug> --title "<title>"` | Tạo khung file JSON cho bài học mới              |
| `npm run lesson:import`                               | Chuyển file markdown từ vựng thành bài học JSON  |

## Cấu trúc thư mục

```
content/lessons/*.json        nội dung bài học, mỗi bài một file JSON
scripts/new-lesson.mjs        CLI tạo bài học mới
scripts/validate-content.mjs  trình kiểm tra nội dung (dùng cả trong CI)
src/app/                      router, providers, khung ứng dụng
src/components/               UI dùng lại (ProgressBar, StudyHeader, HintBar, VoicePicker,
                              ResultScreen, ConfirmDialog, ScreenState)
src/features/                 mỗi màn hình một thư mục: home, lessons, study, quiz,
                              test, review, stats, bookmarks, settings
.github/workflows/            ci.yml (kiểm tra) + deploy.yml (GitHub Pages)
src/hooks/                    useKeyboard, useSwipe, useSettings, useSyncState
src/lib/                      db.ts, progress.ts, srs.ts, tts.ts, sync.ts, ids.ts,
                              settings.ts, config.ts, utils.ts
src/content/                  schema.ts (Zod), lessons.ts (nạp content/lessons/*.json
                              qua import.meta.glob), categories.ts
src/styles/                   design token + CSS toàn cục
tests/                        unit test
```

## Thêm bài học mới

Bài học được tự động phát hiện từ `content/lessons/` — không có file index để đăng ký, không cần sửa code. Chỉ cần thêm một file JSON:

```bash
npm run lesson:new -- --id hello_happiness --title "Hello Happiness"
```

Chi tiết đặc tả file JSON, quy tắc đặt `id`, quy ước tags và checklist trước khi commit: xem [CONTRIBUTING.md](CONTRIBUTING.md).

## Triển khai

Push lên nhánh `main` sẽ kích hoạt workflow `deploy.yml` (build và deploy lên GitHub Pages qua `actions/deploy-pages`). Workflow `ci.yml` chạy typecheck, lint, test, kiểm tra nội dung và build trên mỗi push/PR.

Thiết lập một lần cho repo: **Settings → Pages → Source → "GitHub Actions"**.

Vite `base` được đặt là `/ielts/`, khớp với đường dẫn GitHub Pages. Nếu bạn fork sang tên repo khác, hãy sửa `base` trong `vite.config.ts`.

## Giấy phép

MIT. Xem [LICENSE](LICENSE).

<!-- deploy freshness probe: safe to delete -->
