import { useState } from 'react';
import { createList, deleteList, renameList } from '../data/api';
import { useItems, useLists } from '../data/hooks';
import type { ShoppingList } from '../data/model';
import { useSession } from '../context';
import { href, navigate } from '../router';
import { Header, Loading, PromptModal } from '../ui';

function ListCard({ list, onRename, onDelete }: { list: ShoppingList; onRename: () => void; onDelete: () => void }) {
  const { family } = useSession();
  const items = useItems(family.id, list.id);
  const left = items?.filter((i) => !i.inCart).length ?? 0;
  const total = items?.length ?? 0;
  return (
    <li className="card list-card">
      <a href={href({ name: 'list', id: list.id })} className="list-link">
        <span className="list-name">{list.name}</span>
        <span className="muted small">
          {items === undefined ? '…' : total === 0 ? 'ריקה' : left === 0 ? 'הכל בעגלה ✓' : `${left} פריטים`}
        </span>
      </a>
      <button className="icon-btn" onClick={onRename} aria-label="שינוי שם">✏️</button>
      <button className="icon-btn" onClick={onDelete} aria-label="מחיקה">🗑️</button>
    </li>
  );
}

export function Lists() {
  const { family } = useSession();
  const lists = useLists(family.id);
  const [dialog, setDialog] = useState<{ kind: 'new' } | { kind: 'rename'; list: ShoppingList } | null>(null);

  return (
    <>
      <Header
        title={family.name}
        actions={
          <a className="icon-btn" href={href({ name: 'settings' })} aria-label="הגדרות">⚙️</a>
        }
      />
      <main className="content">
        {lists === undefined ? (
          <Loading />
        ) : (
          <ul className="stack">
            {lists.map((l) => (
              <ListCard
                key={l.id}
                list={l}
                onRename={() => setDialog({ kind: 'rename', list: l })}
                onDelete={() => {
                  if (confirm(`למחוק את הרשימה "${l.name}" וכל הפריטים בה?`)) deleteList(family.id, l.id);
                }}
              />
            ))}
            {lists.length === 0 && <p className="muted center">אין עדיין רשימות.</p>}
          </ul>
        )}
        <div className="stack actions">
          <button className="btn primary big" onClick={() => setDialog({ kind: 'new' })}>➕ רשימה חדשה</button>
          <a className="btn secondary big" href={href({ name: 'recurring' })}>🔁 רשימה מפריטים חוזרים</a>
        </div>
      </main>

      {dialog?.kind === 'new' && (
        <PromptModal
          title="רשימה חדשה"
          placeholder="למשל: פארם, שוק, מסיבה"
          confirmLabel="יצירה"
          onClose={() => setDialog(null)}
          onSubmit={(name) => navigate({ name: 'list', id: createList(family.id, name) })}
        />
      )}
      {dialog?.kind === 'rename' && (
        <PromptModal
          title="שינוי שם"
          initial={dialog.list.name}
          onClose={() => setDialog(null)}
          onSubmit={(name) => renameList(family.id, dialog.list.id, name)}
        />
      )}
    </>
  );
}
