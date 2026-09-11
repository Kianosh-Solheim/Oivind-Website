import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { doc, setDoc, collection, addDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';

export default function VisitorTracker() {
  const location = useLocation();
  const { user } = useAuth();
  const startTime = useRef(Date.now());
  const currentPath = useRef(location.pathname);

  // Track initial overall visit
  useEffect(() => {
    const trackVisit = async () => {
      // Do not track logged in admins
      if (user) return;
      
      if (sessionStorage.getItem('hasVisited')) return;
      sessionStorage.setItem('hasVisited', 'true');
      
      try {
        const statsRef = doc(db, 'stats', 'visitors');
        await setDoc(statsRef, {
          count: increment(1),
          lastVisit: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error('Failed to track visit:', error);
      }
    };
    
    trackVisit();
  }, [user]);

  // Track page views and time spent
  useEffect(() => {
    const now = Date.now();
    
    if (currentPath.current !== location.pathname) {
      const durationSeconds = Math.round((now - startTime.current) / 1000);
      const prevPath = currentPath.current;
      const safePath = prevPath === '/' ? 'home' : prevPath.replace(/[^a-zA-Z0-9]/g, '_').substring(1);
      
      // Only log if not an admin
      if (durationSeconds >= 0 && !user) {
        const pageStatRef = doc(db, 'pageStats', safePath || 'home');
        setDoc(pageStatRef, {
          path: prevPath,
          totalDurationSeconds: increment(durationSeconds),
          views: increment(1),
          lastVisit: serverTimestamp()
        }, { merge: true }).catch(console.error);

        // Log detailed visit
        addDoc(collection(db, 'pageVisits'), {
          path: prevPath,
          durationSeconds,
          timestamp: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
          hour: new Date().getHours()
        }).catch(console.error);
      }

      currentPath.current = location.pathname;
      startTime.current = now;
    }

    const handleBeforeUnload = () => {
      // Do not log if admin
      if (user) return;

      const durationSeconds = Math.round((Date.now() - startTime.current) / 1000);
      const prevPath = currentPath.current;
      const safePath = prevPath === '/' ? 'home' : prevPath.replace(/[^a-zA-Z0-9]/g, '_').substring(1);
      
      if (durationSeconds >= 0) {
        const pageStatRef = doc(db, 'pageStats', safePath || 'home');
        setDoc(pageStatRef, {
          path: prevPath,
          totalDurationSeconds: increment(durationSeconds),
          views: increment(1),
          lastVisit: serverTimestamp()
        }, { merge: true }).catch(console.error);

        // Log detailed visit
        addDoc(collection(db, 'pageVisits'), {
          path: prevPath,
          durationSeconds,
          timestamp: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
          hour: new Date().getHours()
        }).catch(console.error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [location.pathname, user]);

  return null;
}

