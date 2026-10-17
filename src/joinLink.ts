import { useSyncExternalStore } from 'react';
import { cleanCode } from './utils';

// A join code from an invite link (?join=CODE). On the web it comes from the page URL;
// in the Android app from the link that opened it (see main.tsx).
let pending = '';
const listeners = new Set<() => void>();

function set(code: string) {
  pending = code;
  listeners.forEach((l) => l());
}

export function joinCodeFromLink(url: string): string {
  try {
    return cleanCode(new URL(url).searchParams.get('join') ?? '').slice(0, 6);
  } catch {
    return '';
  }
}

export function receiveLink(url: string) {
  const code = joinCodeFromLink(url);
  if (code) set(code);
}

/** Forget the pending code and drop it from the address bar. */
export function clearPendingJoin() {
  set('');
  if (location.search) history.replaceState(null, '', location.pathname + location.hash);
}

export function usePendingJoin(): string {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => pending,
  );
}

if (typeof location !== 'undefined') receiveLink(location.href);
