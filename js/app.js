import { Router } from './router.js';
import { Store } from './store.js';
import { TTS } from './tts.js';
import { Sync } from './sync.js';

// Screen imports
import * as HomeScreen from './screens/home.js';
import * as LessonsScreen from './screens/lessons.js';
import * as FlashcardScreen from './screens/flashcard.js';
import * as QuizTypeScreen from './screens/quiz-type.js';
import * as QuizListenScreen from './screens/quiz-listen.js';
import * as QuizMatchScreen from './screens/quiz-match.js';
import * as QuizChoiceScreen from './screens/quiz-choice.js';
import * as TestScreen from './screens/test.js';
import * as ReviewScreen from './screens/review.js';
import * as StatsScreen from './screens/stats.js';
import * as BookmarksScreen from './screens/bookmarks.js';
import * as SettingsScreen from './screens/settings.js';

async function init() {
  try {
    await Store.init();
  } catch (e) {
    console.error('Store init error:', e);
  }

  try {
    TTS.init();
  } catch (e) {
    console.error('TTS init error:', e);
  }
  
  // Register screens
  Router.register('home', HomeScreen);
  Router.register('lessons', LessonsScreen);
  Router.register('lesson-detail', LessonsScreen);
  Router.register('flashcard', FlashcardScreen);
  Router.register('quiz-type', QuizTypeScreen);
  Router.register('quiz-listen', QuizListenScreen);
  Router.register('quiz-match', QuizMatchScreen);
  Router.register('quiz-choice', QuizChoiceScreen);
  Router.register('test', TestScreen);
  Router.register('review', ReviewScreen);
  Router.register('stats', StatsScreen);
  Router.register('bookmarks', BookmarksScreen);
  Router.register('settings', SettingsScreen);
  
  // Pull remote progress before the first screen paints, so opening the app
  // on any device shows the up-to-date state without a manual refresh.
  try {
    await Sync.start();
  } catch (e) {
    console.error('Sync start error:', e);
  }

  // A pull that lands later (tab regained focus, network came back) must
  // repaint whatever screen is showing.
  window.addEventListener('sync:pulled', () => {
    Router.handleHashChange().catch(err => console.error('Re-render error:', err));
  });

  try {
    await Router.init();
  } catch (e) {
    // Never leave the user on a silent blank screen.
    console.error('Router init error:', e);
    const app = document.getElementById('app');
    if (app && !app.innerHTML.trim()) {
      app.innerHTML = `<div style="padding:24px;color:var(--text-primary);font-family:inherit;">
        <h2 style="margin:0 0 8px 0;">Có lỗi khi tải ứng dụng</h2>
        <p style="color:var(--text-secondary);margin:0 0 16px 0;">${e.message}</p>
        <button onclick="location.reload()" style="padding:12px 20px;border-radius:8px;border:none;background:var(--primary);color:#fff;cursor:pointer;">Tải lại</button>
      </div>`;
    }
  }
}

// Start app. Module scripts are deferred, but guard in case DOM is already ready.
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
