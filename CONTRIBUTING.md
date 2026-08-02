# Hướng dẫn đóng góp

Phần lớn đóng góp cho repo này là **thêm bài học mới**. Bạn không cần biết React hay TypeScript để làm việc đó — chỉ cần thêm một file JSON vào `content/lessons/`.

## Thêm bài học mới

Có hai đường. Nếu bạn đã soạn sẵn danh sách từ dạng markdown (cách làm thường
gặp khi rút từ vựng từ một bài đọc), dùng **cách A** — nhanh hơn nhiều. Nếu bắt
đầu từ con số không, dùng **cách B**.

### Cách A — import từ file markdown

```bash
npm run lesson:import -- --from notes/happiness.md --id hello_happiness --title "Hello Happiness" --tags happiness,society
```

Markdown cần theo dạng dưới đây. Tiêu đề `##` và đoạn văn xuôi được bỏ qua, nên
bạn dán nguyên file ghi chú vào cũng được:

```markdown
## 1. Từ vựng về Tiền bạc

- **Vast (adj) /vɑːst/**: Khổng lồ, vô vàn.
  - _Collocation_: A vast fortune.
  - _Ví dụ_: If they won a vast fortune, they would be back to normal.
  - _Lưu ý_: Rất ăn điểm trong Writing Task 2.
- **Nutrition (n) /njuːˈtrɪʃ.ən/**: Dinh dưỡng.
```

Chỉ dòng đầu (`**Từ (loại) /ipa/**: nghĩa`) là bắt buộc; ba mục con đều tuỳ chọn.
Nhãn mục con chấp nhận cả `_Collocation_`, `_Ví dụ_` / `_Vi du_` / `_Example_`,
`_Lưu ý_` / `_Luu y_` / `_Note_`.

Thêm `--dry-run` để xem kết quả trước khi ghi file, `--force` để ghi đè bài đã có.

Lệnh này **báo cáo mọi dòng nó không hiểu** thay vì bỏ qua im lặng — một từ bị
mất khi import còn tệ hơn là lệnh chạy lỗi. Nó cũng liệt kê từ nào còn thiếu ví
dụ hay collocation để bạn bổ sung sau.

### Cách B — tạo khung rồi điền tay

#### 1. Tạo khung file bằng CLI

```bash
npm run lesson:new -- --id hello_happiness --title "Hello Happiness"
```

Lệnh này tạo `content/lessons/hello_happiness.json` với sẵn khung nội dung.

#### 2. Sửa file JSON

Mở `content/lessons/hello_happiness.json` và điền nội dung:

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
      "collocation": "a vast fortune · vast majority · vast amount"
    }
  ]
}
```

#### 3. Kiểm tra nội dung

```bash
npm run validate:content
```

#### 4. Xem thử trong ứng dụng

```bash
npm run dev
```

Bài học mới xuất hiện ngay trong danh sách — nó được tự động phát hiện từ thư mục, không có file index nào phải đăng ký.

#### 5. Commit và push

```bash
git add content/lessons/hello_happiness.json
```

```bash
git commit -m "content: thêm bài học Hello Happiness"
```

```bash
git push
```

## Đặc tả file JSON

File nằm ở `content/lessons/<id>.json`.

### Cấp bài học

| Trường        | Kiểu     | Bắt buộc | Mô tả                                                                                                    |
| ------------- | -------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `id`          | string   | Có       | Slug chữ thường, phải trùng tên file (không tính `.json`). Xem quy tắc bên dưới.                         |
| `title`       | string   | Có       | Tên bài học hiển thị trong UI.                                                                           |
| `description` | string   | Không    | Mô tả ngắn bằng tiếng Việt. Bỏ trống thì mặc định là chuỗi rỗng.                                         |
| `date`        | string   | Có       | Ngày theo định dạng ISO `YYYY-MM-DD`.                                                                    |
| `tags`        | string[] | Không    | Chủ đề của bài học; quyết định danh mục hiển thị trong UI. Mặc định là danh sách rỗng (danh mục "Khác"). |
| `words`       | object[] | Có       | Danh sách từ vựng, xem bảng dưới.                                                                        |

### Cấp từ vựng (`words[]`)

| Trường        | Kiểu   | Bắt buộc | Mô tả                                                                                                                                     |
| ------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `word`        | string | Có       | Từ tiếng Anh. **Phải là duy nhất trong cùng một bài học.**                                                                                |
| `pos`         | string | Có       | Từ loại. Một trong: `n`, `v`, `adj`, `adv`, `phrasal v`, `phr`, `idiom`. Ghép hai loại bằng `/` nếu từ đó thật sự là cả hai, ví dụ `v/n`. |
| `ipa`         | string | Có       | Phiên âm IPA, đặt trong hai dấu `/`.                                                                                                      |
| `vi`          | string | Có       | Nghĩa tiếng Việt.                                                                                                                         |
| `example`     | string | Không    | Câu ví dụ tiếng Anh chứa từ đó. Bỏ trống thì ứng dụng ẩn hẳn ô này.                                                                       |
| `collocation` | string | Không    | Các cụm đi kèm, ngăn cách bằng `·`. Bỏ trống thì ẩn ô.                                                                                    |
| `note`        | string | Không    | Mẹo dùng từ: khi nào nên dùng, sắc thái, lỗi hay gặp. Hiện ở mặt sau thẻ.                                                                 |

`example`, `collocation` và `note` để trống được. Không phải từ nào cũng có
collocation tự nhiên, và ép tác giả bịa ra chỉ làm hỏng nội dung.

## Quy tắc đặt `id`

- Chỉ dùng chữ thường, số và dấu gạch dưới: `a-z`, `0-9`, `_`.
- `id` **phải trùng tên file**: `id: "hello_happiness"` → `content/lessons/hello_happiness.json`.
- **Không bao giờ đổi `id` sau khi đã publish.** `id` là một phần của khóa lưu tiến độ của mọi người học; đổi `id` đồng nghĩa với việc xóa sạch tiến độ của họ ở bài học đó.

### Tiến độ và việc sửa từ

Khóa tiến độ có dạng `<lessonId>:<word-slug>`. Vì khóa dựa trên nội dung từ chứ không dựa trên vị trí:

- **An toàn:** chèn thêm từ mới, sắp xếp lại thứ tự các từ, sửa `ipa`, `vi`, `example`, `collocation`, `title`, `description`, `date`, `tags`.
- **Mất tiến độ:** đổi tên hoặc xóa một `word`. Tiến độ gắn với từ cũ trở thành mồ côi — người học sẽ bắt đầu lại từ đầu với từ mới. Nếu chỉ sửa lỗi chính tả của một từ, hãy cân nhắc rằng bạn đang đánh đổi tiến độ đã có.

## Quy ước `tags`

`tags` quyết định danh mục chủ đề hiển thị trong UI. Các tag đã biết:

```
happiness  society   psychology  education
environment technology health    work
money      culture   travel      media
crime      family    sport       food
```

Tag không nằm trong danh sách trên sẽ rơi vào danh mục **"Khác"**. Điều này không gây lỗi, nhưng nếu bạn thấy mình cần một tag mới thường xuyên, hãy mở issue để bổ sung vào `src/content/categories.ts`.

## Kiểm tra trước khi commit

```bash
npm run validate:content
```

```bash
npm run lint
```

```bash
npm run test
```

Nếu bạn có sửa code (không chỉ JSON), chạy thêm:

```bash
npm run build
```

CI (`ci.yml`) chạy đúng những bước này, nên chạy trước ở máy sẽ tiết kiệm thời gian.

## Quy ước commit message

Dùng [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix     | Dùng khi                                  |
| ---------- | ----------------------------------------- |
| `content:` | Thêm/sửa bài học trong `content/lessons/` |
| `feat:`    | Thêm tính năng mới                        |
| `fix:`     | Sửa lỗi                                   |
| `docs:`    | Sửa tài liệu                              |
| `chore:`   | Cấu hình, dependency, việc lặt vặt        |

Ví dụ:

```
content: thêm bài học Hello Happiness
fix: sửa lịch ôn SM-2 khi đánh giá lại trong ngày
docs: bổ sung quy ước tags
```

## Quy trình PR

1. Fork repo và tạo nhánh từ `main`: `git checkout -b content/hello-happiness`.
2. Commit thay đổi theo quy ước ở trên.
3. Chạy checklist kiểm tra trước khi commit.
4. Mở PR vào `main`, mô tả ngắn gọn bạn thêm/sửa gì. Nếu thêm bài học, ghi rõ số từ và chủ đề.
5. Chờ `ci.yml` xanh. PR có CI đỏ sẽ không được merge.

Push lên `main` sẽ tự động deploy lên GitHub Pages, nên hãy giữ `main` luôn ở trạng thái chạy được.

## Phát triển code

Dành cho người sửa source, không chỉ nội dung.

### Kiến trúc thư mục

- `src/app/` — router (HashRouter), providers, khung ứng dụng.
- `src/components/` — UI dùng lại, không chứa logic nghiệp vụ.
- `src/features/<screen>/` — mỗi màn hình một thư mục, tự chứa. Logic riêng của màn hình nằm ở đây, không đẩy lên `src/lib/`.
- `src/lib/` — logic dùng chung, không phụ thuộc React: `db.ts` (khai báo Dexie), `progress.ts` (mọi thao tác đọc/ghi tiến độ), `srs.ts` (SM-2), `ids.ts` (khóa tiến độ + migration khóa cũ), `tts.ts`, `sync.ts` (Supabase), `settings.ts`, `config.ts`, `utils.ts`.
- `src/hooks/` — hook dùng chung: `useKeyboard` (phím tắt), `useSwipe` (cử chỉ chạm), `useSettings`, `useSyncState`.
- `src/content/` — `schema.ts` là nguồn sự thật duy nhất cho định dạng bài học (Zod); `lessons.ts` nạp file JSON qua `import.meta.glob`; `categories.ts` ánh xạ tag → danh mục.

Đổi định dạng bài học thì sửa `src/content/schema.ts` — `scripts/validate-content.mjs` và ứng dụng dùng chung schema đó.

### Chạy test

```bash
npm run test:watch
```

Test nằm ở `tests/`, dùng Vitest + Testing Library (IndexedDB được giả lập bằng `fake-indexeddb`). Logic thuần (SRS, khóa tiến độ, utils) phải có unit test; component test cho hành vi người dùng, không test chi tiết triển khai.

### TypeScript

- Bật `strict`. Không dùng `any` — dùng `unknown` rồi thu hẹp kiểu, hoặc khai báo kiểu cho đúng.
- Không dùng `@ts-ignore`; nếu bắt buộc thì dùng `@ts-expect-error` kèm lời giải thích.
- Kiểu của nội dung bài học suy ra từ Zod schema (`z.infer`), đừng viết tay interface song song.

Chạy `npm run typecheck` và `npm run lint` trước khi mở PR.
