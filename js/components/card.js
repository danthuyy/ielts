export const FlashCard = {
  render(word, isFlipped, isBookmarked = false) {
    const flippedClass = isFlipped ? 'flipped' : '';
    const bookmarkIcon = isBookmarked ? '⭐' : '☆';
    const bookmarkColor = isBookmarked ? 'var(--warning, #fbbf24)' : 'var(--text-secondary, #94a3b8)';
    
    return `
      <style>
        .flashcard-container {
          perspective: 1000px;
          width: 100%;
          height: 100%;      /* was a fixed 400px inside a 350px box, so the
                                card spilled over the hint text below it */
          margin: 0 auto;
        }
        .flashcard {
          width: 100%;
          height: 100%;
          position: relative;
          transition: transform 0.6s;
          transform-style: preserve-3d;
          cursor: pointer;
        }
        .flashcard.flipped {
          transform: rotateY(180deg);
        }
        .flashcard-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          background: var(--card, #1c1c3a);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          border: 1px solid var(--border-color, #2a2a4a);
        }
        .flashcard-back {
          transform: rotateY(180deg);
          overflow-y: auto;
        }
        .word-large {
          font-size: 32px;
          font-weight: bold;
          color: var(--primary, #8b5cf6);
          margin-bottom: 8px;
          text-align: center;
          margin-top: auto;
        }
        .word-pos {
          color: var(--text-secondary, #94a3b8);
          font-size: 16px;
          text-align: center;
          margin-bottom: auto;
        }
        .word-ipa {
          color: var(--text-secondary, #94a3b8);
          font-size: 16px;
          text-align: center;
          margin-bottom: 16px;
        }
        .word-vi {
          color: var(--success, #34d399);
          font-size: 20px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 24px;
        }
        .box {
          background: var(--surface, #13132b);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
        }
        .box-title {
          font-size: 12px;
          color: var(--text-secondary, #94a3b8);
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .collocation {
          color: var(--info, #60a5fa);
          font-size: 14px;
        }
        .example {
          font-style: italic;
          color: var(--text-primary, #e2e8f0);
          font-size: 14px;
        }
        .speak-btn {
          background: var(--surface, #13132b);
          border: none;
          color: var(--primary, #8b5cf6);
          border-radius: 50%;
          width: 48px;
          height: 48px;
          font-size: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 16px auto;
        }
        .bookmark-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 24px;
          color: ${bookmarkColor};
          cursor: pointer;
          z-index: 10;
        }
      </style>
      <div class="flashcard-container">
        <div class="flashcard ${flippedClass}" id="flashcard">
          <!-- Front -->
          <div class="flashcard-face">
            <button class="bookmark-btn" id="bookmark-btn">${bookmarkIcon}</button>
            <div class="word-large">${word.word}</div>
            <div class="word-pos">(${word.pos})</div>
            <button class="speak-btn" id="speak-btn">🔊</button>
          </div>
          <!-- Back -->
          <div class="flashcard-face flashcard-back">
            <button class="bookmark-btn" id="bookmark-btn-back">${bookmarkIcon}</button>
            <div class="word-large" style="margin-top: 0;">${word.word}</div>
            <div class="word-ipa">${word.ipa}</div>
            <div class="word-vi">${word.vi}</div>
            
            <div class="box">
              <div class="box-title">Collocation</div>
              <div class="collocation">${word.collocation}</div>
            </div>
            
            <div class="box">
              <div class="box-title">Example</div>
              <div class="example">${word.example}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
