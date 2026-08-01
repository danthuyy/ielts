import { Router } from '../router.js';
import { Store } from '../store.js';
import { LESSONS } from '../../data/lessons.js';
import { TTS } from '../tts.js';
import { BottomNav } from '../components/bottom-nav.js';
import { groupByCategory } from '../../data/categories.js';

export async function render(container, params = {}) {
  if (params.lessonId) {
    await renderLessonDetail(container, params.lessonId);
  } else {
    await renderLessonList(container);
  }
}

async function renderLessonList(container) {
  container.innerHTML = `
    <div class="app-page">
      <div class="page-inner">
        <header class="home-head">
          <h1 class="home-title">Thư viện bài học</h1>
          <span class="home-date" id="lesson-count"></span>
        </header>

        <div style="position: relative; margin-bottom: var(--sp-4);">
          <input type="text" id="lesson-search" placeholder="Tìm bài học hoặc chủ đề..."
            style="width: 100%; padding: 12px 16px 12px 40px; border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--card); color: var(--text); box-sizing: border-box; font-size: 15px;">
          <span style="position: absolute; left: 14px; top: 12px; color: var(--text-dim);">🔍</span>
        </div>

        <div id="cat-filter" class="chip-row" style="margin-bottom: var(--sp-6);"></div>
        <div id="lesson-groups"></div>
      </div>
      <div id="nav-container"></div>
    </div>
  `;

  container.querySelector('#nav-container').innerHTML = BottomNav.render('lessons');
  BottomNav.updateBadge(await Store.getDueCount());

  const groupsEl = container.querySelector('#lesson-groups');
  const filterEl = container.querySelector('#cat-filter');
  const searchInput = container.querySelector('#lesson-search');
  const countEl = container.querySelector('#lesson-count');

  let activeCategory = 'all';
  let query = '';

  const allCategories = groupByCategory(LESSONS);

  const paintFilters = () => {
    const chips = [{ key: 'all', icon: '📚', label: 'Tất cả', count: LESSONS.length }]
      .concat(allCategories.map(c => ({ key: c.key, icon: c.icon, label: c.label, count: c.lessons.length })));
    filterEl.innerHTML = chips.map(c => `
      <button class="quick" data-cat="${c.key}"
        style="${c.key === activeCategory ? 'border-color: var(--primary); background: var(--card-hover);' : ''}">
        ${c.icon} ${c.label} <span style="color: var(--text-muted);">${c.count}</span>
      </button>
    `).join('');
    filterEl.querySelectorAll('[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.cat;
        paintFilters();
        paintGroups();
      });
    });
  };

  const paintGroups = async () => {
    const q = query.trim().toLowerCase();
    const groups = groupByCategory(LESSONS)
      .filter(g => activeCategory === 'all' || g.key === activeCategory)
      .map(g => ({
        ...g,
        lessons: g.lessons.filter(l =>
          !q ||
          l.title.toLowerCase().includes(q) ||
          (l.description || '').toLowerCase().includes(q) ||
          (l.tags || []).some(t => t.toLowerCase().includes(q)) ||
          g.label.toLowerCase().includes(q))
      }))
      .filter(g => g.lessons.length > 0);

    const shown = groups.reduce((n, g) => n + g.lessons.length, 0);
    countEl.textContent = `${shown} bài · ${groups.length} chủ đề`;

    if (groups.length === 0) {
      groupsEl.innerHTML = `<div class="empty">Không tìm thấy bài học nào khớp với "${q}".</div>`;
      return;
    }

    const statsById = new Map();
    await Promise.all(groups.flatMap(g => g.lessons).map(async l => {
      statsById.set(l.id, await Store.getLessonStats(l.id));
    }));

    groupsEl.innerHTML = groups.map(g => `
      <section style="margin-bottom: var(--sp-6);">
        <h2 class="section-label">${g.icon} ${g.label}</h2>
        <div class="topic-grid">
          ${g.lessons.map(l => {
            const s = statsById.get(l.id) || {};
            const total = l.words.length;
            const percent = total > 0 ? Math.round(((s.mastered || 0) / total) * 100) : 0;
            return `
              <button class="topic" data-lesson="${l.id}">
                <span class="topic-name">${l.title}</span>
                <span class="topic-meta">${l.description || ''}</span>
                <span class="topic-meta">${total} từ · thuộc ${s.mastered || 0} · đang học ${s.learning || 0}</span>
                <span class="topic-bar"><span style="width: ${percent}%"></span></span>
              </button>
            `;
          }).join('')}
        </div>
      </section>
    `).join('');

    groupsEl.querySelectorAll('[data-lesson]').forEach(btn => {
      btn.addEventListener('click', () => {
        Router.navigate('lesson-detail', { lessonId: btn.dataset.lesson });
      });
    });
  };

  paintFilters();
  await paintGroups();

  searchInput.addEventListener('input', (e) => {
    query = e.target.value;
    paintGroups();
  });
}

async function renderLessonDetail(container, lessonId) {
  const lesson = LESSONS.find(l => l.id === lessonId);
  if (!lesson) {
    Router.navigate('lessons');
    return;
  }

  const stats = await Store.getLessonStats(lessonId);
  const progressData = await Store.getAllProgress(lessonId);

  const getStatusBadge = (progress) => {
    if (!progress || progress.status === 'new') return '<span style="color:var(--info); font-size: 12px; border: 1px solid var(--info); padding: 2px 6px; border-radius: 12px;">Mới</span>';
    if (progress.status === 'learning') return '<span style="color:var(--warning); font-size: 12px; border: 1px solid var(--warning); padding: 2px 6px; border-radius: 12px;">Đang học</span>';
    return '<span style="color:var(--success); font-size: 12px; border: 1px solid var(--success); padding: 2px 6px; border-radius: 12px;">Thuộc</span>';
  };

  const isBookmarked = (progress) => progress && progress.bookmarked;

  let html = `
    <div class="screen-lesson-detail" style="display: flex; flex-direction: column; height: 100%; background: var(--bg);">
      <div style="padding: 16px; display: flex; align-items: center; gap: 16px; border-bottom: 1px solid var(--surface); background: var(--card); position: sticky; top: 0; z-index: 10;">
        <button id="btn-back" style="background: none; border: none; font-size: 24px; color: var(--text-primary); cursor: pointer;">←</button>
        <h2 style="margin: 0; font-size: 18px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${lesson.title}</h2>
      </div>

      <div style="padding: 20px; overflow-y: auto; flex: 1; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; background: var(--card); padding: 16px; border-radius: 12px; margin-bottom: 20px;">
          <div style="text-align: center;">
            <div style="font-size: 18px; font-weight: bold; color: var(--info);">${stats.newCount || 0}</div>
            <div style="font-size: 12px; color: var(--text-secondary);">Mới</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 18px; font-weight: bold; color: var(--warning);">${stats.learning || 0}</div>
            <div style="font-size: 12px; color: var(--text-secondary);">Đang học</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 18px; font-weight: bold; color: var(--success);">${stats.mastered || 0}</div>
            <div style="font-size: 12px; color: var(--text-secondary);">Thuộc</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
          <button class="mode-btn" data-mode="flashcard" style="background: var(--card); border: 1px solid var(--surface); padding: 16px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; color: var(--text-primary);">
            <span style="font-size: 24px;">🃏</span>
            <span>Flashcard</span>
          </button>
          <button class="mode-btn" data-mode="quiz-type" style="background: var(--card); border: 1px solid var(--surface); padding: 16px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; color: var(--text-primary);">
            <span style="font-size: 24px;">⌨️</span>
            <span>Điền từ</span>
          </button>
          <button class="mode-btn" data-mode="quiz-listen" style="background: var(--card); border: 1px solid var(--surface); padding: 16px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; color: var(--text-primary);">
            <span style="font-size: 24px;">🎧</span>
            <span>Nghe viết</span>
          </button>
          <button class="mode-btn" data-mode="quiz-match" style="background: var(--card); border: 1px solid var(--surface); padding: 16px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; color: var(--text-primary);">
            <span style="font-size: 24px;">🔗</span>
            <span>Nối từ</span>
          </button>
          <button class="mode-btn" data-mode="quiz-choice" style="background: var(--card); border: 1px solid var(--surface); padding: 16px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; color: var(--text-primary);">
            <span style="font-size: 24px;">📝</span>
            <span>Trắc nghiệm</span>
          </button>
          <button class="mode-btn" data-mode="test" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); border: none; padding: 16px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; color: white;">
            <span style="font-size: 24px;">📋</span>
            <span>Kiểm tra</span>
          </button>
        </div>

        <h3 style="margin: 0 0 16px 0; font-size: 16px;">Danh sách từ (${lesson.words.length})</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${lesson.words.map((w, index) => {
            const pid = `${lessonId}_${index}`;
            const prog = progressData.find(p => p.id === pid);
            return `
              <div class="word-item" data-word="${w.word}" style="background: var(--card); padding: 16px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <strong style="font-size: 16px; color: var(--text-primary);">${w.word}</strong>
                    <span style="font-size: 12px; color: var(--text-secondary);">${w.pos}</span>
                  </div>
                  <div style="font-size: 14px; color: var(--text-secondary);">${w.vi}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  ${getStatusBadge(prog)}
                  <span class="bookmark-icon" style="font-size: 18px; color: ${isBookmarked(prog) ? 'var(--warning)' : 'var(--surface)'};">★</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  container.querySelector('#btn-back').addEventListener('click', () => {
    Router.navigate('lessons');
  });

  container.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      Router.navigate(btn.dataset.mode, { lessonId });
    });
  });

  container.querySelectorAll('.word-item').forEach(item => {
    item.addEventListener('click', () => {
      TTS.speak(item.dataset.word);
    });
  });
}

export function cleanup() {
}
