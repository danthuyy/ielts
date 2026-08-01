// Cấu hình đồng bộ.
//
// url + anonKey lấy từ Supabase (Project Settings → API Keys). anonKey là khoá
// "publishable" (tên cũ: "anon public") — công khai được, quyền của nó bị RLS
// giới hạn xuống đúng dòng rowId bên dưới. Tuyệt đối không dùng key
// "secret" / "service_role" ở đây.
//
// ROW_ID là danh tính của bạn — mọi thiết bị mở app này dùng chung nó,
// nên mở lên là tự đồng bộ, không cần nhập gì. Đừng đổi giá trị này,
// đổi là mất liên kết với dữ liệu đã lưu trên cloud.
export const SYNC_CONFIG = {
  url: 'https://nwbgobapbyuavwljygec.supabase.co',
  anonKey: 'sb_publishable_537EfMMlWgKHjIL3kEvslA_SwS063k6',
  table: 'sync_state',
  rowId: 'a25f73c1-0c6d-4883-bf06-95c897efddb2'
};

export function isSyncConfigured() {
  return Boolean(SYNC_CONFIG.url && SYNC_CONFIG.anonKey);
}
