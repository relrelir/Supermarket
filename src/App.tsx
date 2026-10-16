import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { ensureUser, isConfigured } from './firebase';
import { useFamily, useProfile } from './data/hooks';
import { SessionProvider, ToastProvider } from './context';
import { useRoute } from './router';
import { Loading } from './ui';
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

function FamilySession({ user, familyId, displayName }: { user: User; familyId: string; displayName: string }) {
  const family = useFamily(familyId);
  if (family === undefined) return <Loading />;
  // Family deleted or access lost: let the user create or join again.
  if (family === null) return <Welcome initialName={displayName} />;
  return (
    <SessionProvider value={{ uid: user.uid, displayName, family }}>
      <Routes />
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
