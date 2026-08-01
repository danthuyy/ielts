// Markup only — layout lives in css/layout.css so the same nav can be a bottom
// bar on phones and a left sidebar on desktop without duplicating styles here.
export const BottomNav = {
  tabs: [
    { id: 'home', icon: '🏠', label: 'Trang chủ' },
    { id: 'lessons', icon: '📚', label: 'Bài học' },
    { id: 'review', icon: '🔄', label: 'Ôn tập' },
    { id: 'stats', icon: '📊', label: 'Thống kê' },
    { id: 'settings', icon: '⚙️', label: 'Cài đặt' }
  ],

  render(activeId) {
    const tabsHtml = this.tabs.map(tab => {
      const badge = tab.id === 'review'
        ? '<span class="badge" id="review-badge" style="display: none;">0</span>'
        : '';
      return `
        <div class="nav-item ${tab.id === activeId ? 'active' : ''}" data-tab="${tab.id}"
             onclick="window.location.hash='${tab.id}'">
          <span class="nav-icon">${tab.icon}${badge}</span>
          <span class="nav-label">${tab.label}</span>
        </div>
      `;
    }).join('');

    return `
      <nav class="bottom-nav">
        <div class="nav-brand">IELTS <span>Vocab</span></div>
        ${tabsHtml}
      </nav>
    `;
  },

  updateBadge(count) {
    const badge = document.getElementById('review-badge');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }
};
