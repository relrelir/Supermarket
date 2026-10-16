import { useState } from 'react';
import { createFamily, joinFamily } from '../data/api';
import { joinCodeFromUrl } from '../router';
import { cleanCode } from '../utils';

export function Welcome({ initialName }: { initialName: string }) {
  const urlCode = joinCodeFromUrl();
  const [mode, setMode] = useState<'create' | 'join'>(urlCode ? 'join' : 'create');
  const [name, setName] = useState(initialName);
  const [familyName, setFamilyName] = useState('');
  const [code, setCode] = useState(cleanCode(urlCode));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'create') await createFamily(familyName.trim() || 'המשפחה שלנו', name.trim());
      else await joinFamily(code, name.trim());
      if (urlCode) history.replaceState(null, '', location.pathname + '#/');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error && /[֐-׿]/.test(err.message) ? err.message : 'משהו השתבש. בדקו חיבור לאינטרנט ונסו שוב.');
    } finally {
      setBusy(false);
    }
  };

  const ready = name.trim() && (mode === 'create' || cleanCode(code).length === 6);

  return (
    <main className="welcome">
      <div className="logo">🛒</div>
      <h1>רשימת קניות משפחתית</h1>
      <p className="muted">רשימה אחת לכל המשפחה, מסונכרנת בכל הטלפונים.</p>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'create'} className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}>
          משפחה חדשה
        </button>
        <button role="tab" aria-selected={mode === 'join'} className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')}>
          הצטרפות בקוד
        </button>
      </div>

      <form className="card form" onSubmit={submit}>
        <label>
          השם שלי
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: אבא" autoComplete="given-name" />
        </label>
        {mode === 'create' ? (
          <label>
            שם המשפחה
            <input value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="למשל: משפחת כהן" />
          </label>
        ) : (
          <label>
            קוד משפחה (6 תווים)
            <input
              className="code-input"
              value={code}
              onChange={(e) => setCode(cleanCode(e.target.value).slice(0, 6))}
              placeholder="ABC123"
              dir="ltr"
              autoCapitalize="characters"
              inputMode="text"
            />
          </label>
        )}
        {error && <p className="error">{error}</p>}
        <button className="btn primary big" disabled={!ready || busy}>
          {busy ? 'רגע…' : mode === 'create' ? 'יצירת משפחה' : 'הצטרפות'}
        </button>
      </form>
      {mode === 'create' && <p className="muted small">אחרי היצירה תקבלו קוד לשתף עם בני המשפחה.</p>}
    </main>
  );
}
