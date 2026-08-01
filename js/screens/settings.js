import { Router } from '../router.js';
import { Store } from '../store.js';
import { BottomNav } from '../components/bottom-nav.js';
import { Sync } from '../sync.js';
import { isSyncConfigured } from '../config.js';

let unsubscribeStatus = null;

const STATUS_TEXT = {
  idle: ['Chờ đồng bộ', 'var(--text-secondary)'],
  syncing: ['Đang đồng bộ...', 'var(--warning)'],
  ok: ['Đã đồng bộ', 'var(--success)'],
  offline: ['Không có mạng', 'var(--warning)'],
  error: ['Lỗi đồng bộ', 'var(--error)'],
  disabled: ['Chưa bật đồng bộ', 'var(--text-secondary)']
};

function formatStamp(iso) {
  if (!iso) return 'chưa lần nào';
  const d = new Date(iso);
  if (isNaN(d)) return 'chưa lần nào';
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ngày ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export async function render(container) {
  const goal = Store.getSetting('dailyGoal', 10);
  const autoSpeak = Store.getSetting('autoSpeak', true);
  const speechRate = Store.getSetting('speechRate', 1.0);

  container.innerHTML = `
    <div class="screen-settings" style="padding: 20px; padding-bottom: 80px; height: 100%; box-sizing: border-box; overflow-y: auto; background: var(--bg);">
      <h1 style="margin: 0 0 24px 0; font-size: 24px;">Cài đặt</h1>

      <div style="background: var(--card); border-radius: 16px; padding: 0 16px; margin-bottom: 24px;">
        
        <div style="padding: 16px 0; border-bottom: 1px solid var(--surface); display: flex; justify-content: space-between; align-items: center; cursor: pointer;" id="btn-bookmarks">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 20px;">⭐</span>
            <span style="font-size: 16px; color: var(--text-primary);">Từ đã lưu</span>
          </div>
          <span style="color: var(--text-secondary);">→</span>
        </div>

        <div style="padding: 16px 0; border-bottom: 1px solid var(--surface);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span style="font-size: 16px; color: var(--text-primary);">Mục tiêu hàng ngày</span>
            <span style="color: var(--primary); font-weight: bold;" id="goal-val">${goal} từ</span>
          </div>
          <input type="range" id="goal-slider" min="5" max="30" step="5" value="${goal}" style="width: 100%;">
        </div>

        <div style="padding: 16px 0; border-bottom: 1px solid var(--surface); display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 16px; color: var(--text-primary);">Tự động phát âm</span>
          <label style="position: relative; display: inline-block; width: 48px; height: 24px;">
            <input type="checkbox" id="auto-speak-toggle" ${autoSpeak ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
            <span class="slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${autoSpeak ? 'var(--primary)' : 'var(--surface)'}; transition: .4s; border-radius: 24px;"></span>
          </label>
        </div>

        <div style="padding: 16px 0;">
          <div style="margin-bottom: 12px; font-size: 16px; color: var(--text-primary);">Tốc độ đọc</div>
          <div style="display: flex; gap: 8px;">
            <button class="rate-btn" data-val="0.7" style="flex: 1; padding: 8px; border-radius: 8px; background: ${speechRate === 0.7 ? 'var(--primary)' : 'var(--surface)'}; color: ${speechRate === 0.7 ? 'white' : 'var(--text-primary)'}; border: none; cursor: pointer;">Chậm</button>
            <button class="rate-btn" data-val="0.85" style="flex: 1; padding: 8px; border-radius: 8px; background: ${speechRate === 0.85 ? 'var(--primary)' : 'var(--surface)'}; color: ${speechRate === 0.85 ? 'white' : 'var(--text-primary)'}; border: none; cursor: pointer;">Vừa</button>
            <button class="rate-btn" data-val="1.0" style="flex: 1; padding: 8px; border-radius: 8px; background: ${speechRate === 1.0 ? 'var(--primary)' : 'var(--surface)'}; color: ${speechRate === 1.0 ? 'white' : 'var(--text-primary)'}; border: none; cursor: pointer;">Thường</button>
          </div>
        </div>

      </div>

      <div style="background: var(--card); border-radius: 16px; padding: 16px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 20px;">☁️</span>
            <span style="font-size: 16px; color: var(--text-primary);">Đồng bộ</span>
          </div>
          <span id="sync-status" style="font-size: 14px; font-weight: 600;"></span>
        </div>
        <p id="sync-detail" style="margin: 0 0 12px 44px; font-size: 13px; color: var(--text-secondary);"></p>
        <button id="btn-sync-now" style="width: 100%; padding: 12px; border-radius: 10px; background: var(--surface); color: var(--text-primary); border: none; font-size: 15px; cursor: pointer;">
          Đồng bộ ngay
        </button>
      </div>

      <button id="btn-reset" style="width: 100%; padding: 16px; border-radius: 12px; background: var(--card); color: var(--error); border: 1px solid var(--error); font-size: 16px; font-weight: bold; cursor: pointer; margin-bottom: 24px;">
        Xóa tất cả tiến trình
      </button>

      <div style="text-align: center; color: var(--text-secondary); font-size: 14px;">
        <p style="margin: 4px 0;">IELTS Vocab Trainer v1.0.0</p>
        <p style="margin: 4px 0;">Made with ❤️ for IELTS learners</p>
      </div>

      <div id="nav-container"></div>
    </div>
  `;

  if (BottomNav && typeof BottomNav.render === 'function') {
    container.querySelector('#nav-container').innerHTML = BottomNav.render('settings');
  }

  container.querySelector('#btn-bookmarks').addEventListener('click', () => {
    Router.navigate('bookmarks');
  });

  const goalSlider = container.querySelector('#goal-slider');
  const goalVal = container.querySelector('#goal-val');
  goalSlider.addEventListener('input', (e) => {
    goalVal.textContent = `${e.target.value} từ`;
    Store.setSetting('dailyGoal', parseInt(e.target.value));
  });

  const autoSpeakToggle = container.querySelector('#auto-speak-toggle');
  autoSpeakToggle.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    e.target.nextElementSibling.style.backgroundColor = isChecked ? 'var(--primary)' : 'var(--surface)';
    Store.setSetting('autoSpeak', isChecked);
  });

  container.querySelectorAll('.rate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseFloat(btn.dataset.val);
      Store.setSetting('speechRate', val);
      
      // Update UI
      container.querySelectorAll('.rate-btn').forEach(b => {
        b.style.background = 'var(--surface)';
        b.style.color = 'var(--text-primary)';
      });
      btn.style.background = 'var(--primary)';
      btn.style.color = 'white';
    });
  });

  const statusEl = container.querySelector('#sync-status');
  const detailEl = container.querySelector('#sync-detail');
  const syncBtn = container.querySelector('#btn-sync-now');

  function paintStatus(status, message) {
    const [label, color] = STATUS_TEXT[status] || STATUS_TEXT.idle;
    statusEl.textContent = label;
    statusEl.style.color = color;
    if (!isSyncConfigured()) {
      detailEl.textContent = 'Điền Supabase URL và anon key trong js/config.js để bật.';
    } else if (status === 'error') {
      detailEl.textContent = message;
    } else {
      detailEl.textContent = `Lần cuối: ${formatStamp(Sync.lastSyncedAt())}`;
    }
  }

  paintStatus(Sync.status, Sync.message);
  unsubscribeStatus = Sync.onStatus(paintStatus);

  syncBtn.disabled = !isSyncConfigured();
  syncBtn.style.opacity = isSyncConfigured() ? '1' : '0.5';
  syncBtn.addEventListener('click', () => Sync.reconcile());

  container.querySelector('#btn-reset').addEventListener('click', async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa tất cả tiến trình học tập? Hành động này không thể hoàn tác và sẽ xóa trên mọi thiết bị.')) {
      return;
    }
    // Wipe IndexedDB too — clearing localStorage alone left every word's
    // progress behind.
    await Store.importAll({ settings: {}, wordProgress: [], testHistory: [], dailyActivity: [] });
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ielts_')) localStorage.removeItem(key);
    }
    await Sync.clearRemote();
    window.location.reload();
  });
}

export function cleanup() {
  if (unsubscribeStatus) {
    unsubscribeStatus();
    unsubscribeStatus = null;
  }
}
