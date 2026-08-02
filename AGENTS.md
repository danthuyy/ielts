# Hướng dẫn cho AI agent

Tài liệu này dành cho trợ lý AI làm việc trên repo. Đọc hết trước khi sửa bất cứ
thứ gì. Con người thì đọc [README.md](README.md) và [CONTRIBUTING.md](CONTRIBUTING.md).

> Đang ở đâu, còn gì phải làm, và vì sao vài quyết định trông lạ:
> [docs/TRANG_THAI.md](docs/TRANG_THAI.md). Đọc nó trước khi đề xuất thay đổi lớn.

## Repo này là gì

Ứng dụng web học từ vựng IELTS cho người Việt. Site tĩnh 100%, không có backend,
chạy trên GitHub Pages tại https://danthuyy.github.io/ielts/

Stack: Vite + TypeScript (strict) + React + React Router (hash) + Dexie
(IndexedDB) + Zod. Test bằng Vitest.

Yêu cầu **Node >= 22.18** — các script trong `scripts/` import thẳng
`src/content/schema.ts` và dựa vào khả năng strip type sẵn có của Node. Node cũ
hơn sẽ báo lỗi cú pháp khó hiểu.

## Việc bạn hay được giao nhất: thêm bài học

Đây gần như luôn là lý do người ta mở repo này ra. Đọc kỹ mục này.

### Quy tắc bất di bất dịch

Vi phạm những điều dưới đây sẽ **xoá tiến độ học của người dùng trên mọi thiết
bị**, không khôi phục được:

1. **Không bao giờ đổi `id` của bài học đã tồn tại.** Khoá tiến độ có dạng
   `<lessonId>:<word-slug>`. Đổi `id` là mọi bản ghi tiến độ của bài đó thành mồ
   côi và bị xoá ở lần mở app kế tiếp.
2. **Không đổi tên hay xoá trường `word` đã có.** Cùng lý do. Sửa `vi`, `ipa`,
   `example`, `collocation`, `note` thì thoải mái — chỉ `word` là khoá.
3. **Thêm từ mới, sắp xếp lại thứ tự, chèn vào giữa: hoàn toàn an toàn.** Khoá
   sinh từ nội dung chứ không theo vị trí, đây chính là lý do thiết kế như vậy.

Nếu người dùng thực sự muốn đổi `id` hoặc đổi tên một từ, hãy **nói rõ hậu quả
trước** rồi mới làm.

### Quy tắc về nội dung

4. **Không tự bịa từ vựng.** Nghĩa tiếng Việt, phiên âm IPA và ví dụ sai sẽ dạy
   người học sai — đây là tài liệu luyện thi thật. Chỉ nhập nội dung do người
   dùng cung cấp. Nếu buộc phải tự sinh, nói rõ đó là nội dung AI sinh và yêu
   cầu họ rà lại trước khi commit.
5. **IPA phải lấy từ từ điển thật** (Cambridge, Oxford, Longman), đặt trong hai
   dấu `/`, dùng chuẩn Anh-Anh cho khớp với nội dung sẵn có.
6. Từ trong cùng một bài phải **không trùng nhau**. Validator sẽ chặn nếu trùng.

### Cách 1 — người dùng đưa danh sách markdown (ưu tiên)

Đây là cách nhanh nhất và ít rủi ro nhất, vì không có bước gõ tay nào.

Định dạng markdown mà importer đọc được:

```markdown
## 1. Từ vựng về Tiền bạc

- **Vast (adj) /vɑːst/**: Khổng lồ, vô vàn.
  - _Collocation_: A vast fortune.
  - _Ví dụ_: If they won a vast fortune, they would be back to normal.
  - _Lưu ý_: Rất ăn điểm trong Writing Task 2.
- **Nutrition (n) /njuːˈtrɪʃ.ən/**: Dinh dưỡng.
```

Chỉ dòng đầu là bắt buộc. Ba mục con đều tuỳ chọn. Tiêu đề `##` và văn xuôi bị
bỏ qua, nên dán nguyên file ghi chú vào cũng được.

Lưu file vào `content/sources/`, rồi chạy:

```bash
npm run lesson:import -- --from content/sources/ten-file.md --id ten_bai_hoc --title "Tên Bài Học" --tags happiness,society
```

Thêm `--dry-run` để xem trước khi ghi. Importer **báo cáo mọi dòng nó không
hiểu** kèm số dòng — đọc kỹ phần đó, đừng bỏ qua. Nó cũng liệt kê từ nào còn
thiếu ví dụ hoặc collocation.

### Cách 2 — tạo khung rồi điền tay

```bash
npm run lesson:new -- --id ten_bai_hoc --title "Tên Bài Học" --tags money,work --words 20
```

Lệnh này tạo `content/lessons/ten_bai_hoc.json` với các từ mẫu `placeholder1`,
`placeholder2`... **Phải thay hết** bằng nội dung thật trước khi commit.

### Đặc tả file JSON

Một file cho một bài học, đặt tại `content/lessons/<id>.json`. Bài học được tự
động phát hiện bằng `import.meta.glob` — **không có file index nào cần đăng ký,
không cần sửa code**.

```json
{
  "id": "hello_happiness",
  "title": "Hello Happiness",
  "description": "Bài đọc về hạnh phúc và tiền bạc",
  "date": "2026-08-01",
  "tags": ["happiness", "society", "psychology"],
  "words": [
    {
      "word": "vast",
      "pos": "adj",
      "ipa": "/vɑːst/",
      "vi": "Khổng lồ, vô cùng lớn",
      "example": "If they won a vast fortune, they would be back to their previous level of happiness.",
      "collocation": "a vast fortune · vast majority · vast amount",
      "note": ""
    }
  ]
}
```

| Trường        | Bắt buộc | Ghi chú                                                                                   |
| ------------- | -------- | ----------------------------------------------------------------------------------------- |
| `id`          | Có       | Phải **trùng tên file**. Chỉ `a-z`, `0-9`, `_`. Không bao giờ đổi sau khi đã publish.     |
| `title`       | Có       | Tên hiển thị.                                                                             |
| `description` | Không    | Mặc định chuỗi rỗng.                                                                      |
| `date`        | Có       | `YYYY-MM-DD`. Quyết định thứ tự hiển thị, mới nhất lên trước.                             |
| `tags`        | Không    | Quyết định danh mục. Xem danh sách bên dưới. Tag lạ rơi vào nhóm "Khác".                  |
| `words`       | Có       | Ít nhất 1 từ.                                                                             |
| `word`        | Có       | Từ tiếng Anh. **Là khoá tiến độ.** Duy nhất trong bài.                                    |
| `pos`         | Có       | `n`, `v`, `adj`, `adv`, `phrasal v`, `phr`, `idiom`. Ghép hai loại bằng `/`, ví dụ `v/n`. |
| `ipa`         | Có       | Trong hai dấu `/`.                                                                        |
| `vi`          | Có       | Nghĩa tiếng Việt.                                                                         |
| `example`     | Không    | Bỏ trống thì giao diện ẩn hẳn ô này, không hiện hộp rỗng.                                 |
| `collocation` | Không    | Ngăn cách bằng `·`.                                                                       |
| `note`        | Không    | Mẹo dùng từ. Hiện ở mặt sau thẻ.                                                          |

Tag đã có sẵn danh mục: `happiness`, `society`, `psychology`, `education`,
`environment`, `technology`, `health`, `work`, `money`, `culture`, `travel`,
`media`, `crime`, `family`, `sport`, `food`.

Nguồn sự thật duy nhất về schema là [`src/content/schema.ts`](src/content/schema.ts).
Sửa quy tắc thì sửa ở đó — app, validator và CI đều dùng chung file này.

### Bắt buộc chạy trước khi commit

```bash
npm run validate:content
```

## Bản đồ repo

```
content/lessons/*.json   nội dung bài học, thứ duy nhất người soạn nội dung cần đụng
content/sources/*.md     file markdown gốc, đầu vào của lesson:import
scripts/                 CLI: validate-content, new-lesson, import-lesson
src/content/             schema.ts (Zod), lessons.ts (tự phát hiện file), categories.ts
src/lib/                 logic thuần, không phụ thuộc React
src/hooks/               hook dùng chung
src/components/          UI dùng lại
src/features/            mỗi màn hình một thư mục
src/styles/              design token + CSS toàn cục
tests/                   Vitest
docs/                    tài liệu cho người học
.github/                 workflow, issue template
```

Vài file cần cẩn thận đặc biệt, vì đụng sai là hỏng dữ liệu người dùng:

- `src/lib/ids.ts` — sinh khoá tiến độ và migration khoá cũ
- `src/lib/progress.ts` — mọi thao tác đọc/ghi tiến độ
- `src/lib/sync.ts` — đồng bộ Supabase, ghi đè theo thiết bị lưu sau cùng
- `src/content/schema.ts` — hợp đồng nội dung

## Lệnh

| Lệnh                       | Việc                                             |
| -------------------------- | ------------------------------------------------ |
| `npm run dev`              | Chạy máy chủ phát triển                          |
| `npm run build`            | Typecheck + validate nội dung + build production |
| `npm run typecheck`        | `tsc --noEmit`                                   |
| `npm run lint`             | ESLint                                           |
| `npm run format`           | Prettier ghi đè                                  |
| `npm run test`             | Vitest chạy một lượt                             |
| `npm run validate:content` | Kiểm tra mọi file trong content/lessons          |
| `npm run lesson:new`       | Tạo khung bài học mới                            |
| `npm run lesson:import`    | Chuyển markdown thành bài học                    |

Trước khi báo là xong, chạy đủ:

```bash
npm run validate:content && npm run typecheck && npm run lint && npm run format:check && npm run test
```

## Quy ước code

- TypeScript strict. **Không dùng `any`**, không dùng `@ts-ignore`. Cần thoát
  kiểu thì viết type guard.
- Không hard-code màu. Mọi màu phải là biến trong `src/styles/tokens.css`, vì
  ứng dụng có cả theme sáng và tối.
- Chữ nằm trên nền màu semantic (`--success`, `--danger`, `--warning`) phải dùng
  `--on-accent`; nền đặc có chữ trắng dùng `--primary-fill`. Đây không phải sở
  thích — dùng sai là rớt chuẩn tương phản WCAG AA ở một trong hai theme, và
  Lighthouse trong CI sẽ chặn.
- Chuỗi hiển thị cho người dùng viết bằng tiếng Việt. Comment trong code viết
  bằng tiếng Anh, và chỉ giải thích **tại sao**, không mô tả lại code.
- Commit theo Conventional Commits: `feat:`, `fix:`, `docs:`, `content:`,
  `chore:`, `ci:`, `test:`, `style:`.

## Vòng học trong các chế độ quiz

Điều quan trọng nhất về hành vi: **từ trả lời sai không được biến mất**.

- `src/hooks/useRetryQueue.ts` giữ hàng đợi. Trả lời sai thì từ đó được chèn lại
  vài vị trí sau, phiên chỉ kết thúc khi mọi từ đã đúng ít nhất một lần.
- Riêng chế độ điền từ và nghe viết còn giữ người học **ở lại chính từ đó** cho
  tới khi đúng, hoặc tới khi họ bấm "Bỏ qua". Sai không lộ đáp án.
- `markMissed()` ghi nhận một lần sai mà không đẩy hàng đợi — dùng cho vòng lặp
  ở trên. Điểm cuối phiên tính theo **lần thử đầu tiên**, không phải kết quả
  cuối, nếu không thì ai cũng được điểm tuyệt đối.
- Sai thì **không lộ đáp án**. `src/lib/diff.ts` so khớp từng ký tự giữa câu trả
  lời và đáp án rồi đánh dấu: đúng, sai, thừa, thiếu. Chữ thiếu hiện dấu `·`
  chứ không hiện chữ thật — nếu không thì sai vài lần là có nguyên đáp án.
- Gợi ý chỉ xuất hiện **sau khi đã thử ít nhất một lần**, và đi theo thang
  **nghĩa và ngữ cảnh trước, chữ cái sau** (`buildLadder` trong
  `src/lib/hints.ts`):

  1. Dạng từ: số ký tự + từ loại, **không lộ chữ cái nào**
  2. Nghĩa tiếng Việt — chỉ ở chế độ nghe viết, vì chế độ điền từ đã hiện sẵn
  3. Cụm hay đi kèm, **đã che chính từ đó**
  4. Câu ví dụ, **đã che chính từ đó**
  5. Lưu ý (nếu nội dung có)
  6. Phiên âm — chỉ ở chế độ điền từ, vì nghe viết đã nghe rồi
  7. Chữ cái, mở dần, và không bao giờ mở hết

  Thứ tự này là cố ý. Mở chữ cái trước là dạy nhớ mặt chữ; đưa câu ví dụ có chỗ
  trống là buộc người học truy xuất từ theo nghĩa — đúng như lúc đi thi. Nếu
  thêm nấc mới, giữ nguyên nguyên tắc đó.

- **Câu hỏi chỉ được hiện nghĩa và từ loại.** Không collocation, không câu ví
  dụ, không chữ cái đầu, không số ký tự — kể cả trong placeholder của ô nhập.
  Từng có lúc màn điền từ in collocation ngay trên ô nhập, mà collocation gần
  như luôn chứa chính từ đó (`a vast fortune` cho `vast`), cộng thêm placeholder
  `v _ _ _ (4 chữ cái)`: mỗi từ bắt đầu với hai nấc gợi ý đã mở sẵn, trong khi
  cả thang được dựng để chỉ mở sau khi sai. Những thứ đó là **nấc của thang**,
  không phải một phần của câu hỏi. Muốn thêm ngữ cảnh vào câu hỏi thì thêm nấc,
  đừng in thẳng ra màn hình.
- `src/lib/redact.ts` che từ khoá khỏi chính ví dụ và collocation của nó, bắt cả
  dạng biến thể (correlate/correlates/correlating) và gạch nối viết thành khoảng
  trắng. Nấc nào không có dữ liệu thì bị bỏ qua chứ không hiện rỗng.
- Dùng gợi ý thì từ đó xếp lịch như câu "Khó".

Nếu thêm chế độ luyện mới, dùng lại `useRetryQueue` thay vì tự đi qua mảng.

## Sticker và âm thanh

- Bộ sticker gốc nằm ở `output/stickers-zalo-be/` (512px). Bản dùng cho web ở
  `public/stickers/` **do `python scripts/build-stickers.py` sinh ra** — đừng
  sửa tay, sửa xong chạy lại là mất. Script cần Pillow (`pip install pillow`).
- Tên file đặt theo **vai trò** chứ không theo nội dung: `correct`, `wrong`,
  `perfect`, `sorry`, `cry`, `wow`, `love`, `remind`, `morning`, `night`. Đổi
  sticker cho một tình huống thì đổi ánh xạ `ROLES` trong script rồi chạy lại,
  không sửa code ứng dụng.
- Ảnh gốc là miếng cắt từ contact sheet nên **không có kênh alpha**, nền kem đặc.
  Script tách nền bằng flood-fill từ biên chứ không key màu toàn ảnh: viền trắng
  của nhân vật chỉ cách màu nền khoảng 23 đơn vị, key toàn ảnh sẽ ăn mất viền.
  Ngưỡng `SOLID`/`FRINGE` chừa đúng một pixel răng cưa mềm — nới rộng ra là có
  quầng kem quanh nhân vật trên theme tối.
- Luôn lấy đường dẫn qua `stickerUrl()` — nó ghép `import.meta.env.BASE_URL`,
  vì production chạy dưới `/ielts/` và đường dẫn tuyệt đối sẽ 404.
- `alt` của sticker là nội dung phản hồi thật, không phải trang trí, nên phải
  mô tả đúng.
- Âm thanh **tổng hợp bằng Web Audio** trong `src/lib/sfx.ts`, không dùng file
  mp3: không có asset để cache, không vướng bản quyền, vài trăm byte thay vì
  vài trăm kB. Giữ tiếng ngắn và nhẹ — nó phát sau _mỗi_ câu trả lời.
- Cả hai đều tắt được trong Cài đặt, và tôn trọng `prefers-reduced-motion`.

## Viết test

Test **không được giả định nội dung có hình dạng cụ thể**. Đừng viết
`lesson.words[3]` — thêm một bài học có ít từ hơn là vỡ, mà thêm bài học chính
là việc repo này sinh ra để làm. Suy ra từ nội dung thực tế:

```ts
const lesson = LESSONS[0]!;
const index = lesson.words.length - 1;
```

Schema bảo đảm mỗi bài có ít nhất một từ và validator bảo đảm có ít nhất một
bài, nên `LESSONS[0]` và `words[0]` thì an toàn.

Sau khi sửa nội dung hay schema, chạy `npm run test` để chắc không có test nào
bám cứng vào dữ liệu cũ.

## Những chỗ dễ vấp

- **Đừng chạy `npm run dev` rồi thử nghiệm mà không có `.env.local`.** Mặc định
  dev dùng chung hàng Supabase với production, nên mọi thao tác test sẽ ghi đè
  tiến độ thật của người dùng trên mọi thiết bị. Tạo `.env.local` với
  `VITE_SUPABASE_URL=` và `VITE_SUPABASE_ANON_KEY=` để tắt đồng bộ khi dev.
  Xem [docs/SYNC_SETUP.md](docs/SYNC_SETUP.md).
- **`base` khác nhau giữa dev và production.** Production build ra `/ielts/`.
  Đừng hard-code đường dẫn tuyệt đối trong code.
- **Routing bằng hash**, vì GitHub Pages chỉ phục vụ file tĩnh. URL kiểu cũ
  không có dấu `/` đầu được chuyển hướng trong `src/app/legacyHash.ts`.
- **Trên Windows, đừng chạy lệnh có tham số bắt đầu bằng `/` trong Git Bash.**
  MSYS sẽ biến `--base=/` thành `--base=C:/Program Files/Git/`. Dùng PowerShell.
- **Coverage thấp (~20%)** là do lớp component chưa có test, không phải do lib
  hỏng. Đừng viết test rỗng chỉ để nâng con số.

## Khi không chắc

Hỏi trước, đặc biệt với: đổi `id` bài học, đổi tên từ, đổi schema, hay bất cứ
thứ gì đụng vào `src/lib/progress.ts` và `src/lib/sync.ts`. Dữ liệu học tập ở
đây không có bản sao ngoài file người dùng tự sao lưu.
