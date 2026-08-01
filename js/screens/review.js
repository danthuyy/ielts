import { Router } from '../router.js';
import { Store } from '../store.js';
import { BottomNav } from '../components/bottom-nav.js';
import { LESSONS } from '../../data/lessons.js';
import * as FlashcardScreen from './flashcard.js';

export async function render(container) {
  const dueProgressList = await Store.getWordsForReview();

  if (!dueProgressList || dueProgressList.length === 0) {
    container.innerHTML = `
      <div class="screen-review app-page"><div class="page-inner">
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center;">
          <div style="font-size: 80px; margin-bottom: 24px;">🎉</div>
          <h2 style="margin: 0 0 16px 0; color: var(--text-primary);">Tuyệt vời!</h2>
          <p style="color: var(--text-secondary); margin-bottom: 32px;">Bạn đã hoàn thành việc ôn tập hôm nay.<br>Hãy học thêm bài mới nhé!</p>
          <button id="btn-learn" style="background: var(--primary); color: white; border: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer;">
            Thư viện bài học
          </button>
        </div>
        </div><div id="nav-container"></div>
      </div>
    `;

    if (BottomNav && typeof BottomNav.render === 'function') {
      container.querySelector('#nav-container').innerHTML = BottomNav.render('review');
    }

    container.querySelector('#btn-learn').addEventListener('click', () => {
      Router.navigate('lessons');
    });
    return;
  }

  // Map progress entries to full word objects from LESSONS data
  const fullWordsToReview = [];
  for (const prog of dueProgressList) {
    const lesson = LESSONS.find(l => l.id === prog.lessonId);
    if (lesson && lesson.words[prog.wordIndex]) {
      fullWordsToReview.push({
        ...lesson.words[prog.wordIndex],
        id: prog.id,
        lessonId: prog.lessonId,
        wordIndex: prog.wordIndex
      });
    }
  }

  await FlashcardScreen.render(container, { words: fullWordsToReview });
}

export function cleanup() {
  if (FlashcardScreen.cleanup) {
    FlashcardScreen.cleanup();
  }
}
