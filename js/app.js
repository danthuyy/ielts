import { Router } from './router.js';
import { Store } from './store.js';
import { TTS } from './tts.js';

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
  await Store.init();
  TTS.init();
  
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
  
  Router.init();
}

// Start app
window.addEventListener('DOMContentLoaded', init);
