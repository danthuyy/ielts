import { Router } from '../router.js';
import { Store } from '../store.js';
import { SRS } from '../srs.js';
import { TTS } from '../tts.js';
import { FlashCard } from '../components/card.js';
import { LESSONS } from '../../data/lessons.js';

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

        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 20px; align-items: center; perspective: 1000px;">
          <div id="flashcard-container" style="width: 100%; max-width: 400px; height: 350px;"></div>
        </div>

        <div id="action-buttons" style="display: none; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 20px; background: var(--card);">
          <button class="srs-btn" data-quality="1" style="background: var(--error); color: white; border: none; padding: 12px 4px; border-radius: 8px; font-size: 14px; cursor: pointer;">Lặp lại<br><small style="opacity:0.8">1m</small></button>
          <button class="srs-btn" data-quality="3" style="background: var(--warning); color: white; border: none; padding: 12px 4px; border-radius: 8px; font-size: 14px; cursor: pointer;">Khó<br><small style="opacity:0.8">10m</small></button>
          <button class="srs-btn" data-quality="4" style="background: var(--success); color: white; border: none; padding: 12px 4px; border-radius: 8px; font-size: 14px; cursor: pointer;">Tốt<br><small style="opacity:0.8">1d</small></button>
          <button class="srs-btn" data-quality="5" style="background: var(--info); color: white; border: none; padding: 12px 4px; border-radius: 8px; font-size: 14px; cursor: pointer;">Dễ<br><small style="opacity:0.8">4d</small></button>
        </div>
        <div id="flip-hint" style="text-align: center; padding: 20px; color: var(--text-secondary);">Chạm vào thẻ để xem mặt sau</div>
      </div>
    `;

    container.querySelector('#btn-back').addEventListener('click', () => {
      Router.navigate('lessons');
    });

    const fcContainer = container.querySelector('#flashcard-container');
    if (typeof FlashCard === 'function') {
      fcContainer.innerHTML = FlashCard({
        front: `
          <div style="text-align: center;">
            <div style="font-size: 32px; font-weight: bold; margin-bottom: 8px;">${currentWord.word}</div>
            <div style="font-size: 16px; color: var(--text-secondary);">${currentWord.pos}</div>
          </div>
        `,
        back: `
          <div style="text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="font-size: 24px; font-weight: bold; margin-bottom: 4px;">${currentWord.word}</div>
              <div style="font-size: 14px; color: var(--primary); margin-bottom: 12px;">${currentWord.ipa || ''}</div>
              <div style="font-size: 18px; margin-bottom: 16px; color: var(--text-primary);">${currentWord.vi}</div>
              ${currentWord.collocation ? `<div style="font-size: 14px; color: var(--warning); margin-bottom: 8px;">${currentWord.collocation}</div>` : ''}
              ${currentWord.example ? `<div style="font-size: 14px; color: var(--text-secondary); font-style: italic;">"${currentWord.example}"</div>` : ''}
            </div>
            <button id="btn-speak-card" style="background: var(--surface); border: none; border-radius: 50%; width: 48px; height: 48px; font-size: 24px; align-self: center; cursor: pointer; color: var(--text-primary);">🔊</button>
          </div>
        `
      });

      let flipped = false;
      fcContainer.addEventListener('click', (e) => {
        if(e.target.closest('#btn-speak-card')) {
          TTS.speak(currentWord.word);
          e.stopPropagation();
          return;
        }
        flipped = !flipped;
        const inner = fcContainer.querySelector('.card-inner');
        if (inner) {
          inner.style.transform = flipped ? 'rotateY(180deg)' : 'rotateY(0)';
          if (flipped) {
            container.querySelector('#action-buttons').style.display = 'grid';
            container.querySelector('#flip-hint').style.display = 'none';
          }
        }
      });
    }

    container.querySelectorAll('.srs-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const quality = parseInt(btn.dataset.quality);
        const updatedProgress = SRS.processAnswer(progress, quality);
        await Store.updateWordProgress(currentWord.id, updatedProgress);
        await Store.recordActivity(1, quality >= 3 ? 1 : 0, 'flashcard');
        
        currentIndex++;
        renderCurrentCard();
      });
    });
  };

  const showResults = () => {
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

export function cleanup() {}
