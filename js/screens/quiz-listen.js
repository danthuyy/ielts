import { Router } from '../router.js';
import { Store } from '../store.js';
import { SRS } from '../srs.js';
import { TTS } from '../tts.js';
import { LESSONS } from '../../data/lessons.js';
import * as Keys from '../keys.js';
import * as Gestures from '../gestures.js';
import { VoicePicker } from '../components/voice-picker.js';

let detachGestures = null;
let detachVoicePicker = null;

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
  let hasChecked = false;

  const renderQuestion = () => {
    if (currentIndex >= words.length) {
      showResults();
      return;
    }

    const currentWord = words[currentIndex];
    const touch = Gestures.isTouchDevice();
    hasChecked = false;

    container.innerHTML = `
      <div class="screen-quiz-listen" style="display: flex; flex-direction: column; height: 100%; background: var(--bg);">
        <div style="padding: 16px; display: flex; align-items: center; gap: 16px; background: var(--card);">
          <button id="btn-back" style="background: none; border: none; font-size: 24px; color: var(--text-primary); cursor: pointer;">←</button>
          <div style="flex: 1; height: 6px; background: var(--surface); border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; background: var(--primary); width: ${(currentIndex / words.length) * 100}%;"></div>
          </div>
          ${VoicePicker.render()}
          <span style="font-size: 14px; color: var(--text-secondary);">${currentIndex + 1}/${words.length}</span>
        </div>

        <div style="flex: 1; padding: 24px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          
          <button id="btn-listen" style="width: 100px; height: 100px; border-radius: 50%; background: var(--primary); color: white; border: none; font-size: 40px; cursor: pointer; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);">
            🔊
          </button>
          <div style="color: var(--text-secondary); font-size: 14px; margin-bottom: 32px;">Nhấn để nghe lại</div>

          <div style="width: 100%; max-width: 400px; margin-bottom: 16px;">
            <input type="text" id="type-input" autocomplete="off" placeholder="Gõ từ bạn nghe được..." style="width: 100%; padding: 16px; font-size: 20px; text-align: center; border-radius: 12px; border: 2px solid var(--surface); background: var(--card); color: var(--text-primary); outline: none; box-sizing: border-box;">
          </div>
          
          <div id="feedback-area" style="min-height: 80px; width: 100%; max-width: 400px; text-align: center; margin-bottom: 24px; display: flex; flex-direction: column; justify-content: center;"></div>

          <button id="btn-action" style="width: 100%; max-width: 400px; padding: 16px; border-radius: 12px; border: none; background: var(--primary); color: white; font-size: 18px; font-weight: bold; cursor: pointer;">
            Kiểm tra
          </button>

          ${touch
            ? Gestures.gestureHint([['👆↑', 'vuốt lên: nghe lại']])
            : Keys.hintBar([
                [['Enter'], 'kiểm tra / tiếp tục'],
                [['↑'], 'nghe lại'],
                [['Esc'], 'thoát']
              ])}
        </div>
      </div>
    `;

    const input = container.querySelector('#type-input');
    const btnAction = container.querySelector('#btn-action');
    const btnListen = container.querySelector('#btn-listen');
    const feedbackArea = container.querySelector('#feedback-area');

    input.focus();

    const playAudio = () => TTS.speakSlow(currentWord.word);
    
    btnListen.addEventListener('click', playAudio);
    
    // Auto play on render
    setTimeout(playAudio, 300);

    container.querySelector('#btn-back').addEventListener('click', () => {
      Router.navigate('lesson-detail', { lessonId: params.lessonId });
    });

    const checkAnswer = async () => {
      if (hasChecked) {
        currentIndex++;
        renderQuestion();
        return;
      }

      const answer = input.value.trim().toLowerCase();
      const isCorrect = answer === currentWord.word.toLowerCase();
      
      hasChecked = true;
      input.disabled = true;

      const progress = await Store.getWordProgress(currentWord.id) || { status: 'new', repetitions: 0, easeFactor: 2.5, interval: 0 };
      const updatedProgress = SRS.processAnswer(progress, isCorrect ? 4 : 2);
      await Store.updateWordProgress(currentWord.id, updatedProgress);
      await Store.recordActivity(1, isCorrect ? 1 : 0, 'quiz-listen');

      if (isCorrect) {
        correctCount++;
        input.style.borderColor = 'var(--success)';
        input.style.color = 'var(--success)';
        feedbackArea.innerHTML = `
          <div style="color: var(--success); font-size: 20px; font-weight: bold; margin-bottom: 8px;">✅ Chính xác!</div>
          <div style="color: var(--text-primary); font-size: 16px;">${currentWord.vi}</div>
        `;
      } else {
        input.style.borderColor = 'var(--error)';
        input.style.color = 'var(--error)';
        feedbackArea.innerHTML = `
          <div style="color: var(--error); font-size: 18px; font-weight: bold; margin-bottom: 4px;">❌ Sai rồi</div>
          <div style="color: var(--success); font-size: 20px;">${currentWord.word}</div>
          <div style="color: var(--text-secondary); font-size: 14px; margin-bottom: 4px;">${currentWord.ipa || ''}</div>
          <div style="color: var(--text-primary); font-size: 16px;">${currentWord.vi}</div>
        `;
      }

      btnAction.textContent = 'Tiếp tục →';
    };

    btnAction.addEventListener('click', checkAnswer);

    // Global, not input-scoped: the input is disabled after checking, so an
    // input-bound Enter could not advance to the next word.
    // ArrowUp rather than a letter: the caret sits in the answer box the whole
    // time, so a letter key would be typed instead of replaying the audio.
    Keys.bind({
      'Enter': checkAnswer,
      'ArrowUp': playAudio,
      'r': playAudio,
      'Escape': () => Router.navigate('lesson-detail', { lessonId: params.lessonId })

    }, { allowWhileTyping: ['Enter', 'ArrowUp', 'Escape'] });

    if (detachVoicePicker) detachVoicePicker();
    detachVoicePicker = VoicePicker.attach(container);

    if (detachGestures) detachGestures();
    detachGestures = Gestures.onSwipe(container.querySelector('.screen-quiz-listen'), {
      up: playAudio
    });
  };

  const showResults = () => {
    Keys.bind({ 'Enter': () => Router.navigate('lesson-detail', { lessonId: params.lessonId }) });
    container.innerHTML = `
      <div class="screen-results" style="display: flex; flex-direction: column; height: 100%; background: var(--bg); align-items: center; justify-content: center; padding: 20px;">
        <div style="font-size: 64px; margin-bottom: 24px;">${correctCount === words.length ? '🏆' : '👏'}</div>
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

export function cleanup() {
  Keys.unbind();
  if (detachGestures) { detachGestures(); detachGestures = null; }
  if (detachVoicePicker) { detachVoicePicker(); detachVoicePicker = null; }
}
