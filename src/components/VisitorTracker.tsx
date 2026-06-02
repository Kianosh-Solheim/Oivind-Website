import { useEffect } from 'react';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function VisitorTracker() {
  useEffect(() => {
    const trackVisit = async () => {
      if (sessionStorage.getItem('hasVisited')) return;
      sessionStorage.setItem('hasVisited', 'true');
      
      try {
        const statsRef = doc(db, 'stats', 'visitors');
        const statsDoc = await getDoc(statsRef);
        
        if (!statsDoc.exists()) {
          await setDoc(statsRef, {
            count: 1,
            lastVisit: new Date()
          });
        } else {
          await setDoc(statsRef, {
            count: increment(1),
            lastVisit: new Date()
          }, { merge: true });
        }
      } catch (error) {
        console.error('Failed to track visit:', error);
      }
    };
    
    trackVisit();
  }, []);

  return null;
}
