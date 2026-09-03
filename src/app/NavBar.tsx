import { NavLink } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDueProgress } from '@/lib/progress';

const TABS = [
  { to: '/', icon: '🏠', label: 'Trang chủ', end: true },
  { to: '/lessons', icon: '📚', label: 'Bài học', end: false },
  { to: '/review', icon: '🔄', label: 'Ôn tập', end: false },
  { to: '/grammar', icon: '📐', label: 'Ngữ pháp', end: false },
  { to: '/stats', icon: '📊', label: 'Thống kê', end: false },
  { to: '/settings', icon: '⚙️', label: 'Cài đặt', end: false },
] as const;

export function NavBar() {
  const dueCount = useLiveQuery(async () => (await getDueProgress()).length, [], 0) ?? 0;

  return (
    <nav className="nav" aria-label="Điều hướng chính">
      <div className="nav__brand">
        IELTS <span>Vocab</span>
      </div>
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className="nav__item">
          <span className="nav__icon" aria-hidden="true">
            {tab.icon}
            {tab.to === '/review' && dueCount > 0 && (
              <span className="nav__badge">{dueCount > 99 ? '99+' : dueCount}</span>
            )}
          </span>
          <span className="nav__label">{tab.label}</span>
          {tab.to === '/review' && dueCount > 0 && (
            <span className="sr-only">{dueCount} từ cần ôn</span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
