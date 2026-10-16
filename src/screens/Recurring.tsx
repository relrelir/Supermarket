import { useEffect, useMemo, useState } from 'react';
import { CATEGORY_BY_ID } from '../categories';
import { addItems, createList, forgetCatalogEntry, setStaple } from '../data/api';
import { useCatalog, useItems, useLists } from '../data/hooks';
import { useSession, useToast } from '../context';
import { navigate } from '../router';
import { Header, Loading } from '../ui';
import { normalizeName, RECURRING_THRESHOLD, sortCatalog, suggestedRecurring } from '../utils';

const NEW_LIST = '__new__';

export function Recurring({ listId }: { listId?: string }) {
  const { family, displayName } = useSession();
  const toast = useToast();
  const lists = useLists(family.id);
  const catalog = useCatalog(family.id);
  const [target, setTarget] = useState(listId ?? '');
  const [newListName, setNewListName] = useState('');
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Set<string> | null>(null);

  // Default target: the list we came from, else the first list.
  useEffect(() => {
    if (!target && lists) setTarget(lists[0]?.id ?? NEW_LIST);
  }, [lists, target]);

  const targetItems = useItems(family.id, target && target !== NEW_LIST ? target : undefined);
  const onList = useMemo(
    () => new Set((targetItems ?? []).filter((i) => !i.inCart).map((i) => i.key)),
    [targetItems],
  );

  const ready = catalog !== undefined && (target === NEW_LIST || targetItems !== undefined);

  // Pre-select staples and frequent items once data is in, and again when the target list changes.
  // Not re-run on catalog updates (e.g. toggling ⭐) so manual picks are kept.
  useEffect(() => {
    if (ready) setSelected(suggestedRecurring(catalog, onList));
  }, [ready, target]);

  const sorted = useMemo(() => sortCatalog(catalog ?? []), [catalog]);
  const q = normalizeName(filter);
  const visible = q ? sorted.filter((e) => e.id.includes(q)) : sorted;

  if (!lists || !ready || !selected) return (<><Header back title="פריטים חוזרים" /><Loading /></>);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const submit = () => {
    const chosen = sorted.filter((e) => selected.has(e.id) && !onList.has(e.id));
    if (chosen.length === 0) return;
    let lid = target;
    if (target === NEW_LIST) lid = createList(family.id, newListName.trim() || 'קניות');
    addItems(family.id, lid, chosen.map((e) => ({ name: e.name, category: e.category })), displayName);
    toast(`נוספו ${chosen.length} פריטים`);
    navigate({ name: 'list', id: lid }, true);
  };

  const count = [...selected].filter((id) => !onList.has(id)).length;

  return (
    <>
      <Header back title="פריטים חוזרים" />
      <main className="content recurring">
        {catalog.length === 0 ? (
          <div className="empty">
            <p>עדיין אין פריטים זכורים.</p>
            <p className="muted small">כל פריט שמוסיפים לרשימה נשמר כאן. פריט שנקנה {RECURRING_THRESHOLD} פעמים או יותר, או שסימנתם ⭐, ייבחר אוטומטית.</p>
          </div>
        ) : (
          <>
            <div className="card form">
              <label>
                להוסיף לרשימה
                <select value={target} onChange={(e) => setTarget(e.target.value)}>
                  {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  <option value={NEW_LIST}>➕ רשימה חדשה…</option>
                </select>
              </label>
              {target === NEW_LIST && (
                <input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="שם הרשימה החדשה" />
              )}
            </div>

            <div className="toolbar">
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="🔍 חיפוש" aria-label="חיפוש" />
              <button className="btn ghost small" onClick={() => setSelected(suggestedRecurring(catalog, onList))}>מומלצים</button>
              <button className="btn ghost small" onClick={() => setSelected(new Set())}>נקה</button>
            </div>
            <p className="muted small">⭐ = פריט קבוע, ייבחר תמיד. המספר מציין כמה פעמים נקנה.</p>

            <ul className="items">
              {visible.map((e) => {
                const already = onList.has(e.id);
                return (
                  <li key={e.id} className={`item ${already ? 'disabled' : ''}`}>
                    <button
                      className="check"
                      disabled={already}
                      aria-pressed={selected.has(e.id) && !already}
                      onClick={() => toggle(e.id)}
                      aria-label={`בחירת ${e.name}`}
                    >
                      {already ? '•' : selected.has(e.id) ? '✓' : ''}
                    </button>
                    <button className="item-body" disabled={already} onClick={() => toggle(e.id)}>
                      <span className="item-name">{CATEGORY_BY_ID[e.category]?.emoji} {e.name}</span>
                      <span className="item-meta muted">
                        {already ? 'כבר ברשימה' : `נקנה ${e.timesAdded} פעמים`}
                      </span>
                    </button>
                    <button
                      className={`icon-btn star ${e.staple ? 'on' : ''}`}
                      onClick={() => {
                        setStaple(family.id, e, !e.staple);
                        if (!e.staple && !already) setSelected(new Set(selected).add(e.id));
                      }}
                      aria-label={e.staple ? 'ביטול פריט קבוע' : 'סימון כפריט קבוע'}
                      aria-pressed={e.staple}
                    >
                      {e.staple ? '⭐' : '☆'}
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => confirm(`לשכוח את "${e.name}"?`) && forgetCatalogEntry(family.id, e)}
                      aria-label={`שכחת ${e.name}`}
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="sticky-bottom">
              <button className="btn primary big" disabled={count === 0} onClick={submit}>
                {count === 0 ? 'בחרו פריטים' : `הוספת ${count} פריטים`}
              </button>
            </div>
          </>
        )}
      </main>
    </>
  );
}
