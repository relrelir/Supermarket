import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import projectConfig from './firebase-config.json';

const env = import.meta.env;
const useEmulators = env.VITE_USE_EMULATORS === 'true';

// The web config is public by design (it ships to every browser); access is guarded by firestore.rules.
// VITE_FIREBASE_* variables override it, e.g. to point a local build at another project.
const base: Partial<typeof projectConfig> = useEmulators
  ? { apiKey: 'demo-key', projectId: 'demo-family' }
  : projectConfig;

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY || base.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || base.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || base.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || base.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || base.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || base.appId,
};

export const isConfigured = Boolean(config.apiKey && config.projectId);

const app = initializeApp(isConfigured ? config : { apiKey: 'missing', projectId: 'missing' });

export const auth = getAuth(app);

// Local cache keeps the list usable without reception in the store; writes sync when back online.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (useEmulators) {
  const host = env.VITE_EMULATOR_HOST || location.hostname;
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
}

let userPromise: Promise<User> | null = null;

/** Resolves with the signed-in user, signing in anonymously on first launch. Safe to call repeatedly. */
export function ensureUser(): Promise<User> {
  userPromise ??= new Promise<User>((resolve, reject) => {
    const stop = onAuthStateChanged(auth, (user) => {
      if (user) {
        stop();
        resolve(user);
      } else {
        signInAnonymously(auth).catch((e) => {
          stop();
          userPromise = null;
          reject(e);
        });
      }
    });
  });
  return userPromise;
}
