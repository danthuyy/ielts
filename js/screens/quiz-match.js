import { Router } from '../router.js';
import { Store } from '../store.js';
import { SRS } from '../srs.js';
import { shuffle } from '../utils.js';
import { LESSONS } from '../../data/lessons.js';

export async function render(container, params = {}) {
  let allWords = [];
  if (params.lessonId) {
    const lesson = LESSONS.find(l => l.id === params.lessonId);
    if (lesson) allWords = lesson.words.map((w, i) => ({ ...w, id: `${lesson.id}_${i}` }));
  }

  if (allWords.length === 0) {
    Router.navigate('lessons');
    return;
  }

  // Pick up to 6 words for matching
  const wordsToPlay = shuffle(allWords).slice(0, Math.min(6, allWords.length));
  
  let leftItems = shuffle(wordsToPlay.map(w => ({ id: w.id, text: w.word, type: 'en' })));
  let rightItems = shuffle(wordsToPlay.map(w => ({ id: w.id, text: w.vi, type: 'vi' })));

  let selectedLeft = null;
  let selectedRight = null;
  let matchedCount = 0;
  let startTime = Date.now();
  let timerInterval = null;

  container.innerHTML = `
    <div class="screen-quiz-match" style="display: flex; flex-direction: column; height: 100%; background: var(--bg);">
      <div style="padding: 16px; display: flex; align-items: center; justify-content: space-between; background: var(--card);">
        <button id="btn-back" style="background: none; border: none; font-size: 24px; color: var(--text-primary); cursor: pointer;">←</button>
        <div style="font-size: 18px; font-weight: bold; color: var(--text-primary);" id="timer-display">00:00</div>
        <div style="font-size: 16px; color: var(--primary); font-weight: bold;">${matchedCount}/${wordsToPlay.length}</div>
      </div>

      <div style="flex: 1; padding: 20px; display: flex; gap: 16px; justify-content: center; align-items: stretch; max-width: 600px; margin: 0 auto; width: 100%; box-sizing: border-box;">
        <div id="col-left" style="flex: 1; display: flex; flex-direction: column; gap: 12px; justify-content: center;">
          ${leftItems.map(item => `
            <button class="match-btn" data-id="${item.id}" data-type="${item.type}" style="padding: 16px; background: var(--card); border: 2px solid var(--surface); border-radius: 12px; color: var(--text-primary); font-size: 16px; font-weight: bold; cursor: pointer; transition: all 0.2s;">
              ${item.text}
            </button>
          `).join('')}
        </div>
        <div id="col-right" style="flex: 1; display: flex; flex-direction: column; gap: 12px; justify-content: center;">
          ${rightItems.map(item => `
            <button class="match-btn" data-id="${item.id}" data-type="${item.type}" style="padding: 16px; background: var(--card); border: 2px solid var(--surface); border-radius: 12px; color: var(--text-primary); font-size: 14px; cursor: pointer; transition: all 0.2s;">
              ${item.text}
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  const timerDisplay = container.querySelector('#timer-display');
  const countDisplay = container.querySelector('div:last-child', container.querySelector('.screen-quiz-match > div'));
  
  timerInterval = setInterval(() => {
    const s = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(s / 60);
    const secs = s % 60;
    timerDisplay.textContent = `${m.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, 1000);

  container.querySelector('#btn-back').addEventListener('click', () => {
    clearInterval(timerInterval);
    Router.navigate('lesson-detail', { lessonId: params.lessonId });
  });

  const checkMatch = async () => {
    if (!selectedLeft || !selectedRight) return;

    const btnLeft = container.querySelector(`button[data-id="${selectedLeft}"][data-type="en"]`);
    const btnRight = container.querySelector(`button[data-id="${selectedRight}"][data-type="vi"]`);

    if (selectedLeft === selectedRight) {
      // Correct
      btnLeft.style.backgroundColor = 'var(--success)';
      btnLeft.style.borderColor = 'var(--success)';
      btnLeft.style.color = 'white';
      btnRight.style.backgroundColor = 'var(--success)';
      btnRight.style.borderColor = 'var(--success)';
      btnRight.style.color = 'white';

      // Update progress
      const progress = await Store.getWordProgress(selectedLeft) || { status: 'new', repetitions: 0, easeFactor: 2.5, interval: 0 };
      const updatedProgress = SRS.processAnswer(progress, 4);
      await Store.updateWordProgress(selectedLeft, updatedProgress);
      await Store.recordActivity(1, 1, 'quiz-match');

      setTimeout(() => {
        btnLeft.style.visibility = 'hidden';
        btnRight.style.visibility = 'hidden';
        matchedCount++;
        // Update matched count text in header
        container.querySelector('.screen-quiz-match > div > div:last-child').textContent = `${matchedCount}/${wordsToPlay.length}`;
        
        if (matchedCount === wordsToPlay.length) {
          clearInterval(timerInterval);
          showResults();
        }
      }, 500);
    } else {
      // Wrong
      btnLeft.style.backgroundColor = 'var(--error)';
      btnLeft.style.borderColor = 'var(--error)';
      btnLeft.style.color = 'white';
      btnRight.style.backgroundColor = 'var(--error)';
      btnRight.style.borderColor = 'var(--error)';
      btnRight.style.color = 'white';

      // Shake effect
      btnLeft.style.transform = 'translateX(-5px)';
      btnRight.style.transform = 'translateX(5px)';
      
      const leftId = selectedLeft; // save id
      const progress = await Store.getWordProgress(leftId) || { status: 'new', repetitions: 0, easeFactor: 2.5, interval: 0 };
      await Store.updateWordProgress(leftId, SRS.processAnswer(progress, 2));

      setTimeout(() => {
        btnLeft.style.transform = 'none';
        btnRight.style.transform = 'none';
        btnLeft.style.backgroundColor = 'var(--card)';
        btnLeft.style.borderColor = 'var(--surface)';
        btnLeft.style.color = 'var(--text-primary)';
        btnRight.style.backgroundColor = 'var(--card)';
        btnRight.style.borderColor = 'var(--surface)';
        btnRight.style.color = 'var(--text-primary)';
      }, 500);
    }

    selectedLeft = null;
    selectedRight = null;
  };

  container.querySelectorAll('.match-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const id = btn.dataset.id;

      // Deselect all of same type
      container.querySelectorAll(`.match-btn[data-type="${type}"]`).forEach(b => {
        if (b.style.visibility !== 'hidden') {
          b.style.borderColor = 'var(--surface)';
        }
      });

      // Select
      btn.style.borderColor = 'var(--primary)';

      if (type === 'en') {
        selectedLeft = id;
      } else {
        selectedRight = id;
      }

      if (selectedLeft && selectedRight) {
        checkMatch();
      }
    });
  });

  const showResults = () => {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    container.innerHTML = `
      <div class="screen-results" style="display: flex; flex-direction: column; height: 100%; background: var(--bg); align-items: center; justify-content: center; padding: 20px;">
        <div style="font-size: 64px; margin-bottom: 24px;">🎮</div>
        <h2 style="margin: 0 0 16px 0; color: var(--text-primary);">Hoàn thành!</h2>
        <div style="font-size: 24px; color: var(--text-secondary); margin-bottom: 32px;">
          Thời gian: <span style="color: var(--primary); font-weight: bold;">${timeTaken}s</span>
        </div>
        <button id="btn-finish" style="background: var(--primary); color: white; border: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; width: 100%; max-width: 300px;">
          Tiếp tục
        </button>
      </div>
    `;
    container.querySelector('#btn-finish').addEventListener('click', () => {
      Router.navigate('lesson-detail', { lessonId: params.lessonId });
    });
  };
}

export function cleanup() {}
