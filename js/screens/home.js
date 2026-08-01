import { Router } from '../router.js';
import { Store } from '../store.js';
import { BottomNav } from '../components/bottom-nav.js';
import { LESSONS } from '../../data/lessons.js';
import { CATEGORIES, categoryOf } from '../../data/categories.js';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function todayLabel() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${WEEKDAYS[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Seven columns ending today, so the chart never collapses on a quiet week.
function lastSevenDays(activity) {
  const byDate = new Map(activity.map(a => [a.date, a]));
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({
      key,
      label: WEEKDAYS[d.getDay()],
      isToday: i === 0,
      studied: byDate.get(key)?.wordsStudied || 0
    });
  }
  return out;
}

export async function render(container) {
  const [stats, streak, dueCount, activity] = await Promise.all([
    Store.getOverallStats(),
    Store.getStreak(),
    Store.getDueCount(),
    Store.getWeeklyActivity()
  ]);

  const lessonStats = await Promise.all(
    LESSONS.map(async l => ({ lesson: l, stats: await Store.getLessonStats(l.id) }))
  );

  const dailyGoal = Store.getSetting('dailyGoal', 10);
  const days = lastSevenDays(activity);
  const studiedToday = days[days.length - 1].studied;
  const goalPercent = dailyGoal > 0 ? Math.min(100, Math.round((studiedToday / dailyGoal) * 100)) : 0;

  const peak = Math.max(...days.map(d => d.studied), dailyGoal, 1);
  const chartHtml = days.map(d => `
    <div class="chart-col${d.isToday ? ' today' : ''}" title="${d.key}: ${d.studied} từ">
      <div class="chart-bar"><div class="chart-fill" style="height: ${d.studied === 0 ? 3 : Math.max(8, Math.round((d.studied / peak) * 100))}%"></div></div>
      <div class="chart-day">${d.label}</div>
    </div>
  `).join('');

  const topicsHtml = lessonStats.map(({ lesson, stats: s }) => {
    const cat = categoryOf(lesson);
    const total = lesson.words.length;
    const done = s.mastered || 0;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return `
      <button class="topic" data-lesson="${lesson.id}">
        <span class="topic-icon">${cat.icon}</span>
        <span class="topic-name">${lesson.title}</span>
        <span class="topic-meta">${cat.label} · ${total} từ · thuộc ${done}</span>
        <span class="topic-bar"><span style="width: ${percent}%"></span></span>
      </button>
    `;
  }).join('');

  const dueEmpty = dueCount === 0;

  container.innerHTML = `
    <div class="app-page">
      <div class="page-inner">

        <header class="home-head">
          <h1 class="home-title">${greeting()}! 👋</h1>
          <span class="home-date">${todayLabel()}</span>
        </header>

        <div class="home-grid">
          <div class="home-col">

            <section class="card due-card${dueEmpty ? ' is-empty' : ''}">
              <div>
                <div class="due-count">${dueEmpty ? 'Không có từ cần ôn' : `${dueCount} từ cần ôn`}</div>
                <div class="due-sub">${dueEmpty ? 'Học từ mới để lấp đầy lịch ôn tập.' : 'Ôn đúng hạn là cách nhớ lâu nhất.'}</div>
              </div>
              <button class="due-btn" id="btn-primary">${dueEmpty ? 'Học từ mới' : 'Ôn tập ngay'}</button>
            </section>

            <section>
              <h2 class="section-label">Chủ đề</h2>
              ${topicsHtml
                ? `<div class="topic-grid">${topicsHtml}</div>`
                : `<div class="empty">Chưa có bài học nào.</div>`}
            </section>

            <section>
              <h2 class="section-label">Luyện nhanh</h2>
              <div class="quick-row">
                <button class="quick" data-mode="flashcard">🃏 Flashcard</button>
                <button class="quick" data-mode="quiz-type">⌨️ Điền từ</button>
                <button class="quick" data-mode="quiz-listen">🎧 Nghe viết</button>
                <button class="quick" data-mode="quiz-choice">📝 Trắc nghiệm</button>
              </div>
            </section>

          </div>

          <div class="home-col">

            <section class="card">
              <div class="streak-row">
                <span class="streak-flame">${streak > 0 ? '🔥' : '🌱'}</span>
                <div style="flex: 1;">
                  <div class="streak-num">${streak} ngày</div>
                  <div class="streak-cap">chuỗi học liên tục</div>
                </div>
              </div>
              <div style="margin-top: var(--sp-4);">
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-dim); margin-bottom: var(--sp-2);">
                  <span>Mục tiêu hôm nay</span>
                  <span>${studiedToday}/${dailyGoal} từ</span>
                </div>
                <span class="topic-bar"><span style="width: ${goalPercent}%"></span></span>
              </div>
            </section>

            <section class="stat-row">
              <div class="stat">
                <div class="stat-num">${stats.total}</div>
                <div class="stat-cap">Tổng từ</div>
              </div>
              <div class="stat">
                <div class="stat-num" style="color: var(--yellow);">${stats.learning}</div>
                <div class="stat-cap">Đang học</div>
              </div>
              <div class="stat">
                <div class="stat-num" style="color: var(--green);">${stats.mastered}</div>
                <div class="stat-cap">Đã thuộc</div>
              </div>
            </section>

            <section class="card">
              <h2 class="section-label">Hoạt động 7 ngày</h2>
              <div class="chart">${chartHtml}</div>
            </section>

          </div>
        </div>

      </div>
      <div id="nav-container"></div>
    </div>
  `;

  container.querySelector('#nav-container').innerHTML = BottomNav.render('home');
  BottomNav.updateBadge(dueCount);

  container.querySelector('#btn-primary').addEventListener('click', () => {
    Router.navigate(dueEmpty ? 'lessons' : 'review');
  });

  container.querySelectorAll('.topic').forEach(btn => {
    btn.addEventListener('click', () => {
      Router.navigate('lesson-detail', { lessonId: btn.dataset.lesson });
    });
  });

  // Quick-practice jumps straight into the first lesson, so home really is
  // "open, pick, study" rather than three taps of navigation.
  const firstLesson = LESSONS[0];
  container.querySelectorAll('.quick').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!firstLesson) return Router.navigate('lessons');
      Router.navigate(btn.dataset.mode, { lessonId: firstLesson.id });
    });
  });
}

export function cleanup() {}
