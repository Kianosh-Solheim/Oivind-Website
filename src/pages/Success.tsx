import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Success() {
  const [searchParams] = useSearchParams();
  const session_id = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const { language } = useLanguage();
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (!session_id || verifyingRef.current) return;
    verifyingRef.current = true;

    const verifySession = async () => {
      try {
        // First check if we already saved this order (prevent duplicate writes on refresh)
        const q = query(collection(db, 'orders'), where('sessionId', '==', session_id));
        const existing = await getDocs(q);
        
        const response = await fetch(`/api/verify-checkout-session?session_id=${session_id}`);
        const data = await response.json();

        if (data.payment_status === 'paid') {
          setOrderDetails(data);
          setStatus('success');
          
          if (existing.empty) {
            // Write order to Firestore
            await addDoc(collection(db, 'orders'), {
              sessionId: session_id,
              bookId: data.metadata?.bookId || 'unknown',
              bookTitle: data.metadata?.bookTitle || 'Unknown Book',
              customerName: data.customer_name || '',
              customerEmail: data.customer_email || '',
              amount: data.amount_total || 0,
              status: 'paid',
              createdAt: serverTimestamp()
            });
          }
        } else {
          setStatus('error');
        }
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    };

    verifySession();
  }, [session_id]);

  if (!session_id) {
    return (
      <div className="bg-brand-surface min-h-screen pt-32 pb-20 px-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-brand-dark mb-4">Manglar session-ID</h1>
          <Link to="/boker" className="text-brand-accent hover:text-brand-dark transition-colors text-xs font-semibold tracking-widest uppercase">Tilbake til bøker</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-surface min-h-[80vh] pt-32 pb-20 px-6 flex flex-col items-center justify-center">
      <div className="max-w-lg w-full bg-white p-12 border border-brand-sand shadow-sm text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin mb-6" />
            <h1 className="text-xl font-serif text-brand-dark uppercase tracking-widest">
              {language === 'en' ? 'Verifying payment...' : 'Verifiserer betaling...'}
            </h1>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-6" />
            <h1 className="text-2xl font-serif text-brand-dark mb-4">
              {language === 'en' ? 'Thank you for your order!' : 'Takk for bestillinga!'}
            </h1>
            <p className="text-brand-dark/80 font-sans mb-8">
              {language === 'en' ? 'Your payment was successful and your order has been registered.' : 'Betalinga var vellukka og ordren din er registrert.'}
            </p>
            {orderDetails && (
              <div className="bg-gray-50 border border-gray-100 p-6 text-left w-full mb-8">
                <h3 className="text-xs uppercase tracking-widest font-semibold text-brand-muted mb-4">
                  {language === 'en' ? 'Order Summary' : 'Ordreoppsummering'}
                </h3>
                <div className="text-sm space-y-2">
                  <p><strong>Bok:</strong> {orderDetails.metadata?.bookTitle}</p>
                  <p><strong>Kunde:</strong> {orderDetails.customer_name}</p>
                  <p><strong>E-post:</strong> {orderDetails.customer_email}</p>
                  <p><strong>Beløp:</strong> {(orderDetails.amount_total / 100).toFixed(2)} NOK</p>
                </div>
              </div>
            )}
            <Link to="/boker" className="bg-brand-dark text-white px-8 py-3 text-xs font-semibold tracking-widest uppercase hover:bg-black transition-colors">
              {language === 'en' ? 'Back to books' : 'Tilbake til bøker'}
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <XCircle className="w-16 h-16 text-red-500 mb-6" />
            <h1 className="text-2xl font-serif text-brand-dark mb-4">
              {language === 'en' ? 'Payment Failed' : 'Betaling feila'}
            </h1>
            <p className="text-brand-dark/80 font-sans mb-8">
              {language === 'en' ? 'We could not verify the payment. Please contact support.' : 'Vi kunne ikkje verifisere betalinga. Ver venleg å ta kontakt med kundeservice.'}
            </p>
            <Link to="/boker" className="bg-brand-dark text-white px-8 py-3 text-xs font-semibold tracking-widest uppercase hover:bg-black transition-colors">
              {language === 'en' ? 'Back to books' : 'Tilbake til bøker'}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
