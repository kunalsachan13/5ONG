export type BackHandler = () => boolean;

const handlers: BackHandler[] = [];

/**
 * Register a back handler. Handlers are executed in LIFO order (last registered runs first).
 * If a handler returns `true`, it is considered handled and no subsequent handlers will run.
 */
export function registerBackHandler(handler: BackHandler): () => void {
  handlers.push(handler);
  return () => {
    const idx = handlers.indexOf(handler);
    if (idx !== -1) {
      handlers.splice(idx, 1);
    }
  };
}

/**
 * Executes registered back handlers in LIFO order until one returns true.
 * Returns true if handled, false otherwise.
 */
export function executeBack(): boolean {
  for (let i = handlers.length - 1; i >= 0; i--) {
    try {
      const fn = handlers[i];
      if (fn && fn()) {
        return true;
      }
    } catch (e) {
      console.error("[backHandler] Error executing handler:", e);
    }
  }
  return false;
}

if (typeof window !== "undefined") {
  window.__handleAndroidBack = executeBack;
}

declare global {
  interface Window {
    __handleAndroidBack?: () => boolean;
  }
}
