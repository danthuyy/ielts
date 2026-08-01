export const Store = {
  db: null,
  
  async init() {
    this.db = new window.Dexie('IELTSVocabDB');
    this.db.version(1).stores({
      wordProgress: '&id, lessonId, status, nextReview, bookmarked',
      testHistory: '++id, date, lessonId, mode',
      dailyActivity: '&date'
    });
  },
  
  async getWordProgress(id) {
    return await this.db.wordProgress.get(id);
  },
  
  async getAllProgress(lessonId = null) {
    if (lessonId) {
      return await this.db.wordProgress.where('lessonId').equals(lessonId).toArray();
    }
    return await this.db.wordProgress.toArray();
  },
  
  async updateWordProgress(id, data) {
    const existing = await this.getWordProgress(id);
    if (existing) {
        await this.db.wordProgress.update(id, data);
    } else {
        await this.db.wordProgress.put({ ...data, id });
    }
  },
  
  async initWordProgress(lessonId, wordIndex, word) {
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
    }
    return await this.getWordProgress(id);
  },
  
  async getWordsForReview() {
    const today = this.getTodayStr();
    return await this.db.wordProgress
      .where('nextReview')
      .belowOrEqual(today)
      .filter(w => w.status !== 'new')
      .toArray();
  },
  
  async getDueCount() {
    const words = await this.getWordsForReview();
    return words.length;
  },
  
  async getOverallStats() {
    const words = await this.getAllProgress();
    const total = words.length;
    const newCount = words.filter(w => w.status === 'new').length;
    const learning = words.filter(w => w.status === 'learning').length;
    const mastered = words.filter(w => w.status === 'mastered').length;
    return { total, newCount, learning, mastered };
  },
  
  async getLessonStats(lessonId) {
    const words = await this.getAllProgress(lessonId);
    const total = words.length;
    const newCount = words.filter(w => w.status === 'new').length;
    const learning = words.filter(w => w.status === 'learning').length;
    const mastered = words.filter(w => w.status === 'mastered').length;
    return { total, newCount, learning, mastered };
  },
  
  async toggleBookmark(id) {
    const word = await this.getWordProgress(id);
    if (word) {
      word.bookmarked = !word.bookmarked;
      await this.updateWordProgress(id, { bookmarked: word.bookmarked });
      return word.bookmarked;
    }
    return false;
  },
  
  async getBookmarkedWords() {
    return await this.db.wordProgress.where('bookmarked').equals(true).toArray();
  },
  
  async saveTestResult(result) {
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
    if (lessonId) {
      return await this.db.testHistory.where('lessonId').equals(lessonId).toArray();
    }
    return await this.db.testHistory.toArray();
  },
  
  async recordActivity(wordsStudied, wordsCorrect, mode) {
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
  },
  
  async getStreak() {
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
    const today = new Date();
    today.setHours(0,0,0,0);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 6);
    
    const startStr = this.formatDateStr(lastWeek);
    const endStr = this.formatDateStr(today);
    
    return await this.db.dailyActivity.where('date').between(startStr, endStr, true, true).toArray();
  },
  
  async getMonthlyActivity() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const lastMonth = new Date(today);
    lastMonth.setDate(lastMonth.getDate() - 29);
    
    const startStr = this.formatDateStr(lastMonth);
    const endStr = this.formatDateStr(today);
    
    return await this.db.dailyActivity.where('date').between(startStr, endStr, true, true).toArray();
  },
  
  getSetting(key, defaultValue) {
    const val = localStorage.getItem(`ielts_setting_${key}`);
    return val !== null ? JSON.parse(val) : defaultValue;
  },
  
  setSetting(key, value) {
    localStorage.setItem(`ielts_setting_${key}`, JSON.stringify(value));
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
