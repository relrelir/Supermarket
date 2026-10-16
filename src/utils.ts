/** Key used to identify the "same" item across lists, e.g. in the catalog. */
export function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[/.#$[\]]/g, '')
    .toLowerCase();
}

// No 0/O/1/I to avoid confusion when reading the code aloud.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateFamilyCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return code;
}

export function cleanCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export interface CatalogEntry {
  id: string;
  name: string;
  category: string;
  timesAdded: number;
  lastAdded: number;
  staple: boolean;
}

/** An item counts as recurring once it was added this many times. */
export const RECURRING_THRESHOLD = 3;

export function sortCatalog(entries: CatalogEntry[]): CatalogEntry[] {
  return [...entries].sort(
    (a, b) =>
      Number(b.staple) - Number(a.staple) ||
      b.timesAdded - a.timesAdded ||
      b.lastAdded - a.lastAdded,
  );
}

/** IDs pre-selected when building a list from recurring items, skipping what is already on the list. */
export function suggestedRecurring(entries: CatalogEntry[], alreadyOnList: Set<string>): Set<string> {
  return new Set(
    entries
      .filter((e) => (e.staple || e.timesAdded >= RECURRING_THRESHOLD) && !alreadyOnList.has(e.id))
      .map((e) => e.id),
  );
}

/** Autocomplete matches: prefix matches first, then substring matches, by popularity. */
export function matchCatalog(entries: CatalogEntry[], query: string, limit = 6): CatalogEntry[] {
  const q = normalizeName(query);
  if (!q) return [];
  const sorted = sortCatalog(entries);
  const prefix = sorted.filter((e) => e.id.startsWith(q));
  const inner = sorted.filter((e) => !e.id.startsWith(q) && e.id.includes(q));
  return [...prefix, ...inner].slice(0, limit);
}

/** Splits a typed entry like "ביצים 2" or "חלב x3" into name and quantity. */
export function parseEntry(text: string): { name: string; qty: string } {
  const m = text.trim().match(/^(.*\S)\s+[x×*]?(\d+(?:\.\d+)?)$/);
  if (m) return { name: m[1].trim(), qty: m[2] };
  return { name: text.trim(), qty: '' };
}
