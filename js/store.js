import { LESSONS } from '../data/lessons.js';

const SETTING_PREFIX = 'ielts_setting_';

export const Store = {
  db: null,
  // Sync hooks into this so any local write schedules an upload.
  onChange: null,

  notifyChange() {
    if (typeof this.onChange === 'function') this.onChange();
  },

  // Whole-account snapshot, used by sync and by manual backup.
  async exportAll() {
    const settings = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SETTING_PREFIX)) {
        settings[key.slice(SETTING_PREFIX.length)] = localStorage.getItem(key);
      }
    }
    if (!this.db) return { version: 1, settings, wordProgress: [], testHistory: [], dailyActivity: [] };
    const [wordProgress, testHistory, dailyActivity] = await Promise.all([
      this.db.wordProgress.toArray(),
      this.db.testHistory.toArray(),
      this.db.dailyActivity.toArray()
    ]);
    return { version: 1, settings, wordProgress, testHistory, dailyActivity };
  },

  // Replaces local state wholesale — callers decide which side wins first.
  async importAll(data) {
    if (!data || typeof data !== 'object') return false;
    if (data.settings && typeof data.settings === 'object') {
      for (const [key, value] of Object.entries(data.settings)) {
        localStorage.setItem(SETTING_PREFIX + key, value);
      }
    }
    if (!this.db) return false;
    await this.db.transaction('rw', this.db.wordProgress, this.db.testHistory, this.db.dailyActivity, async () => {
      if (Array.isArray(data.wordProgress)) {
        await this.db.wordProgress.clear();
        await this.db.wordProgress.bulkPut(data.wordProgress);
      }
      if (Array.isArray(data.testHistory)) {
        await this.db.testHistory.clear();
        await this.db.testHistory.bulkPut(data.testHistory);
      }
      if (Array.isArray(data.dailyActivity)) {
        await this.db.dailyActivity.clear();
        await this.db.dailyActivity.bulkPut(data.dailyActivity);
      }
    });
    return true;
  },

  async init() {
    try {
      const DexieClass = window.Dexie;
      if (!DexieClass) {
        console.warn('Dexie not available globally');
        return;
      }
      this.db = new DexieClass('IELTSVocabDB');
      this.db.version(1).stores({
        wordProgress: '&id, lessonId, status, nextReview, bookmarked',
        testHistory: '++id, date, lessonId, mode',
        dailyActivity: '&date'
      });
      await this.db.open();

      // Populate initial progress records for all words across all lessons if empty
      const count = await this.db.wordProgress.count();
      if (count === 0) {
        for (const lesson of LESSONS) {
          for (let i = 0; i < lesson.words.length; i++) {
            await this.initWordProgress(lesson.id, i, lesson.words[i].word);
          }
        }
      }
    } catch (err) {
      console.error('Failed to initialize IndexedDB store:', err);
    }
  },
  
  async getWordProgress(id) {
    if (!this.db) return null;
    return await this.db.wordProgress.get(id);
  },
  
  async getAllProgress(lessonId = null) {
    if (!this.db) return [];
    if (lessonId) {
      return await this.db.wordProgress.where('lessonId').equals(lessonId).toArray();
    }
    return await this.db.wordProgress.toArray();
  },
  
  async updateWordProgress(id, data) {
    if (!this.db) return;
    const existing = await this.getWordProgress(id);
    if (existing) {
        await this.db.wordProgress.update(id, data);
    } else {
        await this.db.wordProgress.put({ ...data, id });
    }
    this.notifyChange();
  },
  
  async initWordProgress(lessonId, wordIndex, word) {
    if (!this.db) return null;
    const id = `${lessonId}_${wordIndex}`;
    const existing = await this.getWordProgress(id);
    if (!existing) {
      await this.db.wordProgress.put({
        id,
        lessonId,
        wordIndex,
        word,
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReview: this.getTodayStr(),
        status: 'new',
        correctCount: 0,
        totalCount: 0,
        bookmarked: false,
        lastReviewed: null
      });
      this.notifyChange();
    }
    return await this.getWordProgress(id);
  },
  
  async getWordsForReview() {
    if (!this.db) return [];
    const today = this.getTodayStr();
    return await this.db.wordProgress
      .where('nextReview')
      .belowOrEqual(today)
      .filter(w => w.status !== 'new')
      .toArray();
  },
  
  async getDueCount() {
    if (!this.db) return 0;
    const words = await this.getWordsForReview();
    return words.length;
  },
  
  async getOverallStats() {
    if (!this.db) return { total: LESSONS.reduce((acc, l) => acc + l.words.length, 0), newCount: 0, learning: 0, mastered: 0 };
    const words = await this.getAllProgress();
    const total = words.length || LESSONS.reduce((acc, l) => acc + l.words.length, 0);
    const newCount = words.filter(w => w.status === 'new').length;
    const learning = words.filter(w => w.status === 'learning').length;
    const mastered = words.filter(w => w.status === 'mastered').length;
    return { total, newCount, learning, mastered };
  },
  
  async getLessonStats(lessonId) {
    if (!this.db) return { total: 0, newCount: 0, learning: 0, mastered: 0 };
    const words = await this.getAllProgress(lessonId);
    const total = words.length;
    const newCount = words.filter(w => w.status === 'new').length;
    const learning = words.filter(w => w.status === 'learning').length;
    const mastered = words.filter(w => w.status === 'mastered').length;
    return { total, newCount, learning, mastered };
  },
  
  async toggleBookmark(id) {
    if (!this.db) return false;
    const word = await this.getWordProgress(id);
    if (word) {
      word.bookmarked = !word.bookmarked;
      await this.updateWordProgress(id, { bookmarked: word.bookmarked });
      return word.bookmarked;
    }
    return false;
  },
  
  async getBookmarkedWords() {
    if (!this.db) return [];
    // IndexedDB cannot index booleans, so filter instead of using where().
    return await this.db.wordProgress.filter(w => w.bookmarked === true).toArray();
  },
  
  async saveTestResult(result) {
    if (!this.db) return;
    this.notifyChange();
    return await this.db.testHistory.add({
      date: new Date().toISOString(),
      lessonId: result.lessonId,
      mode: result.mode,
      score: result.score,
      total: result.total,
      duration: result.duration,
      words: result.words
    });
  },
  
  async getTestHistory(lessonId = null) {
    if (!this.db) return [];
    if (lessonId) {
      return await this.db.testHistory.where('lessonId').equals(lessonId).toArray();
    }
    return await this.db.testHistory.toArray();
  },
  
  async recordActivity(wordsStudied, wordsCorrect, mode) {
    if (!this.db) return;
    const today = this.getTodayStr();
    const activity = await this.db.dailyActivity.get(today) || {
      date: today,
      wordsStudied: 0,
      wordsCorrect: 0,
      minutesSpent: 0,
      modes: []
    };
    
    activity.wordsStudied += wordsStudied;
    activity.wordsCorrect += wordsCorrect;
    if (!activity.modes.includes(mode)) {
      activity.modes.push(mode);
    }
    
    await this.db.dailyActivity.put(activity);
    this.notifyChange();
  },
  
  async getStreak() {
    if (!this.db) return 0;
    let streak = 0;
    const activities = await this.db.dailyActivity.orderBy('date').reverse().toArray();
    if (activities.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let currentDate = today;
    
    if (activities[0].date === this.formatDateStr(today)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
        for (let i = 1; i < activities.length; i++) {
            if (activities[i].date === this.formatDateStr(currentDate)) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }
    } else {
        currentDate.setDate(currentDate.getDate() - 1);
        for (let i = 0; i < activities.length; i++) {
            if (activities[i].date === this.formatDateStr(currentDate)) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }
    }
    return streak;
  },
  
  async getWeeklyActivity() {
    if (!this.db) return [];
    const today = new Date();
    today.setHours(0,0,0,0);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 6);
    
    const startStr = this.formatDateStr(lastWeek);
    const endStr = this.formatDateStr(today);
    
    return await this.db.dailyActivity.where('date').between(startStr, endStr, true, true).toArray();
  },
  
  async getMonthlyActivity() {
    if (!this.db) return [];
    const today = new Date();
    today.setHours(0,0,0,0);
    const lastMonth = new Date(today);
    lastMonth.setDate(lastMonth.getDate() - 29);
    
    const startStr = this.formatDateStr(lastMonth);
    const endStr = this.formatDateStr(today);
    
    return await this.db.dailyActivity.where('date').between(startStr, endStr, true, true).toArray();
  },
  
  getSetting(key, defaultValue) {
    const val = localStorage.getItem(SETTING_PREFIX + key);
    if (val === null) return defaultValue;
    try {
      return JSON.parse(val);
    } catch {
      return defaultValue;
    }
  },
  
  setSetting(key, value) {
    localStorage.setItem(SETTING_PREFIX + key, JSON.stringify(value));
    this.notifyChange();
  },
  
  getTodayStr() {
    return this.formatDateStr(new Date());
  },
  
  formatDateStr(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};
