import { Router } from '../router.js';
import { Store } from '../store.js';
import { BottomNav } from '../components/bottom-nav.js';
import * as FlashcardScreen from './flashcard.js';

export async function render(container) {
  const dueWordsData = await Store.getWordsForReview();

  if (!dueWordsData || dueWordsData.length === 0) {
    container.innerHTML = `
      <div class="screen-review" style="display: flex; flex-direction: column; height: 100%; background: var(--bg);">
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center;">
          <div style="font-size: 80px; margin-bottom: 24px;">🎉</div>
          <h2 style="margin: 0 0 16px 0; color: var(--text-primary);">Tuyệt vời!</h2>
          <p style="color: var(--text-secondary); margin-bottom: 32px;">Bạn đã hoàn thành việc ôn tập hôm nay.<br>Hãy học thêm bài mới nhé!</p>
          <button id="btn-learn" style="background: var(--primary); color: white; border: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer;">
            Thư viện bài học
          </button>
        </div>
        <div id="nav-container"></div>
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

  // Delegate to flashcard screen but with review mode
  // Pass the words to the flashcard screen
  await FlashcardScreen.render(container, { words: dueWordsData.map(d => d.word) });
}

export function cleanup() {
  if (FlashcardScreen.cleanup) {
    FlashcardScreen.cleanup();
  }
}
