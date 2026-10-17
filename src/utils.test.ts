import { describe, expect, it } from 'vitest';
import { guessCategory } from './categories';
import {
  cleanCode,
  generateFamilyCode,
  matchCatalog,
  normalizeName,
  parseEntry,
  suggestedRecurring,
  type CatalogEntry,
} from './utils';

const entry = (name: string, timesAdded: number, staple = false): CatalogEntry => ({
  id: normalizeName(name), name, category: 'other', timesAdded, lastAdded: 0, staple,
});

describe('guessCategory', () => {
  it.each([
    ['עגבניות', 'produce'],
    ['חלב 3%', 'dairy'],
    ['גבינה צהובה', 'dairy'],
    ['פיתות', 'bakery'],
    ['חזה עוף', 'meat'],
    ['אורז בסמטי', 'pantry'],
    ['גלידה וניל', 'frozen'],
    ['מים מינרליים', 'drinks'],
    ['נוזל כלים', 'cleaning'],
    ['משחת שיניים', 'hygiene'],
    ['משהו לא מוכר', 'other'],
  ])('%s → %s', (name, expected) => {
    expect(guessCategory(name)).toBe(expected);
  });

  it('prefers the longest keyword', () => {
    expect(guessCategory('מרכך שיער')).toBe('hygiene');
    expect(guessCategory('טונה')).toBe('pantry');
  });
});

describe('normalizeName', () => {
  it('trims, collapses spaces and drops path characters', () => {
    expect(normalizeName('  חלב   3/% ')).toBe('חלב 3%');
    expect(normalizeName('Milk')).toBe('milk');
  });
});

describe('family codes', () => {
  it('generates 6 unambiguous characters', () => {
    const code = generateFamilyCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
  it('cleans user input', () => {
    expect(cleanCode(' ab-c 12d ')).toBe('ABC12D');
  });
});

describe('recurring items', () => {
  const catalog = [entry('חלב', 5), entry('לחם', 3), entry('ספוג', 1), entry('ביצים', 0, true)];

  it('pre-selects frequent and staple items not already on the list', () => {
    const picked = suggestedRecurring(catalog, new Set(['לחם']));
    expect([...picked].sort()).toEqual(['ביצים', 'חלב'].sort());
  });

  it('autocompletes prefix matches before substring matches', () => {
    const list = [entry('חלב סויה', 1), entry('שוקו חלב', 9), entry('חלב', 5)];
    expect(matchCatalog(list, 'חלב').map((e) => e.name)).toEqual(['חלב', 'חלב סויה', 'שוקו חלב']);
  });
});

describe('parseEntry', () => {
  it.each([
    ['ביצים 2', { name: 'ביצים', qty: '2' }],
    ['חלב x3', { name: 'חלב', qty: '3' }],
    ['חלב 3%', { name: 'חלב 3%', qty: '' }],
    ['  לחם  ', { name: 'לחם', qty: '' }],
  ])('%s', (text, expected) => {
    expect(parseEntry(text)).toEqual(expected);
  });
});

describe('invite links', () => {
  it('extracts the join code from an invite URL', async () => {
    const { joinCodeFromLink } = await import('./joinLink');
    expect(joinCodeFromLink('https://shopping-list-436407.web.app/?join=u8wchh')).toBe('U8WCHH');
    expect(joinCodeFromLink('https://shopping-list-436407.web.app/#/list/x')).toBe('');
    expect(joinCodeFromLink('not a url')).toBe('');
  });
});
