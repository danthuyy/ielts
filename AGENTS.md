# Hướng dẫn cho AI agent

Tài liệu này dành cho trợ lý AI làm việc trên repo. Đọc hết trước khi sửa bất cứ
thứ gì. Con người thì đọc [README.md](README.md) và [CONTRIBUTING.md](CONTRIBUTING.md).

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
- Gợi ý chỉ xuất hiện **sau khi đã thử ít nhất một lần**, và **leo dần**:
  lần sai thứ 2 mới cho hình dạng + số ký tự, thứ 3 mới cho chữ đầu, rồi mới mở
  thêm chữ. Xem `effectiveLevel` trong `src/lib/hints.ts`. Rung đầu tiên cố ý
  **không lộ chữ cái nào** — đưa luôn một phần ba từ thì không phải gợi ý, mà là
  trả lời hộ theo từng đợt.
- Dùng gợi ý thì từ đó xếp lịch như câu "Khó".

Nếu thêm chế độ luyện mới, dùng lại `useRetryQueue` thay vì tự đi qua mảng.

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
