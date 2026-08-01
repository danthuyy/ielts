import { Router } from '../router.js';
import { Store } from '../store.js';
import { LESSONS } from '../../data/lessons.js';
import { TTS } from '../tts.js';
import { BottomNav } from '../components/bottom-nav.js';

export async function render(container, params = {}) {
  if (params.lessonId) {
    await renderLessonDetail(container, params.lessonId);
  } else {
    await renderLessonList(container);
  }
}

async function renderLessonList(container) {
  let html = `
    <div class="screen-lessons" style="padding: 20px; padding-bottom: 80px; height: 100%; box-sizing: border-box; overflow-y: auto;">
      <h1 style="margin: 0 0 16px 0; font-size: 24px;">Thư viện bài học</h1>
      <div style="position: relative; margin-bottom: 20px;">
        <input type="text" id="lesson-search" placeholder="Tìm kiếm bài học..." style="width: 100%; padding: 12px 16px 12px 40px; border-radius: 12px; border: 1px solid var(--surface); background: var(--card); color: var(--text-primary); box-sizing: border-box; font-size: 16px;">
        <span style="position: absolute; left: 14px; top: 12px; color: var(--text-secondary);">🔍</span>
      </div>
      <div id="lesson-list-container" style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Lessons go here -->
      </div>
      <div id="nav-container"></div>
    </div>
  `;
  container.innerHTML = html;

  if (BottomNav && typeof BottomNav.render === 'function') {
    container.querySelector('#nav-container').innerHTML = BottomNav.render('lessons');
  }

  const listContainer = container.querySelector('#lesson-list-container');
  const searchInput = container.querySelector('#lesson-search');

  async function renderList(query = '') {
    listContainer.innerHTML = '';
    for (const lesson of LESSONS) {
      if (query && !lesson.title.toLowerCase().includes(query.toLowerCase())) {
        continue;
      }
      const stats = await Store.getLessonStats(lesson.id);
      const total = lesson.words.length;
      const progress = total > 0 ? Math.round(((stats.mastered || 0) / total) * 100) : 0;
      
      const card = document.createElement('div');
      card.style.cssText = `background: var(--card); border-radius: 16px; padding: 16px; cursor: pointer;`;
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 18px; color: var(--text-primary);">${lesson.title}</h3>
          <span style="background: var(--surface); color: var(--text-secondary); padding: 4px 8px; border-radius: 8px; font-size: 12px;">${total} từ</span>
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 16px;">
          ${(lesson.tags || []).map(tag => `<span style="background: var(--primary-light); color: var(--primary-dark); padding: 2px 8px; border-radius: 12px; font-size: 12px;">${tag}</span>`).join('')}
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; color: var(--text-secondary);">
            <span>Tiến độ</span>
            <span>${progress}%</span>
          </div>
          <div style="width: 100%; height: 6px; background: var(--surface); border-radius: 3px; overflow: hidden;">
            <div style="width: ${progress}%; height: 100%; background: var(--success); border-radius: 3px;"></div>
          </div>
        </div>
      `;
      card.addEventListener('click', () => {
        Router.navigate('lesson-detail', { lessonId: lesson.id });
      });
      listContainer.appendChild(card);
    }
  }

  await renderList();

  searchInput.addEventListener('input', (e) => {
    renderList(e.target.value);
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
