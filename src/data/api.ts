import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { guessCategory } from '../categories';
import { cleanCode, generateFamilyCode, normalizeName, type CatalogEntry } from '../utils';
import type { Item } from './model';

const uid = () => {
  const u = auth.currentUser;
  if (!u) throw new Error('not signed in');
  return u.uid;
};

const listsCol = (fid: string) => collection(db, 'families', fid, 'lists');
const itemsCol = (fid: string, lid: string) => collection(db, 'families', fid, 'lists', lid, 'items');
const catalogDoc = (fid: string, key: string) => doc(db, 'families', fid, 'catalog', key);

/** Firestore writes resolve only once the server confirms; in the store that may never happen. */
function background(p: Promise<unknown>) {
  p.catch((e) => console.error('write failed', e));
}

export async function setDisplayName(displayName: string) {
  await setDoc(doc(db, 'users', uid()), { displayName }, { merge: true });
}

export async function createFamily(name: string, displayName: string): Promise<string> {
  const me = uid();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateFamilyCode();
    const familyRef = doc(collection(db, 'families'));
    const batch = writeBatch(db);
    batch.set(familyRef, { name, code, members: [me], createdAt: serverTimestamp() });
    batch.set(doc(db, 'codes', code), { familyId: familyRef.id });
    batch.set(doc(db, 'users', me), { familyId: familyRef.id, displayName });
    try {
      await batch.commit();
      createList(familyRef.id, 'סופר');
      return familyRef.id;
    } catch (e) {
      // Rules reject reusing an existing code; try another one.
      if ((e as { code?: string }).code !== 'permission-denied') throw e;
    }
  }
  throw new Error('לא הצלחנו ליצור קוד משפחה, נסו שוב');
}

export async function joinFamily(rawCode: string, displayName: string): Promise<string> {
  const code = cleanCode(rawCode);
  const snap = await getDoc(doc(db, 'codes', code));
  if (!snap.exists()) throw new Error('קוד לא נמצא. בדקו את הקוד ונסו שוב.');
  const familyId = snap.data().familyId as string;
  const me = uid();
  await updateDoc(doc(db, 'families', familyId), { members: arrayUnion(me) });
  await setDoc(doc(db, 'users', me), { familyId, displayName });
  return familyId;
}

export function renameFamily(fid: string, name: string) {
  background(updateDoc(doc(db, 'families', fid), { name }));
}

// ---- lists ----

export function createList(fid: string, name: string): string {
  const ref = doc(listsCol(fid));
  background(setDoc(ref, { name, createdAt: Date.now() }));
  return ref.id;
}

export function renameList(fid: string, lid: string, name: string) {
  background(updateDoc(doc(listsCol(fid), lid), { name }));
}

export async function deleteList(fid: string, lid: string) {
  const items = await getDocs(itemsCol(fid, lid));
  const batch = writeBatch(db);
  items.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(listsCol(fid), lid));
  background(batch.commit());
}

// ---- items ----

export interface NewItem {
  name: string;
  qty?: string;
  note?: string;
  category?: string;
}

/** Adds items to a list and records them in the family's catalog of remembered items. */
export function addItems(fid: string, lid: string, items: NewItem[], addedByName: string) {
  const batch = writeBatch(db);
  const now = Date.now();
  for (const it of items) {
    const name = it.name.trim();
    const key = normalizeName(name);
    if (!key) continue;
    const category = it.category ?? guessCategory(name);
    batch.set(doc(itemsCol(fid, lid)), {
      name, key, category,
      qty: it.qty ?? '', note: it.note ?? '',
      inCart: false, addedByName, createdAt: now,
    });
    batch.set(
      catalogDoc(fid, key),
      { name, category, timesAdded: increment(1), lastAdded: now },
      { merge: true },
    );
  }
  background(batch.commit());
}

export function updateItem(fid: string, lid: string, item: Item, changes: Partial<Pick<Item, 'qty' | 'note' | 'category' | 'name'>>) {
  const batch = writeBatch(db);
  batch.update(doc(itemsCol(fid, lid), item.id), changes);
  if (changes.category) {
    // Remember the corrected category for next time.
    batch.set(catalogDoc(fid, item.key), { name: item.name, category: changes.category }, { merge: true });
  }
  background(batch.commit());
}

export function setInCart(fid: string, lid: string, itemId: string, inCart: boolean) {
  background(updateDoc(doc(itemsCol(fid, lid), itemId), { inCart }));
}

export function deleteItem(fid: string, lid: string, itemId: string) {
  background(deleteDoc(doc(itemsCol(fid, lid), itemId)));
}

export function clearCart(fid: string, lid: string, items: Item[]) {
  const batch = writeBatch(db);
  items.filter((i) => i.inCart).forEach((i) => batch.delete(doc(itemsCol(fid, lid), i.id)));
  background(batch.commit());
}

// ---- catalog ----

export function setStaple(fid: string, entry: CatalogEntry, staple: boolean) {
  background(setDoc(catalogDoc(fid, entry.id), { staple }, { merge: true }));
}

export function forgetCatalogEntry(fid: string, entry: CatalogEntry) {
  background(deleteDoc(catalogDoc(fid, entry.id)));
}
