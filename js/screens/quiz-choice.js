import { Router } from '../router.js';
import { Store } from '../store.js';
import { SRS } from '../srs.js';
import { shuffle } from '../utils.js';
import { TTS } from '../tts.js';
import { LESSONS } from '../../data/lessons.js';

export async function render(container, params = {}) {
  let words = [];
  if (params.lessonId) {
    const lesson = LESSONS.find(l => l.id === params.lessonId);
    if (lesson) words = lesson.words.map((w, i) => ({ ...w, id: `${lesson.id}_${i}` }));
  }

  if (words.length === 0) {
    Router.navigate('lessons');
    return;
  }

  let currentIndex = 0;
  let correctCount = 0;
  let reverseMode = false;

  const generateOptions = (currentWord) => {
    let allOptions = [];
    LESSONS.forEach(l => l.words.forEach(w => allOptions.push(w)));
    allOptions = allOptions.filter(w => w.word !== currentWord.word);
    
    let options = shuffle(allOptions).slice(0, 3);
    options.push(currentWord);
    return shuffle(options);
  };

  const renderQuestion = () => {
    if (currentIndex >= words.length) {
      showResults();
      return;
    }

    const currentWord = words[currentIndex];
    const options = generateOptions(currentWord);

    const questionText = reverseMode ? currentWord.vi : currentWord.word;
    const getOptionText = (opt) => reverseMode ? opt.word : opt.vi;

    container.innerHTML = `
      <div class="screen-quiz-choice" style="display: flex; flex-direction: column; height: 100%; background: var(--bg);">
        <div style="padding: 16px; display: flex; align-items: center; justify-content: space-between; background: var(--card);">
          <button id="btn-back" style="background: none; border: none; font-size: 24px; color: var(--text-primary); cursor: pointer;">←</button>
          
          <button id="btn-toggle-mode" style="background: var(--surface); border: none; padding: 6px 12px; border-radius: 12px; color: var(--text-primary); font-size: 14px; cursor: pointer;">
            ${reverseMode ? 'VI → EN' : 'EN → VI'}
          </button>

          <span style="font-size: 14px; color: var(--text-secondary);">${currentIndex + 1}/${words.length}</span>
        </div>
        
        <div style="height: 6px; background: var(--surface); width: 100%;">
          <div style="height: 100%; background: var(--primary); width: ${(currentIndex / words.length) * 100}%; transition: width 0.3s;"></div>
        </div>

        <div style="flex: 1; padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; max-width: 500px; margin: 0 auto; width: 100%; box-sizing: border-box;">
          
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="font-size: 32px; font-weight: bold; color: var(--text-primary); margin-bottom: 8px;">${questionText}</div>
            ${!reverseMode ? `<div style="font-size: 16px; color: var(--text-secondary);">${currentWord.ipa || ''}</div>` : ''}
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
            ${options.map((opt, i) => `
              <button class="choice-btn" data-correct="${opt.word === currentWord.word}" style="padding: 16px 20px; background: var(--card); border: 2px solid var(--surface); border-radius: 12px; color: var(--text-primary); font-size: 16px; text-align: left; cursor: pointer; transition: all 0.2s;">
                <span style="display: inline-block; width: 24px; color: var(--text-secondary);">${String.fromCharCode(65 + i)}.</span>
                ${getOptionText(opt)}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    if (!reverseMode && Store.getSetting('autoSpeak', true)) {
      TTS.speak(currentWord.word);
    }

    container.querySelector('#btn-back').addEventListener('click', () => {
      Router.navigate('lesson-detail', { lessonId: params.lessonId });
    });

    container.querySelector('#btn-toggle-mode').addEventListener('click', () => {
      reverseMode = !reverseMode;
      renderQuestion();
    });

    let answered = false;
    container.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (answered) return;
        answered = true;

        const isCorrect = btn.dataset.correct === 'true';
        
        // Highlight correct and wrong
        container.querySelectorAll('.choice-btn').forEach(b => {
          if (b.dataset.correct === 'true') {
            b.style.backgroundColor = 'var(--success)';
            b.style.borderColor = 'var(--success)';
            b.style.color = 'white';
          }
        });

        if (!isCorrect) {
          btn.style.backgroundColor = 'var(--error)';
          btn.style.borderColor = 'var(--error)';
          btn.style.color = 'white';
        } else {
          correctCount++;
        }

        const progress = await Store.getWordProgress(currentWord.id) || { status: 'new', repetitions: 0, easeFactor: 2.5, interval: 0 };
        const updatedProgress = SRS.processAnswer(progress, isCorrect ? 4 : 2);
        await Store.updateWordProgress(currentWord.id, updatedProgress);
        await Store.recordActivity(1, isCorrect ? 1 : 0, 'quiz-choice');

        if (reverseMode && Store.getSetting('autoSpeak', true)) {
          TTS.speak(currentWord.word);
        }

        setTimeout(() => {
          currentIndex++;
          renderQuestion();
        }, 1500);
      });
    });
  };

  const showResults = () => {
    container.innerHTML = `
      <div class="screen-results" style="display: flex; flex-direction: column; height: 100%; background: var(--bg); align-items: center; justify-content: center; padding: 20px;">
        <div style="font-size: 64px; margin-bottom: 24px;">${correctCount === words.length ? '🏆' : '👍'}</div>
        <h2 style="margin: 0 0 16px 0; color: var(--text-primary);">Kết quả</h2>
        <div style="font-size: 48px; font-weight: bold; color: var(--primary); margin-bottom: 32px;">
          ${correctCount} / ${words.length}
        </div>
        <button id="btn-finish" style="background: var(--primary); color: white; border: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; width: 100%; max-width: 300px;">
          Hoàn thành
        </button>
      </div>
    `;
    container.querySelector('#btn-finish').addEventListener('click', () => {
      Router.navigate('lesson-detail', { lessonId: params.lessonId });
    });
  };

  renderQuestion();
}

export function cleanup() {}
