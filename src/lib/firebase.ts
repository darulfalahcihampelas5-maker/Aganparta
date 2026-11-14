import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfigLocal from '../../firebase-applet-config.json';

// Clean up any leftover Firestore WebStorage coordination keys and oversized caches
// from previous persistentMultipleTabManager sessions to prevent QuotaExceededError.
function purgeStaleWebStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    let totalChars = 0;
    const cacheCandidates: Array<{ key: string; len: number }> = [];

    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      const val = window.localStorage.getItem(key) || '';
      totalChars += key.length + val.length;

      if (
        key.startsWith('firestore_') ||
        key.startsWith('firebase:previous_websocket_failure')
      ) {
        keysToRemove.push(key);
      } else if (
        key.startsWith('firas_cache_') ||
        key.startsWith('firas_student_')
      ) {
        cacheCandidates.push({ key, len: val.length });
      }
    }

    keysToRemove.forEach((k) => {
      try {
        window.localStorage.removeItem(k);
      } catch {
        // ignore storage removal errors
      }
    });

    // If total usage still exceeds ~2.2M chars (~4.4MB UTF-16), evict largest cache keys first
    if (totalChars > 2_200_000) {
      cacheCandidates.sort((a, b) => b.len - a.len);
      for (const item of cacheCandidates) {
        if (totalChars <= 1_200_000) break;
        try {
          window.localStorage.removeItem(item.key);
          totalChars -= item.key.length + item.len;
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore storage inspection errors
  }
}

purgeStaleWebStorage();

// Use environment variables if available (Vite standard), fallback to local config file
const firebaseConfig = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || firebaseConfigLocal.apiKey,
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || firebaseConfigLocal.authDomain,
  projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || firebaseConfigLocal.projectId,
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || firebaseConfigLocal.storageBucket,
  messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || firebaseConfigLocal.messagingSenderId,
  appId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) || firebaseConfigLocal.appId,
  measurementId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID) || firebaseConfigLocal.measurementId,
  firestoreDatabaseId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_DATABASE_ID) || (firebaseConfigLocal as any).firestoreDatabaseId,
};

const app = initializeApp(firebaseConfig);

const databaseId = firebaseConfig.firestoreDatabaseId || (firebaseConfigLocal as any).firestoreDatabaseId;

// Use memoryLocalCache() instead of persistentMultipleTabManager() to avoid
// localStorage QuotaExceededError crashes inside WebStorageSharedClientState.
// Persistent caching is handled safely with size limits via Supabase + TTL cache utilities.
export const db = databaseId
  ? initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      localCache: memoryLocalCache(),
    }, databaseId)
  : initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      localCache: memoryLocalCache(),
    });

export const auth = getAuth(app);
export const storage = getStorage(app, (firebaseConfig as any).storageBucket);

async function testConnection() {
  if (typeof window === 'undefined') return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is offline. Relying on fallback caches/Supabase.');
    }
  }
}

void testConnection();
