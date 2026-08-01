export const Router = {
  routes: {},
  currentScreen: null,
  
  register(name, screen) {
    this.routes[name] = screen;
  },
  
  navigate(name, params = {}) {
    const values = Object.values(params)
      .filter(v => v !== undefined && v !== null && v !== '')
      .map(v => encodeURIComponent(v));
    window.location.hash = name + (values.length > 0 ? '/' + values.join('/') : '');
  },
  
  async init() {
    window.addEventListener('hashchange', () => this.handleHashChange());
    await this.handleHashChange();
  },
  
  async handleHashChange() {
    const hash = window.location.hash.slice(1) || 'home';
    const parts = hash.split('/');
    const name = parts[0];
    // Screens read named params (e.g. params.lessonId), so map the first
    // positional segment onto lessonId — the only route param in use.
    const params = parts[1] ? { lessonId: decodeURIComponent(parts[1]) } : {};
    
    if (this.currentScreen && this.routes[this.currentScreen]?.cleanup) {
      this.routes[this.currentScreen].cleanup();
    }
    
    const screen = this.routes[name] || this.routes['home'];
    this.currentScreen = name;
    
    if (screen) {
      const container = this.getContainer();
      if (container) {
          container.innerHTML = '';
          await screen.render(container, params);
      }
    }
  },
  
  getContainer() {
    return document.getElementById('app');
  }
};
