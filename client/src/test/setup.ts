import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// RTL không tự register cleanup khi vitest globals=false → cleanup thủ công mỗi test.
afterEach(() => {
  cleanup();
});

// jsdom chưa có ResizeObserver (Radix sidebar/tooltip dùng) — polyfill trả size để
// Radix hoàn tất việc đo đạc + định vị tooltip (nếu không content bị kẹt trạng thái hidden).
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    private callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }
    observe(target: Element) {
      const rect = { x: 0, y: 0, top: 0, left: 0, width: 100, height: 40, bottom: 40, right: 100 };
      this.callback(
        [
          {
            target,
            contentRect: rect,
            borderBoxSize: [{ inlineSize: 100, blockSize: 40 }],
            contentBoxSize: [{ inlineSize: 100, blockSize: 40 }],
            devicePixelContentBoxSize: [{ inlineSize: 100, blockSize: 40 }],
          } as unknown as ResizeObserverEntry,
        ],
        this as unknown as ResizeObserver,
      );
    }
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

// jsdom chưa có PointerEvent — user-event/Radix tooltip cần.
if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEventStub extends Event {
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.clientX = params.clientX ?? 0;
      this.clientY = params.clientY ?? 0;
      this.button = params.button ?? 0;
      this.buttons = params.buttons ?? 0;
      this.pointerId = params.pointerId ?? 1;
      this.isPrimary = params.isPrimary ?? true;
      this.pointerType = params.pointerType ?? 'mouse';
    }
    clientX: number;
    clientY: number;
    button: number;
    buttons: number;
    pointerId: number;
    isPrimary: boolean;
    pointerType: string;
  }
  globalThis.PointerEvent = PointerEventStub as unknown as typeof PointerEvent;
}

// jsdom chưa có matchMedia — sidebar (use-mobile) cần.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
