import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES, CATEGORY_BY_ID, categoryOrder } from '../categories';
import { addItems, clearCart, deleteItem, setInCart, updateItem } from '../data/api';
import { useCatalog, useItems, useLists } from '../data/hooks';
import type { Item } from '../data/model';
import { useSession, useToast } from '../context';
import { href } from '../router';
import { Header, Loading, Modal } from '../ui';
import { matchCatalog, normalizeName, parseEntry, type CatalogEntry } from '../utils';

/** Keeps the screen on while shopping, re-acquiring after the app returns to the foreground. */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const acquire = () => {
      if (document.visibilityState === 'visible')
        navigator.wakeLock.request('screen').then((l) => (lock = l)).catch(() => {});
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      document.removeEventListener('visibilitychange', acquire);
      lock?.release().catch(() => {});
    };
  }, [active]);
}

function AddBar({ items, catalog, onAdd }: { items: Item[]; catalog: CatalogEntry[]; onAdd: (text: string, entry?: CatalogEntry) => void }) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onList = useMemo(() => new Set(items.filter((i) => !i.inCart).map((i) => i.key)), [items]);
  const suggestions = useMemo(
    () => matchCatalog(catalog, parseEntry(text).name).filter((e) => !onList.has(e.id)),
    [catalog, text, onList],
  );

  const submit = (entry?: CatalogEntry) => {
    if (!text.trim() && !entry) return;
    onAdd(text, entry);
    setText('');
    inputRef.current?.focus();
  };

  return (
    <form className="add-bar" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div className="add-row">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="מה צריך? (למשל: ביצים 2)"
          enterKeyHint="done"
          aria-label="הוספת פריט"
        />
        <button className="btn primary" disabled={!text.trim()}>הוספה</button>
      </div>
      {focused && suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => submit(s)}>
                <span>{CATEGORY_BY_ID[s.category]?.emoji ?? '🛒'} {s.name}</span>
                {s.staple && <span className="muted small">⭐</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

function ItemRow({ listId, item, shopping, onEdit }: { listId: string; item: Item; shopping: boolean; onEdit: () => void }) {
  const { family } = useSession();
  const toggle = () => setInCart(family.id, listId, item.id, !item.inCart);
  return (
    <li className={`item ${item.inCart ? 'in-cart' : ''} ${shopping ? 'shopping' : ''}`}>
      <button className="check" onClick={toggle} aria-label={item.inCart ? 'הוצאה מהעגלה' : 'סימון בעגלה'} aria-pressed={item.inCart}>
        {item.inCart ? '✓' : ''}
      </button>
      <button className="item-body" onClick={shopping ? toggle : onEdit}>
        <span className="item-name">
          {item.name}
          {item.qty && <span className="qty">×{item.qty}</span>}
        </span>
        {(item.note || !shopping) && (
          <span className="item-meta">
            {item.note && <span>{item.note}</span>}
            {!shopping && item.addedByName && <span className="muted">· {item.addedByName}</span>}
          </span>
        )}
      </button>
    </li>
  );
}

function ItemEditor({ listId, item, onClose }: { listId: string; item: Item; onClose: () => void }) {
  const { family } = useSession();
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(item.qty);
  const [note, setNote] = useState(item.note);
  const [category, setCategory] = useState(item.category);
  const save = () => {
    const changes: Parameters<typeof updateItem>[3] = {};
    if (name.trim() && name.trim() !== item.name) changes.name = name.trim();
    if (qty !== item.qty) changes.qty = qty.trim();
    if (note !== item.note) changes.note = note.trim();
    if (category !== item.category) changes.category = category;
    if (Object.keys(changes).length) updateItem(family.id, listId, item, changes);
    onClose();
  };
  return (
    <Modal title="עריכת פריט" onClose={onClose}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label>שם<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <div className="two-cols">
          <label>כמות<input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="1" inputMode="decimal" /></label>
          <label>הערה<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="למשל: 3%, בלי גלוטן" /></label>
        </div>
        <div className="chips" role="radiogroup" aria-label="מחלקה">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={category === c.id}
              className={`chip ${category === c.id ? 'active' : ''}`}
              onClick={() => setCategory(c.id)}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
        <div className="row-buttons">
          <button type="button" className="btn danger" onClick={() => { deleteItem(family.id, listId, item.id); onClose(); }}>
            מחיקה
          </button>
          <button className="btn primary">שמירה</button>
        </div>
      </form>
    </Modal>
  );
}

export function ListView({ listId }: { listId: string }) {
  const { family, displayName } = useSession();
  const toast = useToast();
  const lists = useLists(family.id);
  const items = useItems(family.id, listId);
  const catalog = useCatalog(family.id) ?? [];
  const [shopping, setShopping] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  useWakeLock(shopping);

  const list = lists?.find((l) => l.id === listId);

  const groups = useMemo(() => {
    const pending = (items ?? []).filter((i) => !i.inCart);
    const byCat = new Map<string, Item[]>();
    for (const i of pending) byCat.set(i.category, [...(byCat.get(i.category) ?? []), i]);
    return [...byCat.entries()].sort(([a], [b]) => categoryOrder(a) - categoryOrder(b));
  }, [items]);
  const inCart = (items ?? []).filter((i) => i.inCart);

  if (lists && !list) return (<><Header back title="רשימה" /><p className="center muted">הרשימה נמחקה.</p></>);
  if (!items || !list) return (<><Header back title={list?.name ?? ''} /><Loading /></>);

  const add = (text: string, entry?: CatalogEntry) => {
    const parsed = parseEntry(text);
    const name = entry?.name ?? parsed.name;
    const key = normalizeName(name);
    const existing = items.find((i) => i.key === key && !i.inCart);
    if (existing) {
      toast(`"${name}" כבר ברשימה`);
      return;
    }
    const inCartCopy = items.find((i) => i.key === key && i.inCart);
    if (inCartCopy) {
      setInCart(family.id, listId, inCartCopy.id, false);
      return;
    }
    addItems(family.id, listId, [{ name, qty: entry ? '' : parsed.qty, category: entry?.category }], displayName);
  };

  const total = items.length;

  return (
    <>
      <Header
        back
        title={list.name}
        actions={
          <button
            className={`btn small ${shopping ? 'primary' : 'secondary'}`}
            onClick={() => setShopping(!shopping)}
            aria-pressed={shopping}
          >
            {shopping ? '✓ סיום מצב קנייה' : '🛒 מצב קנייה'}
          </button>
        }
      />
      <main className="content list-view">
        {!shopping && <AddBar items={items} catalog={catalog} onAdd={add} />}
        {total > 0 && (
          <div className="progress" aria-label={`${inCart.length} מתוך ${total} בעגלה`}>
            <div className="bar" style={{ width: `${(inCart.length / total) * 100}%` }} />
            <span>{inCart.length}/{total} בעגלה</span>
          </div>
        )}

        {total === 0 && (
          <div className="empty">
            <p>הרשימה ריקה.</p>
            <a className="btn secondary" href={href({ name: 'recurring', listId })}>🔁 מילוי מפריטים חוזרים</a>
          </div>
        )}

        {groups.map(([catId, catItems]) => {
          const cat = CATEGORY_BY_ID[catId] ?? CATEGORY_BY_ID.other;
          return (
            <section key={catId}>
              <h3 className="cat-title">{cat.emoji} {cat.name}</h3>
              <ul className="items">
                {catItems.map((i) => <ItemRow key={i.id} listId={listId} item={i} shopping={shopping} onEdit={() => setEditing(i)} />)}
              </ul>
            </section>
          );
        })}

        {inCart.length > 0 && (
          <section className="cart-section">
            <h3 className="cat-title">✅ בעגלה ({inCart.length})</h3>
            <ul className="items">
              {inCart.map((i) => <ItemRow key={i.id} listId={listId} item={i} shopping={shopping} onEdit={() => setEditing(i)} />)}
            </ul>
            <button
              className="btn primary big"
              onClick={() => {
                const rest = total - inCart.length;
                const msg = rest > 0
                  ? `לסיים קנייה? ${inCart.length} פריטים שבעגלה יוסרו, ${rest} פריטים שלא נקנו יישארו ברשימה.`
                  : 'לסיים קנייה ולנקות את הרשימה?';
                if (confirm(msg)) {
                  clearCart(family.id, listId, items);
                  setShopping(false);
                  toast('קנייה מוצלחת! 🎉');
                }
              }}
            >
              סיימתי קנייה
            </button>
          </section>
        )}

        {!shopping && total > 0 && (
          <a className="btn ghost" href={href({ name: 'recurring', listId })}>🔁 הוספה מפריטים חוזרים</a>
        )}
      </main>
      {editing && <ItemEditor listId={listId} item={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
