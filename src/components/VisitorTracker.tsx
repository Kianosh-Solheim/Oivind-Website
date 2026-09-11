import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { doc, setDoc, updateDoc, collection, addDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';

export default function VisitorTracker() {
  const location = useLocation();
  const { user, loading } = useAuth();

  // Track initial overall visit (unique session)
  useEffect(() => {
    if (loading || user) return;
    
    const trackVisit = async () => {
      if (sessionStorage.getItem('hasVisited')) return;
      sessionStorage.setItem('hasVisited', 'true');
      
      try {
        const statsRef = doc(db, 'stats', 'visitors');
        await setDoc(statsRef, {
          count: increment(1),
          lastVisit: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error('Failed to track overall visit:', error);
      }
    };
    
    trackVisit();
  }, [user, loading]);

  // Track page views and time spent
  useEffect(() => {
    if (loading || user) return;

    const now = Date.now();
    const path = location.pathname;
    const safePath = path === '/' ? 'home' : path.replace(/[^a-zA-Z0-9]/g, '_').substring(1);
    
    let currentVisitId: string | null = null;
    let isUnmounted = false;

    // 1. Log view IMMEDIATELY on page land
    const pageStatRef = doc(db, 'pageStats', safePath || 'home');
    setDoc(pageStatRef, {
      path: path,
      views: increment(1),
      lastVisit: serverTimestamp()
    }, { merge: true }).catch(console.error);

    // 2. Create detailed visit IMMEDIATELY
    addDoc(collection(db, 'pageVisits'), {
      path: path,
      durationSeconds: 0,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      hour: new Date().getHours()
    }).then(docRef => {
      if (!isUnmounted) {
        currentVisitId = docRef.id;
      } else {
        // If the user already left before this resolved, update it immediately
        const durationSeconds = Math.round((Date.now() - now) / 1000);
        updateDoc(docRef, { durationSeconds }).catch(console.error);
        setDoc(pageStatRef, { totalDurationSeconds: increment(durationSeconds) }, { merge: true }).catch(console.error);
      }
    }).catch(console.error);

    // 3. Update duration when unloading the window
    const handleBeforeUnload = () => {
      if (currentVisitId) {
        const durationSeconds = Math.round((Date.now() - now) / 1000);
        const visitRef = doc(db, 'pageVisits', currentVisitId);
        updateDoc(visitRef, { durationSeconds }).catch(console.error);
        setDoc(pageStatRef, { totalDurationSeconds: increment(durationSeconds) }, { merge: true }).catch(console.error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // 4. Update duration when navigating to another page (unmounting this effect)
    return () => {
      isUnmounted = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (currentVisitId) {
        const durationSeconds = Math.round((Date.now() - now) / 1000);
        const visitRef = doc(db, 'pageVisits', currentVisitId);
        updateDoc(visitRef, { durationSeconds }).catch(console.error);
        setDoc(pageStatRef, { totalDurationSeconds: increment(durationSeconds) }, { merge: true }).catch(console.error);
      }
    };
  }, [location.pathname, user, loading]);

  return null;
}

