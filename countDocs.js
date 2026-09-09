import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getCountFromServer } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function count() {
  const collections = ['articles', 'books', 'diary', 'gallery', 'orders', 'pageStats'];
  for (const c of collections) {
    try {
      const coll = collection(db, c);
      const snapshot = await getCountFromServer(coll);
      console.log(`Collection ${c}: ${snapshot.data().count} documents`);
    } catch (e) {
      console.error(`Error counting ${c}:`, e.message);
    }
  }
}
count();
