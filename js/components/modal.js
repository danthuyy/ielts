export const Modal = {
  show(title, content, actions = []) {
    let container = document.getElementById('modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modal-container';
      document.body.appendChild(container);
    }
    
    const actionsHtml = actions.map((action, index) => {
      const color = action.type === 'primary' ? 'var(--primary, #8b5cf6)' :
                    action.type === 'danger' ? 'var(--error, #f87171)' : 'var(--surface, #13132b)';
      const textColor = action.type === 'secondary' ? 'var(--text-primary, #e2e8f0)' : 'white';
      return `<button id="modal-btn-${index}" style="
        background: ${color};
        color: ${textColor};
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
        flex: 1;
        margin: 0 4px;
      ">${action.label}</button>`;
    }).join('');
    
    container.innerHTML = `
      <div id="modal-overlay" style="
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      ">
        <div style="
          background: var(--card, #1c1c3a);
          border-radius: 16px;
          padding: 24px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          border: 1px solid var(--border-color, #2a2a4a);
        ">
          <h3 style="margin-top: 0; margin-bottom: 16px; color: var(--text-primary, #e2e8f0); text-align: center;">${title}</h3>
          <div style="margin-bottom: 24px; color: var(--text-secondary, #94a3b8); font-size: 14px; text-align: center;">
            ${content}
          </div>
          <div style="display: flex; justify-content: center;">
            ${actionsHtml}
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') {
        this.hide();
      }
    });
    
    actions.forEach((action, index) => {
      document.getElementById(`modal-btn-${index}`).addEventListener('click', () => {
        if (action.onClick) action.onClick();
        this.hide();
      });
    });
  },
  
  hide() {
    const container = document.getElementById('modal-container');
    if (container) {
      container.innerHTML = '';
    }
  }
};
