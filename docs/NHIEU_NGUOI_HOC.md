# Thêm một người học (một repo riêng, chung một database)

Mỗi người học có **repo riêng + site riêng**, nhưng tất cả dùng **chung một
database Supabase** để bạn chỉ phải quản lý một nơi. Mỗi người là một **hàng
(row)** riêng trong bảng `sync_state`, phân biệt bằng một `rowId` (UUID) duy
nhất. Code y hệt nhau ở mọi repo — chỉ khác đúng một biến.

> Mức bảo mật: mỗi người một UUID ngẫu nhiên 122-bit, không đoán được. App chỉ
> đọc/ghi đúng hàng của nó. Đây **không** phải cô lập tuyệt đối: ai có key công
> khai **và** biết UUID thì đọc/ghi được hàng đó. Với vài người học từ vựng thì
> quá đủ; muốn chặn tuyệt đối thì phải thêm đăng nhập (một hạng mục lớn khác).

## Mỗi lần thêm một người — 4 bước

### 1. Sinh một UUID mới

```bash
node -e "console.log(crypto.randomUUID())"
```

Chép lại chuỗi in ra. Đây là `rowId` của người đó, dùng ở bước 2 và 3.

### 2. Cho DB biết UUID đó (chạy SQL một lần trên Supabase)

Vào **SQL Editor** của project Supabase trung tâm, thêm UUID mới vào danh sách
cho phép. Dán lại **cả ba** policy dưới đây (đã gồm sẵn UUID của bạn và của
pboiboi; thêm người mới thì chèn thêm một dòng UUID vào **cả ba**):

```sql
drop policy if exists "app row: read" on public.sync_state;
drop policy if exists "app row: insert" on public.sync_state;
drop policy if exists "app row: update" on public.sync_state;
drop policy if exists "app rows: read" on public.sync_state;
drop policy if exists "app rows: insert" on public.sync_state;
drop policy if exists "app rows: update" on public.sync_state;

-- Danh sách hàng được phép. Thêm người = thêm một dòng UUID vào cả ba mảng.
create policy "app rows: read" on public.sync_state
  for select to anon
  using (id = any (array[
    'a25f73c1-0c6d-4883-bf06-95c897efddb2',  -- bạn (danthuyy)
    '9cb0b949-d5d3-4fd4-9bfe-06d107c1f89a',  -- pboiboi
    '27038b58-d1e2-40ef-8453-00f257437020'   -- pdondong
  ]::uuid[]));

create policy "app rows: insert" on public.sync_state
  for insert to anon
  with check (id = any (array[
    'a25f73c1-0c6d-4883-bf06-95c897efddb2',
    '9cb0b949-d5d3-4fd4-9bfe-06d107c1f89a',
    '27038b58-d1e2-40ef-8453-00f257437020'
  ]::uuid[]));

create policy "app rows: update" on public.sync_state
  for update to anon
  using (id = any (array[
    'a25f73c1-0c6d-4883-bf06-95c897efddb2',
    '9cb0b949-d5d3-4fd4-9bfe-06d107c1f89a',
    '27038b58-d1e2-40ef-8453-00f257437020'
  ]::uuid[]))
  with check (id = any (array[
    'a25f73c1-0c6d-4883-bf06-95c897efddb2',
    '9cb0b949-d5d3-4fd4-9bfe-06d107c1f89a',
    '27038b58-d1e2-40ef-8453-00f257437020'
  ]::uuid[]));
```

> Quên bước này thì sync của người mới bị DB **từ chối lặng lẽ** (403) — app vẫn
> chạy, học vẫn lưu trên máy, nhưng không đồng bộ lên cloud.

### 3. Đặt hai biến cho repo của người đó

Trong repo của người đó trên GitHub: **Settings → Secrets and variables →
Actions → tab _Variables_ → New repository variable**. Tạo **hai** biến:

- `VITE_SYNC_ROW_ID` = UUID ở bước 1 (quyết định **tiến độ** riêng).
- `VITE_LEARNER` = tên định danh ngắn của người đó, ví dụ `pboiboi` (quyết định
  **bài học** riêng — xem mục "Bài học chung và riêng" bên dưới).

URL và key Supabase là mặc định sẵn trong code (dùng chung DB), **không cần** đặt
thêm. Workflow deploy tự đọc hai biến này khi build.

### 4. Bật GitHub Pages cho repo đó

**Settings → Pages → Source → chọn `GitHub Actions`** (không phải "Deploy from a
branch"). Nếu để "branch", site sẽ phục vụ mã nguồn thô và ra trang trắng — xem
[TRANG_THAI.md](TRANG_THAI.md), mục service worker và mục "site trắng".

Xong. Push code (hoặc bấm Actions → Deploy → Run) là site của người đó lên, với
tiến độ **và** bài học riêng.

## Bài học chung và bài học riêng

**Toàn bộ nội dung nằm ở một repo duy nhất** (repo gốc của bạn) — bạn soạn một
chỗ, không phải rải file qua từng repo. Mỗi bài học có trường tuỳ chọn `audience`
trong file JSON quyết định ai thấy nó:

```jsonc
{
  "id": "topic_space",
  "title": "Space Exploration",
  // audience trống hoặc không có → bài CHUNG, ai cũng thấy.
}
```

```jsonc
{
  "id": "pboiboi_tuan1",
  "title": "Từ của Bo tuần 1",
  "audience": ["pboiboi"], // bài RIÊNG: chỉ bản có VITE_LEARNER=pboiboi thấy.
}
```

- **Không có `audience`** (mặc định) → bài chung, mọi người thấy.
- **`"audience": ["pboiboi"]`** → chỉ repo đặt `VITE_LEARNER=pboiboi` thấy.
- **`"audience": ["pboiboi", "minh"]`** → chung cho vài người được nêu tên.
- **Bản admin của bạn** (`danthuyy`, không đặt `VITE_LEARNER`) → **thấy hết**, để
  bạn quản lý và xem trước mọi bài của mọi người từ một chỗ.

> Đây là "riêng" theo nghĩa **không hiện ở danh sách người khác**, không phải bí
> mật tuyệt đối: file JSON vẫn nằm trong repo. Với bài từ vựng thì đủ. `VITE_LEARNER`
> phải khớp đúng tên trong `audience` (phân biệt hoa thường).

## Cập nhật code/nội dung cho tất cả — một lệnh

Sửa xong ở repo gốc, đẩy tới **mọi** repo con bằng:

```bash
npm run push:all
```

Nó đẩy `main` tới `origin` và tới mọi remote trỏ về một repo `ielts`. Thêm người
mới = `git remote add <tên> <url>` một lần, từ đó `push:all` tự gồm luôn. Repo nào
push lỗi (lịch sử lệch) sẽ báo riêng, các repo còn lại vẫn chạy.

## Tạo repo cho người mới

```bash
# Repo mới đã tạo rỗng trên GitHub:
git remote add <tên-người> https://github.com/<tài-khoản>/ielts.git
git push <tên-người> main
```

Rồi làm 4 bước trên cho repo đó (nhớ đặt cả `VITE_LEARNER`). Từ lần sau chỉ cần
`npm run push:all`.

## Danh sách người học

| Người    | Repo             | VITE_LEARNER | VITE_SYNC_ROW_ID (UUID)                |
| -------- | ---------------- | ------------ | -------------------------------------- |
| Bạn      | `danthuyy/ielts` | _(để trống)_ | `a25f73c1-0c6d-4883-bf06-95c897efddb2` |
| pboiboi  | `pboiboi/ielts`  | `pboiboi`    | `9cb0b949-d5d3-4fd4-9bfe-06d107c1f89a` |
| pdondong | `pdondong/ielts` | `pdondong`   | `27038b58-d1e2-40ef-8453-00f257437020` |

Thêm người thì thêm một dòng ở đây, để bước 2 (SQL), việc đặt `audience`, và
`push:all` không bỏ sót ai.
