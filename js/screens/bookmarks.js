import { Router } from '../router.js';
import { Store } from '../store.js';
import { TTS } from '../tts.js';

export async function render(container) {
  const bookmarkedProgs = await Store.getBookmarkedWords();

  container.innerHTML = `
    <div class="screen-bookmarks" style="display: flex; flex-direction: column; height: 100%; background: var(--bg);">
      <div style="padding: 16px; display: flex; align-items: center; gap: 16px; background: var(--card); border-bottom: 1px solid var(--surface);">
        <button id="btn-back" style="background: none; border: none; font-size: 24px; color: var(--text-primary); cursor: pointer;">←</button>
        <h2 style="margin: 0; font-size: 18px; flex: 1;">Từ đã lưu (${bookmarkedProgs.length})</h2>
      </div>

      <div style="flex: 1; overflow-y: auto; padding: 20px; box-sizing: border-box;">
        ${bookmarkedProgs.length > 0 ? `
          <button id="btn-study-bookmarks" style="width: 100%; padding: 16px; margin-bottom: 24px; background: var(--primary); color: white; border: none; border-radius: 12px; font-weight: bold; font-size: 16px; cursor: pointer;">
            Ôn tập từ đã lưu
          </button>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${bookmarkedProgs.map(p => `
              <div class="bookmark-item" data-id="${p.id}" data-word="${p.word.word}" style="background: var(--card); padding: 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <strong style="font-size: 16px; color: var(--text-primary);">${p.word.word}</strong>
                  </div>
                  <div style="font-size: 14px; color: var(--text-secondary);">${p.word.vi}</div>
                </div>
                <div style="display: flex; gap: 12px;">
                  <button class="btn-speak" style="background: none; border: none; font-size: 20px; cursor: pointer;">🔊</button>
                  <button class="btn-remove" style="background: none; border: none; font-size: 20px; color: var(--warning); cursor: pointer;">★</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="text-align: center; color: var(--text-secondary); margin-top: 40px;">
            <div style="font-size: 48px; margin-bottom: 16px;">⭐</div>
            <div>Bạn chưa lưu từ nào.<br>Hãy nhấn vào biểu tượng sao ở các từ để lưu lại nhé!</div>
          </div>
        `}
      </div>
    </div>
  `;

  container.querySelector('#btn-back').addEventListener('click', () => {
    Router.navigate('settings');
  });

  if (bookmarkedProgs.length > 0) {
    container.querySelector('#btn-study-bookmarks').addEventListener('click', () => {
      Router.navigate('flashcard', { words: bookmarkedProgs.map(p => p.word) });
    });

    container.querySelectorAll('.bookmark-item').forEach(item => {
      item.querySelector('.btn-speak').addEventListener('click', (e) => {
        e.stopPropagation();
        TTS.speak(item.dataset.word);
      });

      item.querySelector('.btn-remove').addEventListener('click', async (e) => {
        e.stopPropagation();
        await Store.toggleBookmark(item.dataset.id);
        render(container); // re-render
      });
    });
  }
}

export function cleanup() {}
