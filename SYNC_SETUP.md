# Bật đồng bộ giữa các thiết bị

> **Đã cấu hình xong** (project `nwbgobapbyuavwljygec`). Tài liệu này giữ lại để
> dựng lại từ đầu nếu cần đổi project.

Mất khoảng 5 phút, làm một lần duy nhất. Sau đó mọi máy mở app là tự đồng bộ,
không cần đăng nhập, không cần nhập mã.

## 1. Tạo project Supabase

1. Vào https://supabase.com → đăng ký / đăng nhập → **New project**.
2. Đặt tên bất kỳ, chọn region gần Việt Nam (Singapore), đợi ~2 phút.

## 2. Tạo bảng lưu dữ liệu

Vào **SQL Editor** → dán toàn bộ đoạn dưới → **Run**:

```sql
create table if not exists public.sync_state (
  id uuid primary key,
  data jsonb not null,
  updated_at text not null
);

alter table public.sync_state enable row level security;

grant select, insert, update on public.sync_state to anon;

-- Chỉ cho phép đọc/ghi đúng một dòng của app này, không đụng được gì khác.
create policy "app row: read" on public.sync_state
  for select to anon
  using (id = 'a25f73c1-0c6d-4883-bf06-95c897efddb2');

create policy "app row: insert" on public.sync_state
  for insert to anon
  with check (id = 'a25f73c1-0c6d-4883-bf06-95c897efddb2');

create policy "app row: update" on public.sync_state
  for update to anon
  using (id = 'a25f73c1-0c6d-4883-bf06-95c897efddb2')
  with check (id = 'a25f73c1-0c6d-4883-bf06-95c897efddb2');
```

Nếu sau này bạn đổi `rowId` trong `js/config.js`, phải sửa cả 4 chỗ UUID ở trên
cho khớp.

## 3. Lấy khoá và điền vào app

Vào **Project Settings → API Keys**, copy hai giá trị:

- **Project URL** → điền vào `url`
- key **publishable** (`sb_publishable_...`, tên cũ là "anon public") → điền vào
  `anonKey`

Không dùng key **secret** / **service_role** — key đó bỏ qua toàn bộ RLS, để lộ
trong web công khai là mất sạch quyền kiểm soát database.

Mở [js/config.js](js/config.js) và điền:

```js
export const SYNC_CONFIG = {
  url: 'https://xxxxxxxx.supabase.co',
  anonKey: 'eyJhbGci...',
  table: 'sync_state',
  rowId: 'a25f73c1-0c6d-4883-bf06-95c897efddb2'
};
```

Commit và push. Xong — vào **Cài đặt** trong app sẽ thấy "Đã đồng bộ".

## Cách hoạt động

- **Mở app** → kéo dữ liệu từ cloud về nếu bản trên cloud mới hơn.
- **Học xong một từ** → tự đẩy lên sau 2 giây, không cần bấm gì.
- **Quay lại tab / có mạng trở lại** → đồng bộ lại.
- **Mất mạng** → vẫn học bình thường, dữ liệu nằm ở máy, có mạng là đẩy lên.
- Bên nào sửa sau thì bên đó thắng. Vì chỉ một người dùng nên không có xung đột
  thật sự, trừ khi bạn học song song trên hai máy cùng lúc — lúc đó máy lưu sau
  sẽ ghi đè.

## Về bảo mật

`anonKey` và `rowId` nằm trong mã nguồn công khai trên GitHub Pages, nên về lý
thuyết người nào đọc source cũng có thể sửa tiến độ học của bạn. Các policy ở
trên giới hạn quyền đó xuống đúng một dòng dữ liệu — không đọc được gì khác,
không tạo được dòng mới. Với dữ liệu học từ vựng thì đây là đánh đổi hợp lý để
không phải đăng nhập. Nếu sau này muốn chặt hơn, thay bằng đăng nhập email
(Supabase Auth) và đổi policy sang `auth.uid()`.
