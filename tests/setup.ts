import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom implements neither speech synthesis nor matchMedia.
if (!('speechSynthesis' in window)) {
  Object.defineProperty(window, 'speechSynthesis', {
    writable: true,
    value: {
      getVoices: () => [],
      speak: vi.fn(),
      cancel: vi.fn(),
      speaking: false,
      pending: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
}

if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});
