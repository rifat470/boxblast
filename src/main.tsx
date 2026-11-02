import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Ensure CloudStorage polyfill is active if Telegram WebApp is present
try {
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.CloudStorage) {
    const cs = tg.CloudStorage;
    const prefix = 'tg_cs_';
    const fallback: Record<string, Function> = {
      setItem: (key: string, val: any, cb?: Function) => {
        try { localStorage.setItem(prefix + key, String(val)); cb?.(null, true); } catch (e) { cb?.(e, false); }
        return cs;
      },
      getItem: (key: string, cb?: Function) => {
        try { const v = localStorage.getItem(prefix + key); cb?.(null, v !== null ? v : ''); } catch (e) { cb?.(e, ''); }
        return cs;
      },
      getItems: (keys: string[], cb?: Function) => {
        try {
          const res: Record<string, string> = {};
          (keys || []).forEach((k) => { res[k] = localStorage.getItem(prefix + k) ?? ''; });
          cb?.(null, res);
        } catch (e) { cb?.(e, {}); }
        return cs;
      },
      removeItem: (key: string, cb?: Function) => {
        try { localStorage.removeItem(prefix + key); cb?.(null, true); } catch (e) { cb?.(e, false); }
        return cs;
      },
      removeItems: (keys: string[], cb?: Function) => {
        try { (keys || []).forEach((k) => localStorage.removeItem(prefix + k)); cb?.(null, true); } catch (e) { cb?.(e, false); }
        return cs;
      },
      getKeys: (cb?: Function) => {
        try {
          const list: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k?.startsWith(prefix)) list.push(k.slice(prefix.length));
          }
          cb?.(null, list);
        } catch (e) { cb?.(e, []); }
        return cs;
      },
    };

    (['setItem', 'getItem', 'getItems', 'removeItem', 'removeItems', 'getKeys'] as const).forEach((m) => {
      const orig = cs[m];
      if (!orig || (orig as any).__patched) return;
      const fn = function (this: any, ...args: any[]) {
        if (!tg.isVersionAtLeast?.('6.9')) {
          return fallback[m].apply(cs, args);
        }
        try {
          return orig.apply(cs, args);
        } catch {
          return fallback[m].apply(cs, args);
        }
      };
      (fn as any).__patched = true;
      cs[m] = fn;
    });
  }
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')!).render(<App />);
