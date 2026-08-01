import { Router } from '../router.js';
import { Store } from '../store.js';
import { BottomNav } from '../components/bottom-nav.js';
import { formatDate } from '../utils.js';

export async function render(container) {
  const stats = await Store.getOverallStats();
  const streak = await Store.getStreak();
  const dueCount = await Store.getDueCount();
  const weekly = await Store.getWeeklyActivity();

  // Create chart bars
  let maxStudied = Math.max(...weekly.map(d => d.wordsStudied || 0), 1);
  const barsHtml = weekly.map(day => {
    const height = Math.max(10, Math.min(100, ((day.wordsStudied || 0) / maxStudied) * 100));
    return `
      <div class="bar-wrapper" style="display:flex; flex-direction:column; align-items:center; gap:4px;">
        <div class="bar" style="width:24px; height:100px; background:var(--surface); border-radius:4px; display:flex; align-items:flex-end;">
          <div class="bar-fill" style="width:100%; height:${height}%; background:var(--primary); border-radius:4px;"></div>
        </div>
        <span style="font-size:10px; color:var(--text-secondary);">${new Date(day.date).getDate()}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="screen-home" style="padding-bottom: 80px; padding: 20px; overflow-y: auto; height: 100%; box-sizing: border-box;">
      <header style="margin-bottom: 24px;">
        <h1 style="font-size: 24px; margin: 0 0 8px 0;">Chào bạn! 👋</h1>
        <p style="color: var(--text-secondary); margin: 0;">${formatDate(new Date())}</p>
      </header>

      <div class="streak-card" style="background: var(--card); border-radius: 16px; padding: 16px; display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
        <div style="font-size: 32px;">🔥</div>
        <div>
          <h3 style="margin: 0; font-size: 18px; color: var(--text-primary);">Chuỗi học tập</h3>
          <p style="margin: 4px 0 0 0; color: var(--text-secondary);">${streak} ngày liên tục</p>
        </div>
      </div>

      <div class="stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
        <div style="background: var(--card); padding: 16px 12px; border-radius: 12px; text-align: center;">
          <div style="font-size: 20px; font-weight: bold; color: var(--text-primary); margin-bottom: 4px;">${stats.total}</div>
          <div style="font-size: 12px; color: var(--text-secondary);">Tổng từ</div>
        </div>
        <div style="background: var(--card); padding: 16px 12px; border-radius: 12px; text-align: center;">
          <div style="font-size: 20px; font-weight: bold; color: var(--warning); margin-bottom: 4px;">${stats.learning}</div>
          <div style="font-size: 12px; color: var(--text-secondary);">Đang học</div>
        </div>
        <div style="background: var(--card); padding: 16px 12px; border-radius: 12px; text-align: center;">
          <div style="font-size: 20px; font-weight: bold; color: var(--success); margin-bottom: 4px;">${stats.mastered}</div>
          <div style="font-size: 12px; color: var(--text-secondary);">Đã thuộc</div>
        </div>
      </div>

      <div class="due-section" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); border-radius: 16px; padding: 20px; margin-bottom: 24px; color: white;">
        <h3 style="margin: 0 0 8px 0;">Cần ôn hôm nay: ${dueCount} từ</h3>
        <p style="margin: 0 0 16px 0; opacity: 0.9; font-size: 14px;">Ôn tập đúng hạn giúp nhớ lâu hơn!</p>
        <button id="btn-review" style="background: white; color: var(--primary-dark); border: none; padding: 12px 20px; border-radius: 8px; font-weight: bold; width: 100%; cursor: pointer;">
          Ôn tập ngay →
        </button>
      </div>

      <button id="btn-learn-new" style="background: var(--card); color: var(--text-primary); border: 1px solid var(--primary); padding: 16px; border-radius: 12px; font-weight: bold; width: 100%; cursor: pointer; margin-bottom: 24px;">
        📖 Học bài mới
      </button>

      <div class="chart-section">
        <h3 style="margin: 0 0 16px 0; font-size: 16px;">Hoạt động 7 ngày qua</h3>
        <div style="display: flex; justify-content: space-between; align-items: flex-end; height: 120px;">
          ${barsHtml}
        </div>
      </div>

      <div id="nav-container"></div>
    </div>
  `;

  // Render bottom nav assuming it returns HTML string
  const navContainer = container.querySelector('#nav-container');
  if (BottomNav && typeof BottomNav.render === 'function') {
    navContainer.innerHTML = BottomNav.render('home');
  }

  // Event listeners
  container.querySelector('#btn-review').addEventListener('click', () => {
    Router.navigate('review');
  });

  container.querySelector('#btn-learn-new').addEventListener('click', () => {
    Router.navigate('lessons');
  });

  // Setup bottom nav listeners if needed, usually handled globally or inside BottomNav
}

export function cleanup() {
  // Cleanup if needed
}
