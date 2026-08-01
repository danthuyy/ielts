export const ProgressRing = {
  render(percentage, size = 80, color = 'var(--primary, #8b5cf6)', label = '') {
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    
    return `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <svg width="${size}" height="${size}" style="transform: rotate(-90deg);">
          <circle 
            cx="${size/2}" cy="${size/2}" r="${radius}" 
            fill="transparent" stroke="var(--surface, #13132b)" stroke-width="${strokeWidth}" 
          />
          <circle 
            cx="${size/2}" cy="${size/2}" r="${radius}" 
            fill="transparent" stroke="${color}" stroke-width="${strokeWidth}" 
            stroke-dasharray="${circumference} ${circumference}" 
            stroke-dashoffset="${offset}"
            stroke-linecap="round"
            style="transition: stroke-dashoffset 0.5s ease-in-out;"
          />
          <text 
            x="50%" y="50%" 
            dominant-baseline="middle" text-anchor="middle" 
            fill="var(--text-primary, #e2e8f0)" 
            font-size="${size/4}px" font-weight="bold"
            style="transform: rotate(90deg) translate(0, -${size}px); transform-origin: center;"
          >${Math.round(percentage)}%</text>
        </svg>
        ${label ? `<div style="margin-top: 8px; font-size: 14px; color: var(--text-secondary, #94a3b8);">${label}</div>` : ''}
      </div>
    `;
  }
};
