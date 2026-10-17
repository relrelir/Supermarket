import { useState } from 'react';
import { renameFamily, setDisplayName } from '../data/api';
import { useSession, useToast } from '../context';
import { inviteText, shareText } from '../share';
import { Header, PromptModal } from '../ui';

export function Settings() {
  const { family, displayName } = useSession();
  const toast = useToast();
  const [editing, setEditing] = useState<'me' | 'family' | null>(null);

  const invite = async () => {
    const result = await shareText(inviteText(family.name, family.code));
    if (result === 'copied') toast('ההזמנה הועתקה, הדביקו בוואטסאפ');
  };

  return (
    <>
      <Header back title="הגדרות" />
      <main className="content stack">
        <section className="card invite">
          <h2>הזמנת בני משפחה</h2>
          <p className="muted small">בני המשפחה מתקינים את האפליקציה ומזינים את הקוד:</p>
          <div className="code" dir="ltr">{family.code}</div>
          <button className="btn primary big" onClick={invite}>📤 שליחת הזמנה</button>
          <p className="muted small">{family.members.length} מכשירים מחוברים</p>
        </section>

        <section className="card settings-rows">
          <button className="settings-row" onClick={() => setEditing('me')}>
            <span>השם שלי</span><span className="muted">{displayName || '—'} ✏️</span>
          </button>
          <button className="settings-row" onClick={() => setEditing('family')}>
            <span>שם המשפחה</span><span className="muted">{family.name} ✏️</span>
          </button>
        </section>

        <p className="muted small center">גרסה {__APP_VERSION__}</p>
      </main>

      {editing === 'me' && (
        <PromptModal title="השם שלי" initial={displayName} onClose={() => setEditing(null)} onSubmit={setDisplayName} />
      )}
      {editing === 'family' && (
        <PromptModal title="שם המשפחה" initial={family.name} onClose={() => setEditing(null)} onSubmit={(n) => renameFamily(family.id, n)} />
      )}
    </>
  );
}
