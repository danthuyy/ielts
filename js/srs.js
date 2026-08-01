import { getToday } from './utils.js';

export const SRS = {
  processAnswer(cardProgress, quality) {
    let { repetitions, interval, easeFactor, status } = cardProgress;
    
    if (quality < 3) {
      repetitions = 0;
      interval = 1;
      status = 'learning';
    } else {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions++;
    }
    
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;
    
    if (status === 'new' && quality >= 3) {
      status = 'learning';
    }
    
    if (status === 'learning' && repetitions >= 3 && interval >= 21) {
      status = 'mastered';
    }

    const nextReview = this.getNextReviewDate(interval);
    
    return {
      repetitions,
      interval,
      easeFactor,
      nextReview,
      status
    };
  },
  
  isCardDue(cardProgress) {
    const today = getToday();
    return cardProgress.nextReview <= today;
  },
  
  getNextReviewDate(interval) {
    const date = new Date();
    date.setDate(date.getDate() + interval);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};
