# Trạng thái dự án

Cập nhật: 02/08/2026. Ghi lại để người (hoặc AI) quay lại sau này biết đang ở
đâu mà không phải đọc lại toàn bộ lịch sử git.

## Đang ở đâu

Ứng dụng đã hoàn chỉnh về mặt tính năng và hạ tầng. Site chạy tại
https://danthuyy.github.io/ielts/, deploy tự động khi push lên `main`.

- 221 test, TypeScript strict, ESLint sạch
- Lighthouse **100** cả bốn hạng mục, tổng trang 416 kB (ngân sách 600 kB)
- 4 workflow: CI, CodeQL, Lighthouse, Deploy

## Giới hạn thật hiện nay

**Nội dung: mới 1 bài học, 25 từ.** Toàn bộ hạ tầng soạn nội dung đã xong — đây
là việc còn lại có giá trị lớn nhất, và nó không phải việc lập trình. Xem
[CONTRIBUTING.md](../CONTRIBUTING.md) để thêm bài.

## Nợ kỹ thuật đã biết

| Việc                                   | Vì sao chưa làm                                                                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Component chưa có test (coverage ~20%) | Lớp `src/lib` phủ tốt. Cố ý **không** đặt ngưỡng coverage, vì ngưỡng chỉ đẻ ra test rỗng. Muốn nâng thật thì viết test render cho các màn học. |
| Font Inter tải từ Google Fonts         | Offline sẽ rơi về font hệ thống. Muốn offline đúng nghĩa thì phải self-host file woff2.                                                        |
| `output/` nặng ~8 MB trong repo        | Đây là bộ sticker gốc 512px. Giữ lại để không mất; bản dùng cho web đã hạ 192px trong `public/stickers`.                                       |

## Những quyết định dễ bị hiểu nhầm

Ghi lại vì nếu không biết lý do thì rất dễ "sửa" thành sai:

- **Khoá tiến độ sinh từ nội dung** (`hello_happiness:vast`) chứ không theo vị
  trí. Đây là lý do có thể chèn thêm từ vào bài cũ mà không hỏng dữ liệu người
  học. Đổi `id` bài hoặc đổi tên `word` là xoá tiến độ trên mọi thiết bị.
- **Điểm cuối phiên tính theo lần thử đầu tiên**, không phải kết quả cuối. Vì
  phải trả lời đúng mới được đi tiếp, nếu tính kết quả cuối thì ai cũng 100%.
- **Gợi ý đi từ nghĩa và ngữ cảnh trước, chữ cái sau.** Mở chữ cái trước là dạy
  nhớ mặt chữ — đúng cái học vẹt mà ứng dụng muốn tránh.
- **`--primary` và `--primary-fill` là hai token khác nhau.** Một màu không thể
  vừa đủ sáng để làm chữ trên nền tối, vừa đủ tối để chữ trắng đọc được trên nó.
  Gộp lại là rớt chuẩn WCAG ở một trong hai theme.
- **Âm thanh tổng hợp bằng Web Audio, không dùng file mp3.** Không có asset để
  cache, không vướng bản quyền.
- **Câu hỏi ở màn học chỉ hiện nghĩa và từ loại.** Collocation, câu ví dụ, chữ
  cái đầu, số ký tự đều là nấc của thang gợi ý, mở sau khi sai. In thẳng ra là
  đưa luôn đáp án — chuyện này đã xảy ra một lần và không test nào bắt được.
- **`public/stickers/` là sản phẩm sinh ra**, không phải file gốc. Sửa bằng
  `python scripts/build-stickers.py`.
- **`.env.local` bắt buộc khi dev.** Không có nó thì `npm run dev` ghi thẳng vào
  hàng Supabase của bản production. Chuyện này đã xảy ra một lần rồi.

## Nếu đẩy code lên mà mở web vẫn thấy bản cũ

Không phải cache của GitHub — HTTP header chỉ `max-age=600`, tức 10 phút. Thủ
phạm là **service worker**, và gốc rễ nằm ở **cách nó phục vụ `index.html`**.

Worker do vite-plugin-pwa sinh ra mặc định đăng ký route này:

```js
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));
```

`createHandlerBoundToURL('index.html')` phục vụ **bản `index.html` đã nằm trong
precache** cho _mọi_ lần mở trang. `index.html` là file **duy nhất không có
hash**; ghim nó vào cache là ghim luôn cả app vào bản chụp lúc cài worker đó, vì
nó trỏ tới đúng bộ bundle của bản chụp ấy. Cộng với hash-routing (app không bao
giờ điều hướng lại sau khi vào) nên worker hiếm khi có dịp tự kiểm tra bản mới —
điểm vào có thể đông cứng nhiều ngày trong khi bundle mới nằm chờ trên server.

**Cách sửa tận gốc** (trong `vite.config.ts`): tắt route fallback đó
(`navigateFallback: null`) và cho điều hướng chạy **NetworkFirst**. Máy còn mạng
thì luôn tải `index.html` mới nhất → bundle mới nhất; mất mạng mới rơi về bản
cache lần online gần nhất. Bundle có hash nên vẫn cache-first, đúng và miễn phí.
Từ khi một máy tải được bản có NetworkFirst, nó **không thể kẹt lại** nữa.

Với máy đã lỡ kẹt sẵn (chạy app cũ + worker cũ), không có cách nào đẩy code tới
một client mà worker của nó không chịu bàn giao — đó là giới hạn nền tảng. Ba
đường thoát: (1) trình duyệt tự kiểm tra `sw.js` trong ~24h rồi tự lành; (2) tải
lại cứng (Ctrl+F5) vài lần; (3) **Cài đặt → Phiên bản → Tải lại sạch** — nút này
xoá cache + gỡ worker rồi tải lại, không đụng tiến độ học (tiến độ nằm ở IndexedDB
và Supabase). Nút chỉ có ở app đã lên bản mới, nên nó chống tái phát chứ không
cứu được máy đang chạy app cũ ngay lúc này.

Ngoài ra `src/components/UpdateBanner.tsx` tự đăng ký worker và **chủ động hỏi
lại**: mỗi 30 phút, mỗi lần quay lại tab, và mỗi lần có mạng trở lại. Có bản mới
thì hiện dải thông báo kèm nút Tải lại — không tự reload, vì reload giữa lúc đang
làm bài là mất phiên học. NetworkFirst lo phần "luôn mới"; dải thông báo lo phần
"đổi worker cho gọn".

Muốn biết mình đang chạy bản nào: **Cài đặt → Phiên bản → Bản dựng** hiện đúng
mã commit, kèm nút "Kiểm tra bản mới" để hỏi ngay.

Hai chỗ bẫy đã vấp khi kiểm chứng, đừng gỡ:

- **Nút "Tải lại" phải reload vô điều kiện.** Trang chưa từng tải bên dưới một
  service worker thì không bị nó điều khiển; bản mới lúc đó kích hoạt luôn, nên
  không có worker nào chờ để gửi `SKIP_WAITING` và cũng không có sự kiện
  `controllerchange` để đợi — nút gọi đúng API mà chẳng có gì xảy ra. `clientsClaim`
  thu hẹp khoảng đó lại nhưng không xoá được nó.
- **GitHub Pages đặt `max-age=600` cho `index.html`.** Deploy xong mà mở lại
  ngay trong vòng 10 phút thì trình duyệt vẫn có thể lấy HTML cũ từ cache HTTP,
  trước cả khi service worker kịp xen vào. Đây là 10 phút, không phải mấy ngày —
  đừng nhầm nó với triệu chứng ở trên.

## Nếu site trắng hoặc thiếu favicon/sticker

Triệu chứng: mở https://danthuyy.github.io/ielts/ ra trang trắng, `favicon.ico`
404, còn `package.json` lại trả về 200. Nghĩa là Pages đang phục vụ **repo thô**
chứ không phải thư mục `dist`.

Nguyên nhân là **Settings → Pages → Source** bị đặt về _"Deploy from a branch"_.
Chỗ này bẫy ở đúng một điểm: khi Source là branch, `actions/deploy-pages` vẫn
tạo được bản ghi deployment và workflow vẫn **xanh**, nhưng GitHub không dùng nó
để phục vụ. Nhìn CI thì tưởng mọi thứ ổn.

Cách nhận biết trong một câu: nếu danh sách Actions còn workflow
`dynamic/pages/pages-build-deployment` chạy mỗi lần push, thì Source vẫn là
branch. Đặt đúng thành `GitHub Actions` là nó biến mất hẳn, và ô chọn Branch
trong trang Settings cũng biến mất.

Đổi Source **không** tự deploy lại — phải push thêm một commit.

## Muốn làm tiếp thì đây là thứ đáng nhất

1. Đổ nội dung thật vào (không phải việc code)
2. Test render cho các màn học — hiện bấm sai một nút chấm điểm không có gì bắt
3. Self-host font để offline đúng nghĩa
