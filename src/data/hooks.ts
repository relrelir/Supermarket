import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import type { CatalogEntry, Family, Item, ShoppingList, UserProfile } from './model';

type Subscribe<T> = (set: (v: T) => void, fail: (e: unknown) => void) => () => void;

/**
 * Subscribes to a Firestore source; returns undefined while loading.
 * A listener that errors is dead, so retry with backoff: right after creating or joining a family,
 * the local cache runs ahead of the server and early listens are rejected by the rules.
 */
function useLive<T>(subscribe: Subscribe<T> | null, deps: unknown[], onGiveUp?: (set: (v: T) => void) => void): T | undefined {
  // Tag values with the deps they came from, so a change of deps never shows the previous source's data.
  const key = JSON.stringify(deps);
  const [state, setState] = useState<{ key: string; value: T } | undefined>(undefined);
  useEffect(() => {
    const setValue = (value: T) => setState({ key, value });
    if (!subscribe) return;
    let attempt = 0;
    let unsub = () => {};
    let timer: number | undefined;
    const start = () => {
      unsub = subscribe(setValue, (e) => {
        console.warn('subscription failed', e);
        if (attempt >= 6) {
          onGiveUp?.(setValue);
          return;
        }
        timer = window.setTimeout(start, 500 * 2 ** attempt++);
      });
    };
    start();
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [key]);
  return state?.key === key ? state.value : undefined;
}

export function useProfile(uid: string) {
  return useLive<UserProfile | null>(
    (set, fail) =>
      onSnapshot(
        doc(db, 'users', uid),
        (s) => set(s.exists() ? (s.data() as UserProfile) : null),
        fail,
      ),
    [uid],
  );
}

export function useFamily(fid: string) {
  return useLive<Family | null>(
    (set, fail) =>
      onSnapshot(
        doc(db, 'families', fid),
        (s) => set(s.exists() ? ({ id: s.id, ...s.data() } as Family) : null),
        fail,
      ),
    [fid],
    (set) => set(null),
  );
}

export function useLists(fid: string) {
  return useLive<ShoppingList[]>(
    (set, fail) =>
      onSnapshot(
        query(collection(db, 'families', fid, 'lists'), orderBy('createdAt')),
        (s) => set(s.docs.map((d) => ({ id: d.id, ...d.data() }) as ShoppingList)),
        fail,
      ),
    [fid],
  );
}

export function useItems(fid: string, lid: string | undefined) {
  return useLive<Item[]>(
    lid
      ? (set, fail) =>
      onSnapshot(
        query(collection(db, 'families', fid, 'lists', lid, 'items'), orderBy('createdAt')),
        (s) => set(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Item)),
        fail,
      )
      : null,
    [fid, lid],
  );
}

export function useCatalog(fid: string) {
  return useLive<CatalogEntry[]>(
    (set, fail) =>
      onSnapshot(
        collection(db, 'families', fid, 'catalog'),
        (s) =>
          set(
            s.docs.map((d) => {
              const v = d.data();
              return {
                id: d.id,
                name: v.name ?? d.id,
                category: v.category ?? 'other',
                timesAdded: v.timesAdded ?? 0,
                lastAdded: v.lastAdded ?? 0,
                staple: v.staple ?? false,
              };
            }),
          ),
        fail,
      ),
    [fid],
  );
}
