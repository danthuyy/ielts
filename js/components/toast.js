export const Toast = {
  show(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        width: 90%;
        max-width: 400px;
      `;
      document.body.appendChild(container);
    }
    
    const colors = {
      success: 'var(--success, #34d399)',
      error: 'var(--error, #f87171)',
      info: 'var(--primary, #8b5cf6)',
      warning: 'var(--warning, #fbbf24)'
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `
      background: var(--card, #1c1c3a);
      color: var(--text-primary, #e2e8f0);
      padding: 12px 24px;
      border-radius: 8px;
      border-left: 4px solid ${colors[type] || colors.info};
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      font-size: 14px;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s ease;
      text-align: center;
      width: 100%;
    `;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 10);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast);
        }
      }, 300);
    }, duration);
  }
};
