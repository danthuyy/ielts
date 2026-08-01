import { Router } from '../router.js';
import { Store } from '../store.js';
import { shuffle } from '../utils.js';
import { LESSONS } from '../../data/lessons.js';
// We'll reuse logic from other screens for test, but simpler since we just present UI.

export async function render(container, params = {}) {
  let words = [];
  if (params.lessonId) {
    const lesson = LESSONS.find(l => l.id === params.lessonId);
    if (lesson) words = lesson.words.map((w, i) => ({ ...w, id: `${lesson.id}_${i}` }));
  } else {
    // If no lessonId, pick random words from all
    LESSONS.forEach(l => {
      l.words.forEach((w, i) => words.push({ ...w, id: `${l.id}_${i}` }));
    });
  }

  // Pick up to 15 words for a test
  words = shuffle(words).slice(0, 15);

  if (words.length === 0) {
    Router.navigate('lessons');
    return;
  }

  let currentIndex = 0;
  let correctCount = 0;
  let startTime = Date.now();
  let questions = words.map(w => {
    // Randomize mode: 0=choice, 1=type, 2=listen
    return { word: w, mode: Math.floor(Math.random() * 3) };
  });

  const generateOptions = (currentWord) => {
    let allOptions = [];
    LESSONS.forEach(l => l.words.forEach(w => allOptions.push(w)));
    allOptions = allOptions.filter(w => w.word !== currentWord.word);
    let options = shuffle(allOptions).slice(0, 3);
    options.push(currentWord);
    return shuffle(options);
  };

  const renderQuestion = () => {
    if (currentIndex >= questions.length) {
      showResults();
      return;
    }

    const q = questions[currentIndex];
    const currentWord = q.word;

    let contentHtml = '';
    
    if (q.mode === 0) {
      // Choice
      const options = generateOptions(currentWord);
      contentHtml = `
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="font-size: 32px; font-weight: bold; color: var(--text-primary); margin-bottom: 8px;">${currentWord.word}</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
          ${options.map((opt, i) => `
            <button class="test-choice-btn" data-correct="${opt.word === currentWord.word}" style="padding: 16px; background: var(--card); border: 2px solid var(--surface); border-radius: 12px; color: var(--text-primary); font-size: 16px; text-align: left; cursor: pointer;">
              ${opt.vi}
            </button>
          `).join('')}
        </div>
      `;
    } else if (q.mode === 1) {
      // Type
      contentHtml = `
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="font-size: 24px; font-weight: bold; color: var(--text-primary); margin-bottom: 8px;">${currentWord.vi}</div>
        </div>
        <input type="text" id="test-input" placeholder="Nhập tiếng Anh..." style="width: 100%; padding: 16px; font-size: 20px; text-align: center; border-radius: 12px; border: 2px solid var(--surface); background: var(--card); color: var(--text-primary); outline: none; margin-bottom: 24px;">
        <button id="btn-submit" style="width: 100%; padding: 16px; border-radius: 12px; border: none; background: var(--primary); color: white; font-size: 18px; font-weight: bold; cursor: pointer;">Kiểm tra</button>
      `;
    } else {
      // Listen (mocked visually if TTS not available in same way, but let's assume we can play later)
      contentHtml = `
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🎧</div>
          <div style="color: var(--text-secondary);">Nghe và viết lại</div>
        </div>
        <input type="text" id="test-input" placeholder="Nhập từ..." style="width: 100%; padding: 16px; font-size: 20px; text-align: center; border-radius: 12px; border: 2px solid var(--surface); background: var(--card); color: var(--text-primary); outline: none; margin-bottom: 24px;">
        <button id="btn-submit" style="width: 100%; padding: 16px; border-radius: 12px; border: none; background: var(--primary); color: white; font-size: 18px; font-weight: bold; cursor: pointer;">Kiểm tra</button>
      `;
    }

    container.innerHTML = `
      <div class="screen-test" style="display: flex; flex-direction: column; height: 100%; background: var(--bg);">
        <div style="padding: 16px; display: flex; align-items: center; justify-content: space-between; background: var(--card);">
          <button id="btn-cancel" style="background: none; border: none; font-size: 24px; color: var(--text-primary); cursor: pointer;">✕</button>
          <div style="flex: 1; margin: 0 16px; height: 6px; background: var(--surface); border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; background: var(--primary); width: ${(currentIndex / questions.length) * 100}%;"></div>
          </div>
          <span style="font-size: 14px; color: var(--text-secondary);">${currentIndex + 1}/${questions.length}</span>
        </div>

        <div style="flex: 1; padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; max-width: 500px; margin: 0 auto; width: 100%; box-sizing: border-box;">
          ${contentHtml}
        </div>
      </div>
    `;

    // Handle interactions
    container.querySelector('#btn-cancel').addEventListener('click', () => {
      Router.navigate(params.lessonId ? 'lesson-detail' : 'home', { lessonId: params.lessonId });
    });

    if (q.mode === 0) {
      container.querySelectorAll('.test-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.dataset.correct === 'true') correctCount++;
          currentIndex++;
          renderQuestion();
        });
      });
    } else {
      const handleInputSubmit = () => {
        const input = container.querySelector('#test-input');
        if (input.value.trim().toLowerCase() === currentWord.word.toLowerCase()) {
          correctCount++;
        }
        currentIndex++;
        renderQuestion();
      };
      
      container.querySelector('#btn-submit').addEventListener('click', handleInputSubmit);
      container.querySelector('#test-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleInputSubmit();
      });
      container.querySelector('#test-input').focus();
    }
  };

  const showResults = async () => {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    const score = Math.round((correctCount / questions.length) * 100);

    // Save test result
    await Store.saveTestResult({
      date: new Date().toISOString(),
      lessonId: params.lessonId || 'all',
      mode: 'mixed',
      score,
      total: questions.length,
      duration,
      words: questions.map(q => q.word.id)
    });

    container.innerHTML = `
      <div class="screen-results" style="display: flex; flex-direction: column; height: 100%; background: var(--bg); align-items: center; justify-content: center; padding: 20px;">
        <div style="font-size: 64px; margin-bottom: 24px;">${score >= 80 ? '🏆' : '👏'}</div>
        <h2 style="margin: 0 0 16px 0; color: var(--text-primary);">Hoàn thành bài kiểm tra!</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px; width: 100%; max-width: 300px;">
          <div style="background: var(--card); padding: 16px; border-radius: 12px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: var(--primary);">${score}%</div>
            <div style="font-size: 12px; color: var(--text-secondary);">Điểm số</div>
          </div>
          <div style="background: var(--card); padding: 16px; border-radius: 12px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: var(--info);">${Math.floor(duration/60)}:${(duration%60).toString().padStart(2,'0')}</div>
            <div style="font-size: 12px; color: var(--text-secondary);">Thời gian</div>
          </div>
        </div>

        <button id="btn-finish" style="background: var(--primary); color: white; border: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; width: 100%; max-width: 300px;">
          Kết thúc
        </button>
      </div>
    `;
    container.querySelector('#btn-finish').addEventListener('click', () => {
      Router.navigate(params.lessonId ? 'lesson-detail' : 'home', { lessonId: params.lessonId });
    });
  };

  renderQuestion();
}

export function cleanup() {}
