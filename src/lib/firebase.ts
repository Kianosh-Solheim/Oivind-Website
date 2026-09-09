import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json'; // adjust path if needed

const app = initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence
const rawDbId = (firebaseConfig as any).firestoreDatabaseId;
const dbId = rawDbId && rawDbId !== '(default)' ? rawDbId : undefined;

export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  },
  dbId
);

export const auth = getAuth();
