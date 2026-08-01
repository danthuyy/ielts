export const BottomNav = {
  tabs: [
    { id: 'home', icon: '🏠', label: 'Trang chủ' },
    { id: 'lessons', icon: '📚', label: 'Bài học' },
    { id: 'review', icon: '🔄', label: 'Ôn tập' },
    { id: 'stats', icon: '📊', label: 'Thống kê' },
    { id: 'settings', icon: '⚙️', label: 'Cài đặt' },
  ],
  
  render(activeId) {
    const tabsHtml = this.tabs.map(tab => {
      const isActive = tab.id === activeId ? 'active' : '';
      const badgeHtml = tab.id === 'review' ? `<span class="badge" id="review-badge" style="display: none;">0</span>` : '';
      return `
        <div class="nav-item ${isActive}" onclick="window.location.hash='${tab.id}'">
          <div class="nav-icon">${tab.icon}${badgeHtml}</div>
          <div class="nav-label">${tab.label}</div>
        </div>
      `;
    }).join('');

    return `
      <style>
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--surface, #13132b);
          display: flex;
          justify-content: space-around;
          padding: 8px 0;
          border-top: 1px solid var(--border-color, #2a2a4a);
          z-index: 1000;
        }
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: var(--text-secondary, #94a3b8);
          cursor: pointer;
          flex: 1;
        }
        .nav-item.active {
          color: var(--primary, #8b5cf6);
        }
        .nav-icon {
          font-size: 24px;
          margin-bottom: 4px;
          position: relative;
        }
        .nav-label {
          font-size: 12px;
        }
        .badge {
          position: absolute;
          top: -4px;
          right: -8px;
          background: var(--error, #f87171);
          color: white;
          border-radius: 12px;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: bold;
        }
      </style>
      <nav class="bottom-nav">
        ${tabsHtml}
      </nav>
    `;
  },
  
  updateBadge(count) {
    const badge = document.getElementById('review-badge');
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }
  }
};
