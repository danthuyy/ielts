// Cấu hình đồng bộ.
//
// Điền 2 giá trị lấy từ Supabase (Project Settings → API):
//   url     : Project URL, ví dụ https://abcdefgh.supabase.co
//   anonKey : khoá "anon public"
//
// ROW_ID là danh tính của bạn — mọi thiết bị mở app này dùng chung nó,
// nên mở lên là tự đồng bộ, không cần nhập gì. Đừng đổi giá trị này,
// đổi là mất liên kết với dữ liệu đã lưu trên cloud.
export const SYNC_CONFIG = {
  url: '',
  anonKey: '',
  table: 'sync_state',
  rowId: 'a25f73c1-0c6d-4883-bf06-95c897efddb2'
};

export function isSyncConfigured() {
  return Boolean(SYNC_CONFIG.url && SYNC_CONFIG.anonKey);
}
