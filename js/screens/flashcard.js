import { Router } from '../router.js';
import { Store } from '../store.js';
import { SRS } from '../srs.js';
import { TTS } from '../tts.js';
import { FlashCard } from '../components/card.js';
import { LESSONS } from '../../data/lessons.js';
import * as Keys from '../keys.js';

export async function render(container, params = {}) {
  let wordsToStudy = [];
  let currentIndex = 0;
  
  if (params.words) {
    wordsToStudy = params.words;
  } else if (params.lessonId) {
    const lesson = LESSONS.find(l => l.id === params.lessonId);
    if (lesson) {
      wordsToStudy = lesson.words.map((w, i) => ({ ...w, id: `${lesson.id}_${i}`, lessonId: lesson.id, wordIndex: i }));
    }
  }

  if (wordsToStudy.length === 0) {
    container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-primary); margin-top: 50px;">Không có từ nào để học.</div>`;
    return;
  }

  const renderCurrentCard = async () => {
    if (currentIndex >= wordsToStudy.length) {
      showResults();
      return;
    }

    const currentWord = wordsToStudy[currentIndex];
    const progress = await Store.getWordProgress(currentWord.id) || { status: 'new', repetitions: 0, easeFactor: 2.5, interval: 0, bookmarked: false };
    
    if (Store.getSetting('autoSpeak', true)) {
      TTS.speak(currentWord.word);
    }

    container.innerHTML = `
      <div class="screen-flashcard" style="display: flex; flex-direction: column; height: 100%; background: var(--bg);">
        <div style="padding: 16px; display: flex; align-items: center; gap: 16px; background: var(--card);">
          <button id="btn-back" style="background: none; border: none; font-size: 24px; color: var(--text-primary); cursor: pointer;">←</button>
          <div style="flex: 1; height: 6px; background: var(--surface); border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; background: var(--primary); width: ${(currentIndex / wordsToStudy.length) * 100}%;"></div>
          </div>
          <span style="font-size: 14px; color: var(--text-secondary);">${currentIndex + 1}/${wordsToStudy.length}</span>
        </div>

        <div style="flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center; padding: 20px; align-items: center; perspective: 1000px;">
          <div id="flashcard-container" style="width: 100%; max-width: 400px; height: 100%; max-height: 420px;"></div>
        </div>

        <div id="action-buttons" style="display: none; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 16px 20px 4px; background: var(--card);">
          <button class="srs-btn" data-quality="1" style="background: var(--error); color: white; border: none; padding: 12px 4px; border-radius: 8px; font-size: 14px; cursor: pointer;">Lặp lại<br><small style="opacity:0.8">1</small></button>
          <button class="srs-btn" data-quality="3" style="background: var(--warning); color: white; border: none; padding: 12px 4px; border-radius: 8px; font-size: 14px; cursor: pointer;">Khó<br><small style="opacity:0.8">2</small></button>
          <button class="srs-btn" data-quality="4" style="background: var(--success); color: white; border: none; padding: 12px 4px; border-radius: 8px; font-size: 14px; cursor: pointer;">Tốt<br><small style="opacity:0.8">3</small></button>
          <button class="srs-btn" data-quality="5" style="background: var(--info); color: white; border: none; padding: 12px 4px; border-radius: 8px; font-size: 14px; cursor: pointer;">Dễ<br><small style="opacity:0.8">4</small></button>
        </div>
        <div id="flip-hint" style="text-align: center; padding: 16px 20px 4px; color: var(--text-secondary);">Chạm vào thẻ hoặc bấm <kbd style="background:var(--surface);border-radius:4px;padding:2px 6px;font-size:12px;font-family:inherit;">Space</kbd> để xem mặt sau</div>
        <div style="background: var(--card); padding-bottom: 12px;">
          ${Keys.hintBar([
            [['Space'], 'lật thẻ'],
            [['1'], 'Lặp lại'], [['2'], 'Khó'], [['3'], 'Tốt'], [['4'], 'Dễ'],
            [['←', '→'], 'chuyển từ'],
            [['S'], 'đọc'], [['B'], 'lưu'], [['Esc'], 'thoát']
          ])}
        </div>
      </div>
    `;

    container.querySelector('#btn-back').addEventListener('click', () => {
      Router.navigate('lessons');
    });

    const fcContainer = container.querySelector('#flashcard-container');
    let isFlipped = false;
    let isBookmarked = progress.bookmarked || false;
    let answering = false;

    const setFlipped = (flipped) => {
      isFlipped = flipped;
      const cardElem = fcContainer.querySelector('#flashcard');
      if (cardElem) cardElem.classList.toggle('flipped', isFlipped);
      container.querySelector('#action-buttons').style.display = isFlipped ? 'grid' : 'none';
      container.querySelector('#flip-hint').style.display = isFlipped ? 'none' : 'block';
    };

    const flip = () => setFlipped(!isFlipped);

    const toggleBookmark = async () => {
      isBookmarked = await Store.toggleBookmark(currentWord.id);
      renderCardUI();
      setFlipped(isFlipped);
    };

    // Guarded: holding a number key would otherwise advance several cards and
    // record an answer for each.
    const answer = async (quality) => {
      if (!isFlipped || answering) return;
      answering = true;
      const updatedProgress = SRS.processAnswer(progress, quality);
      await Store.updateWordProgress(currentWord.id, updatedProgress);
      await Store.recordActivity(1, quality >= 3 ? 1 : 0, 'flashcard');
      currentIndex++;
      renderCurrentCard();
    };

    const goPrev = () => {
      if (currentIndex === 0) return;
      currentIndex--;
      renderCurrentCard();
    };

    const goNext = () => {
      if (currentIndex >= wordsToStudy.length - 1) return;
      currentIndex++;
      renderCurrentCard();
    };

    const renderCardUI = () => {
      fcContainer.innerHTML = FlashCard.render(currentWord, isFlipped, isBookmarked);

      const cardElem = fcContainer.querySelector('#flashcard');
      if (cardElem) {
        cardElem.addEventListener('click', (e) => {
          if (e.target.closest('#speak-btn')) {
            e.stopPropagation();
            TTS.speak(currentWord.word);
            return;
          }
          if (e.target.closest('.bookmark-btn')) {
            e.stopPropagation();
            toggleBookmark();
            return;
          }
          flip();
        });
      }
    };

    renderCardUI();

    container.querySelectorAll('.srs-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        answer(parseInt(btn.dataset.quality));
      });
    });

    Keys.bind({
      ' ': flip,
      'Enter': () => (isFlipped ? answer(4) : flip()),
      'ArrowRight': () => (isFlipped ? answer(4) : flip()),
      'ArrowLeft': goPrev,
      'ArrowDown': goNext,
      '1': () => answer(1),
      '2': () => answer(3),
      '3': () => answer(4),
      '4': () => answer(5),
      's': () => TTS.speak(currentWord.word),
      'b': toggleBookmark,
      'Escape': () => Router.navigate(params.lessonId ? 'lesson-detail' : 'home', { lessonId: params.lessonId })
    });
  };

  const showResults = () => {
    Keys.bind({ 'Enter': () => Router.navigate(params.lessonId ? 'lesson-detail' : 'home', { lessonId: params.lessonId }) });
    container.innerHTML = `
      <div class="screen-results" style="display: flex; flex-direction: column; height: 100%; background: var(--bg); align-items: center; justify-content: center; padding: 20px;">
        <div style="font-size: 64px; margin-bottom: 24px;">🎉</div>
        <h2 style="margin: 0 0 16px 0; color: var(--text-primary);">Hoàn thành xuất sắc!</h2>
        <p style="color: var(--text-secondary); margin-bottom: 32px;">Bạn đã học ${wordsToStudy.length} từ.</p>
        <button id="btn-finish" style="background: var(--primary); color: white; border: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; width: 100%; max-width: 300px;">
          Xong
        </button>
      </div>
    `;
    container.querySelector('#btn-finish').addEventListener('click', () => {
      Router.navigate(params.lessonId ? 'lesson-detail' : 'home', { lessonId: params.lessonId });
    });
  };

  renderCurrentCard();
}

export function cleanup() {
  Keys.unbind();
}
