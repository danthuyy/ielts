# Thêm từ vựng — bài CHUNG và bài RIÊNG

Tài liệu này trả lời đúng một câu hỏi: **làm sao thêm từ vựng, và làm sao quyết
định ai thấy bài đó.**

Mọi nội dung nằm ở **một repo gốc duy nhất** (`danthuyy/ielts`). Bạn soạn một
chỗ, rồi đẩy sang các repo con bằng `npm run push:all`. Không rải file qua từng
repo.

---

## 1. Chung hay riêng — chỉ một dòng quyết định

Mỗi bài học là một file `content/lessons/<tên>.json`. Trong đó có **một trường
duy nhất** quyết định ai thấy: `audience`.

| Bạn viết trong file                             | Ai thấy bài này                     |
| ----------------------------------------------- | ----------------------------------- |
| **không có** `audience` (hoặc `"audience": []`) | **BÀI CHUNG** — mọi người           |
| `"audience": ["pboiboi"]`                       | **BÀI RIÊNG** — chỉ Bo (pboiboi)    |
| `"audience": ["pboiboi", "pdondong"]`           | Chỉ Bo và pdondong                  |
| _(bản admin của bạn — `danthuyy`)_              | **Thấy hết**, mọi bài của mọi người |

`audience` khớp với biến `VITE_LEARNER` của từng repo con (xem
[NHIEU_NGUOI_HOC.md](NHIEU_NGUOI_HOC.md)). Tên phải **viết y hệt**, phân biệt hoa
thường: `pboiboi` ≠ `Pboiboi`.

> "Riêng" ở đây nghĩa là **không hiện trong danh sách của người khác** — đủ để
> mỗi bé chỉ thấy bài của mình. Không phải bí mật tuyệt đối (file vẫn nằm trong
> repo). Với từ vựng thì vậy là đủ.

---

## 2. Thêm một bài — hai cách

### Cách A (khuyên dùng): dán danh sách markdown, để máy tạo file

Soạn một file markdown theo mẫu này, lưu vào `content/sources/`:

```markdown
## Chủ đề gì cũng được (dòng này bị bỏ qua)

- **Vast (adj) /vɑːst/**: Khổng lồ, vô cùng lớn.
  - _Collocation_: a vast fortune.
  - _Ví dụ_: If they won a vast fortune, they would be back to normal.
  - _Lưu ý_: Rất ăn điểm trong Writing Task 2.
- **Nutrition (n) /njuːˈtrɪʃ.ən/**: Dinh dưỡng.
```

Chỉ **dòng đầu mỗi từ là bắt buộc** (`- **Từ (loại) /phiên âm/**: nghĩa.`). Ba
mục con (_Collocation_, _Ví dụ_, _Lưu ý_) đều tuỳ chọn.

Rồi chạy:

```bash
npm run lesson:import -- --from content/sources/ten-file.md --id ten_bai --title "Tên Bài" --tags money,work
```

Nó tạo `content/lessons/ten_bai.json`. Importer **báo mọi dòng nó không hiểu**
kèm số dòng — đọc kỹ, đừng bỏ qua.

### Cách B: viết thẳng file JSON

Tạo `content/lessons/ten_bai.json`:

```json
{
  "id": "ten_bai",
  "title": "Tên Bài",
  "date": "2026-08-10",
  "tags": ["money"],
  "words": [
    {
      "word": "vast",
      "pos": "adj",
      "ipa": "/vɑːst/",
      "vi": "Khổng lồ, vô cùng lớn"
    }
  ]
}
```

`word`, `pos`, `ipa`, `vi` là bắt buộc. `example`, `collocation`, `synonyms`,
`forms`, `note` tuỳ chọn. Đặc tả đầy đủ ở [AGENTS.md](../AGENTS.md).

---

## 3. Biến bài đó thành RIÊNG (nếu muốn)

Dù tạo bằng cách A hay B, **mở file JSON vừa tạo** và thêm một dòng `audience`
ngay dưới `tags` (importer không tự thêm — bạn tự thêm):

```json
{
  "id": "bo_tuan1",
  "title": "Từ của Bo tuần 1",
  "date": "2026-08-10",
  "tags": ["money"],
  "audience": ["pboiboi"],
  "words": [ ... ]
}
```

- Muốn **bài chung**: **không** thêm `audience`. Xong.
- Muốn **bài riêng của Bo**: `"audience": ["pboiboi"]`.
- Muốn **riêng cho pdondong**: `"audience": ["pdondong"]`.

---

## 4. Bắt buộc: kiểm tra rồi mới đẩy

```bash
npm run validate:content   # bắt lỗi bài học sai trước khi lên site
npm run build:audio        # tải giọng đọc cho các từ MỚI (bắt buộc)
npm run push:all           # đẩy sang MỌI repo con trong một lệnh
```

**Đừng bỏ `build:audio`.** App phát âm bằng file tiếng nhúng sẵn trong
`public/audio/`, vì có máy (máy tính bảng Android rẻ) vừa không đọc được bằng
giọng máy, vừa treo mọi nguồn tiếng qua mạng. Từ nào chưa có file thì trên
những máy đó sẽ **không có tiếng**. Lệnh này chỉ tải phần còn thiếu, file cũ
giữ nguyên, nên chạy lại lúc nào cũng an toàn.

`push:all` đẩy `main` tới `origin` và mọi repo `ielts` khác. Mỗi repo con tự
build lại và chỉ hiện bài chung + bài của chính nó.

---

## 5. BA điều tuyệt đối tránh (sẽ **xoá tiến độ học** của người dùng)

Khoá tiến độ có dạng `<id-bài>:<từ>`. Nên:

1. **Không đổi `id` của bài đã có.** Đổi là mọi tiến độ của bài đó mồ côi và bị
   xoá ở lần mở app kế tiếp.
2. **Không đổi chính tả hay xoá trường `word` đã có.** Cùng lý do. Sửa `vi`,
   `ipa`, `example`... thì thoải mái — chỉ `word` và `id` là khoá.
3. **`id` phải trùng tên file** (`content/lessons/ten_bai.json` → `"id": "ten_bai"`).

Thêm từ mới, chèn vào giữa, sắp xếp lại: **hoàn toàn an toàn**. Đó là lý do thiết
kế khoá theo nội dung chứ không theo vị trí.

---

## 6. Ai thấy gì — ví dụ cụ thể

Giả sử bạn có 3 file:

| File               | `audience`     | danthuyy (bạn) thấy | pboiboi thấy | pdondong thấy |
| ------------------ | -------------- | :-----------------: | :----------: | :-----------: |
| `topic_money.json` | _(không có)_   |         ✅          |      ✅      |      ✅       |
| `bo_tuan1.json`    | `["pboiboi"]`  |         ✅          |      ✅      |      ❌       |
| `don_tuan1.json`   | `["pdondong"]` |         ✅          |      ❌      |      ✅       |

Từ vựng của bài riêng cũng **không lọt** vào làm đáp án nhiễu ở quiz của người
khác — mỗi bé chỉ gặp từ trong bài mình thấy.

---

## 7. Thêm một bé mới hoàn toàn

Xem [NHIEU_NGUOI_HOC.md](NHIEU_NGUOI_HOC.md): sinh UUID → thêm vào RLS → tạo repo
→ đặt biến `VITE_SYNC_ROW_ID` và `VITE_LEARNER` → bật Pages. Rồi đặt `audience`
của bài riêng theo đúng tên `VITE_LEARNER` của bé đó.
