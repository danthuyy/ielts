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
    '9cb0b949-d5d3-4fd4-9bfe-06d107c1f89a'   -- pboiboi
  ]::uuid[]));

create policy "app rows: insert" on public.sync_state
  for insert to anon
  with check (id = any (array[
    'a25f73c1-0c6d-4883-bf06-95c897efddb2',
    '9cb0b949-d5d3-4fd4-9bfe-06d107c1f89a'
  ]::uuid[]));

create policy "app rows: update" on public.sync_state
  for update to anon
  using (id = any (array[
    'a25f73c1-0c6d-4883-bf06-95c897efddb2',
    '9cb0b949-d5d3-4fd4-9bfe-06d107c1f89a'
  ]::uuid[]))
  with check (id = any (array[
    'a25f73c1-0c6d-4883-bf06-95c897efddb2',
    '9cb0b949-d5d3-4fd4-9bfe-06d107c1f89a'
  ]::uuid[]));
```

> Quên bước này thì sync của người mới bị DB **từ chối lặng lẽ** (403) — app vẫn
> chạy, học vẫn lưu trên máy, nhưng không đồng bộ lên cloud.

### 3. Đặt UUID cho repo của người đó

Trong repo của người đó trên GitHub: **Settings → Secrets and variables →
Actions → tab _Variables_ → New repository variable**:

- Name: `VITE_SYNC_ROW_ID`
- Value: UUID ở bước 1

Chỉ vậy. URL và key của Supabase là mặc định sẵn trong code (dùng chung DB), nên
**không cần** đặt gì thêm. Workflow deploy tự đọc biến này khi build.

### 4. Bật GitHub Pages cho repo đó

**Settings → Pages → Source → chọn `GitHub Actions`** (không phải "Deploy from a
branch"). Nếu để "branch", site sẽ phục vụ mã nguồn thô và ra trang trắng — xem
[TRANG_THAI.md](TRANG_THAI.md), mục service worker và mục "site trắng".

Xong. Push code (hoặc bấm Actions → Deploy → Run) là site của người đó lên, với
tiến độ hoàn toàn riêng.

## Tạo repo cho người mới

Cách nhanh nhất là dùng lại toàn bộ code repo gốc:

```bash
# Trong thư mục repo gốc, đẩy sang repo mới (đã tạo rỗng trên GitHub):
git remote add <tên-người> https://github.com/<tài-khoản>/ielts.git
git push <tên-người> main
```

Sau đó làm 4 bước trên cho repo mới. Khi bạn muốn cập nhật code cho mọi người,
push `main` sang từng remote một lần nữa:

```bash
git push pboiboi main
git push <người-khác> main
```

> Đây là điểm phải nhớ của mô hình "repo riêng": mỗi lần sửa code (ví dụ vá lỗi)
> bạn phải `git push` sang từng repo. Danh sách người học ở cuối file này để khỏi
> sót ai.

## Danh sách người học

| Người   | Repo             | rowId (UUID)                           |
| ------- | ---------------- | -------------------------------------- |
| Bạn     | `danthuyy/ielts` | `a25f73c1-0c6d-4883-bf06-95c897efddb2` |
| pboiboi | `pboiboi/ielts`  | `9cb0b949-d5d3-4fd4-9bfe-06d107c1f89a` |

Thêm người thì thêm một dòng ở đây, để bước 2 (SQL) và các lần `git push` không
bỏ sót.
