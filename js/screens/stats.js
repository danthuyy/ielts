import { Store } from '../store.js';
import { BottomNav } from '../components/bottom-nav.js';

export async function render(container) {
  const stats = await Store.getOverallStats();
  const history = await Store.getTestHistory() || [];

  const total = stats.total || 1; // prevent div by zero
  const masteredPct = Math.round(((stats.mastered || 0) / total) * 100);
  const learningPct = Math.round(((stats.learning || 0) / total) * 100);
  const newPct = Math.round(((stats.newCount || 0) / total) * 100);

  container.innerHTML = `
    <div class="screen-stats" style="padding: 20px; padding-bottom: 80px; height: 100%; box-sizing: border-box; overflow-y: auto;">
      <h1 style="margin: 0 0 24px 0; font-size: 24px;">Thống kê học tập</h1>

      <div style="background: var(--card); border-radius: 16px; padding: 20px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-around;">
        <div style="position: relative; width: 120px; height: 120px; border-radius: 50%; background: conic-gradient(var(--success) ${masteredPct}%, var(--warning) 0 ${masteredPct + learningPct}%, var(--info) 0);">
          <div style="position: absolute; inset: 12px; background: var(--card); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: var(--text-primary);">
            ${masteredPct}%
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 12px; height: 12px; background: var(--success); border-radius: 50%;"></div>
            <span style="font-size: 14px; color: var(--text-secondary);">Thuộc (${stats.mastered})</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 12px; height: 12px; background: var(--warning); border-radius: 50%;"></div>
            <span style="font-size: 14px; color: var(--text-secondary);">Đang học (${stats.learning})</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 12px; height: 12px; background: var(--info); border-radius: 50%;"></div>
            <span style="font-size: 14px; color: var(--text-secondary);">Mới (${stats.newCount})</span>
          </div>
        </div>
      </div>

      <h3 style="margin: 0 0 16px 0; font-size: 18px;">Lịch sử kiểm tra</h3>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${history.length > 0 ? history.slice(0, 5).map(h => `
          <div style="background: var(--card); padding: 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: bold; color: var(--text-primary); margin-bottom: 4px;">${new Date(h.date).toLocaleDateString('vi-VN')}</div>
              <div style="font-size: 12px; color: var(--text-secondary);">Chế độ: ${h.mode === 'mixed' ? 'Hỗn hợp' : h.mode}</div>
            </div>
            <div style="font-size: 20px; font-weight: bold; color: ${h.score >= 80 ? 'var(--success)' : 'var(--warning)'};">${h.score}%</div>
          </div>
        `).join('') : '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">Chưa có dữ liệu kiểm tra.</div>'}
      </div>

      <div id="nav-container"></div>
    </div>
  `;

  if (BottomNav && typeof BottomNav.render === 'function') {
    container.querySelector('#nav-container').innerHTML = BottomNav.render('stats');
  }
}

export function cleanup() {}
