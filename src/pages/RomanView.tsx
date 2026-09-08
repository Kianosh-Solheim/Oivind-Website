import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, ShoppingBag, FileText, Hash } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

export default function RomanView() {
  const { id } = useParams();
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { language, t } = useLanguage();

  useEffect(() => {
    const fetchBook = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'books', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBook({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching book", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id]);

  const displayTitle = language === 'en' && book?.language === 'both' && book?.titleEn ? book.titleEn : book?.title;
  const displayDescription = language === 'en' && book?.language === 'both' && book?.descriptionEn ? book.descriptionEn : book?.description;
  const displayBuyLink = language === 'en' && book?.language === 'both' && book?.buyLinkEn ? book.buyLinkEn : book?.buyLink;
  const [isRedirecting, setIsRedirecting] = useState(false);

  if (loading) {
    return (
      <div className="bg-brand-surface min-h-[80vh] flex items-center justify-center">
        <div className="text-brand-muted uppercase tracking-widest font-semibold text-sm animate-pulse">Laster...</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="bg-brand-surface min-h-[80vh] flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-serif text-brand-dark mb-4">Boka vart ikkje funne</h1>
        <Link to="/boker" className="text-brand-accent hover:text-brand-dark underline underline-offset-4 transition-colors">
          Gå attende til bøker
        </Link>
      </div>
    );
  }

  const handleBuyDirectly = async () => {
    setIsRedirecting(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookId: book.id,
          bookTitle: displayTitle,
          price: book.price,
          successUrl: `${window.location.origin}/success`,
          cancelUrl: window.location.href,
        }),
      });
      
      const session = await response.json();
      
      if (session.url) {
        window.location.href = session.url;
      } else {
        alert(session.error || 'Noko gjekk gale ved oppretting av betaling. Stripe er kanskje ikkje konfigurert.');
        setIsRedirecting(false);
      }
    } catch (err) {
      console.error(err);
      alert('Noko gjekk gale');
      setIsRedirecting(false);
    }
  };

  return (
    <div className="bg-brand-surface min-h-screen pb-32">
      <section className="pt-20 pb-12 px-6 md:px-12 text-center max-w-4xl mx-auto">
        <Link to="/boker" className="inline-flex items-center text-brand-muted hover:text-brand-dark transition-colors font-sans text-xs font-semibold tracking-widest uppercase mb-12">
          <ArrowLeft className="mr-2 w-4 h-4" /> {t('BOOKS')}
        </Link>
        <h1 className="text-5xl md:text-6xl font-serif text-brand-dark leading-tight mb-6">
          {displayTitle}
        </h1>
        <div className="w-16 h-px bg-brand-accent mx-auto mb-8"></div>
        <div className="text-xs text-brand-muted uppercase tracking-widest font-semibold">
          {language === 'en' ? 'PUBLISHED' : 'UTGJEVING'}: {book.publishedYear}
        </div>
      </section>

      <section className="px-6 md:px-12 lg:px-24 max-w-[1000px] mx-auto">
        <motion.div 
          className="bg-white border border-brand-sand flex flex-col md:flex-row shadow-sm items-stretch md:items-start"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {book.coverImageUrl ? (
            <div className="w-full md:w-2/5 bg-gray-50 flex-shrink-0 p-8 border-b md:border-b-0 md:border-r border-brand-sand md:self-stretch">
              <div className="sticky top-24 w-full flex items-center justify-center">
                <img src={book.coverImageUrl} alt={`Omslag for ${displayTitle}`} className="w-full h-auto max-h-[600px] object-contain drop-shadow-xl" />
              </div>
            </div>
          ) : (
            <div className="w-full md:w-2/5 bg-gray-50 flex-shrink-0 flex items-start justify-center p-12 border-b md:border-b-0 md:border-r border-brand-sand min-h-[400px] md:self-stretch">
              <div className="sticky top-24">
                <BookOpen className="w-16 h-16 text-gray-300" strokeWidth={1} />
              </div>
            </div>
          )}
          
          <div className="p-8 md:p-12 flex flex-col flex-grow w-full md:w-3/5">
            <div className="text-brand-dark/80 leading-relaxed mb-12 font-serif whitespace-pre-wrap flex-grow prose prose-lg brand-prose">
              {displayDescription}
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-8 border-t border-gray-100">
              <div className="flex flex-wrap gap-4 text-xs font-sans text-brand-muted uppercase tracking-wider">
                {book.pageCount && (
                  <div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {book.pageCount} {language === 'en' ? 'pages' : 'sider'}</div>
                )}
                {book.isbn && (
                  <div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> ISBN: {book.isbn}</div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-4 items-center justify-end">
                {book.price > 0 && (
                  <button 
                    onClick={handleBuyDirectly}
                    disabled={isRedirecting}
                    className="inline-flex items-center justify-center bg-brand-dark hover:bg-black text-white px-6 py-3 text-xs font-semibold tracking-widest uppercase transition-colors shrink-0 disabled:opacity-50"
                  >
                    {isRedirecting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    ) : (
                      <ShoppingBag className="w-4 h-4 mr-2" />
                    )}
                    {language === 'en' ? `Buy directly (${book.price} NOK)` : `Kjøp direkte (${book.price} NOK)`}
                  </button>
                )}
                {displayBuyLink && (
                  <a 
                    href={displayBuyLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-brand-dark border border-gray-200 px-6 py-3 text-xs font-semibold tracking-widest uppercase transition-colors shrink-0"
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    {language === 'en' ? 'Other stores' : 'Andre butikkar'}
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
