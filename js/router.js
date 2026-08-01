export const Router = {
  routes: {},
  currentScreen: null,
  
  register(name, screen) {
    this.routes[name] = screen;
  },
  
  navigate(name, params = {}) {
    const hashParams = Object.values(params).length > 0 ? '/' + Object.values(params).join('/') : '';
    window.location.hash = name + hashParams;
  },
  
  async init() {
    window.addEventListener('hashchange', () => this.handleHashChange());
    await this.handleHashChange();
  },
  
  async handleHashChange() {
    const hash = window.location.hash.slice(1) || 'home';
    const parts = hash.split('/');
    const name = parts[0];
    const params = parts.slice(1);
    
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
