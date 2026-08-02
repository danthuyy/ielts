import { Outlet } from 'react-router-dom';
import { NavBar } from './NavBar';

/** Layout for the tabbed screens. Study screens render outside it, full-bleed. */
export function AppShell() {
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Bỏ qua điều hướng
      </a>
      <NavBar />
      <main className="shell__main" id="main">
        <Outlet />
      </main>
    </div>
  );
}

/** Layout for full-screen study modes: no nav, no page chrome. */
export function StudyLayout() {
  return (
    <main className="shell__main" id="main" style={{ height: '100%' }}>
      <Outlet />
    </main>
  );
}
