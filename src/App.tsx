import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { ensureUser, isConfigured } from './firebase';
import { useFamily, useProfile } from './data/hooks';
import { SessionProvider, ToastProvider } from './context';
import { useRoute } from './router';
import { Loading, Modal } from './ui';
import { joinFamily } from './data/api';
import { clearPendingJoin, usePendingJoin } from './joinLink';
import { Welcome } from './screens/Welcome';
import { Lists } from './screens/Lists';
import { ListView } from './screens/ListView';
import { Recurring } from './screens/Recurring';
import { Settings } from './screens/Settings';

function NotConfigured() {
  return (
    <main className="welcome">
      <div className="logo">⚙️</div>
      <h1>חסרות הגדרות Firebase</h1>
      <p className="muted">האפליקציה נבנתה בלי פרטי חיבור לשרת. ראו את ההוראות בקובץ README.</p>
    </main>
  );
}

function Routes() {
  const route = useRoute();
  switch (route.name) {
    case 'list': return <ListView listId={route.id} />;
    case 'recurring': return <Recurring listId={route.listId} />;
    case 'settings': return <Settings />;
    default: return <Lists />;
  }
}

function FamilyGate({ user }: { user: User }) {
  const profile = useProfile(user.uid);
  const familyId = profile?.familyId ?? '';
  if (profile === undefined) return <Loading />;
  if (!familyId) return <Welcome initialName={profile?.displayName ?? ''} />;
  return <FamilySession user={user} familyId={familyId} displayName={profile?.displayName ?? ''} />;
}

/** An invite link opened by someone who already belongs to a family. */
function JoinPrompt({ currentCode, displayName }: { currentCode: string; displayName: string }) {
  const code = usePendingJoin();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (code && code === currentCode) clearPendingJoin(); // already a member
  }, [code, currentCode]);
  if (!code || code === currentCode) return null;
  return (
    <Modal title="הזמנה למשפחה אחרת" onClose={clearPendingJoin}>
      <p>קיבלת הזמנה להצטרף למשפחה עם הקוד <b dir="ltr">{code}</b>. לעבור אליה? הרשימות של המשפחה הנוכחית יישארו אצל שאר בני המשפחה.</p>
      {error && <p className="error">{error}</p>}
      <div className="row-buttons">
        <button className="btn ghost" onClick={clearPendingJoin}>להישאר</button>
        <button
          className="btn primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await joinFamily(code, displayName);
              clearPendingJoin();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'משהו השתבש');
              setBusy(false);
            }
          }}
        >
          {busy ? 'רגע…' : 'מעבר למשפחה'}
        </button>
      </div>
    </Modal>
  );
}

function FamilySession({ user, familyId, displayName }: { user: User; familyId: string; displayName: string }) {
  const family = useFamily(familyId);
  if (family === undefined) return <Loading />;
  // Family deleted or access lost: let the user create or join again.
  if (family === null) return <Welcome initialName={displayName} />;
  return (
    <SessionProvider value={{ uid: user.uid, displayName, family }}>
      <Routes />
      <JoinPrompt currentCode={family.code} displayName={displayName} />
    </SessionProvider>
  );
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (isConfigured) ensureUser().then(setUser, (e) => { console.error(e); setError(true); });
  }, []);

  if (!isConfigured) return <NotConfigured />;
  return (
    <ToastProvider>
      {error ? (
        <main className="welcome">
          <p>לא הצלחנו להתחבר. בדקו חיבור לאינטרנט.</p>
          <button className="btn primary" onClick={() => location.reload()}>נסו שוב</button>
        </main>
      ) : user ? (
        <FamilyGate user={user} />
      ) : (
        <Loading />
      )}
    </ToastProvider>
  );
}
