import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, ShoppingBag, FileText, Hash, ExternalLink, Check, Sparkles, Truck } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, getDocFromCache } from 'firebase/firestore';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { slugify, getBuyLinkType, getBuyButtonText } from '../lib/utils';
import { Book } from '../types';

export default function RomanView() {
  const { id } = useParams();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const { language, t } = useLanguage();

  useEffect(() => {
    const fetchBook = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'books', id);
        let docSnap: any = null;
        try {
          docSnap = await getDoc(docRef);
        } catch (sErr) {
          docSnap = await getDocFromCache(docRef);
        }
        if (docSnap && docSnap.exists()) {
          setBook({ id: docSnap.id, ...docSnap.data() } as Book);
        }
      } catch (error) {
        console.error("Error fetching book", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id]);

  if (loading) {
    return (
      <div className="bg-[#FAF8F5] min-h-[80vh] flex items-center justify-center">
        <div className="text-stone-400 uppercase tracking-widest font-semibold text-xs animate-pulse flex items-center gap-2">
          <BookOpen className="w-5 h-5 animate-spin" />
          <span>{language === 'en' ? 'Loading book...' : 'Laster bok...'}</span>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="bg-[#FAF8F5] min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <BookOpen className="w-16 h-16 text-stone-300 mb-4" strokeWidth={1} />
        <h1 className="text-3xl font-serif text-brand-dark mb-3">
          {language === 'en' ? 'Book not found' : 'Boka vart ikkje funne'}
        </h1>
        <Link 
          to="/boker" 
          className="text-xs uppercase font-semibold tracking-wider text-brand-dark bg-white border border-stone-300 px-5 py-2.5 hover:bg-stone-100 transition-colors"
        >
          {language === 'en' ? 'Return to bookstore' : 'Gå attende til nettbokhandelen'}
        </Link>
      </div>
    );
  }

  const displayTitle = language === 'en' && book.titleEn ? book.titleEn : book.title;
  const displayDescription = language === 'en' && book.descriptionEn ? book.descriptionEn : (book.promoDescription || book.description);
  const rawBuyLink = (language === 'en' && book.buyLinkEn) ? book.buyLinkEn : (book.buyLink || '');
  const buyType = getBuyLinkType(rawBuyLink);
  const isAmazon = buyType === 'amazon';
  const effectivePrice = book.promoSpecialPrice || book.price || 0;
  const slug = book.promoSlug || slugify(book.title);
  const salesUrl = `/salg/${slug}`;

  let shippingText = book.promoShippingText || '';
  if (isAmazon) {
    shippingText = language === 'en' ? 'In stock • Delivery from Amazon' : 'På lager • Levering frå Amazon';
  } else if (!shippingText) {
    shippingText = language === 'en' ? 'In stock for fast delivery • Signed copy' : 'På lager for rask sending • Signert utgåve';
  }

  return (
    <div className="bg-[#FAF8F5] min-h-screen pb-32 selection:bg-brand-accent/20">
      
      {/* TOP NAVIGATION */}
      <div className="max-w-[1200px] mx-auto pt-12 pb-6 px-6 md:px-12">
        <Link 
          to="/boker" 
          className="inline-flex items-center text-stone-500 hover:text-brand-dark transition-colors text-xs font-semibold tracking-widest uppercase mb-8"
        >
          <ArrowLeft className="mr-2 w-4 h-4" /> {language === 'en' ? 'All books in store' : 'Alle bøker i nettbokhandelen'}
        </Link>
      </div>

      {/* BOOK MAIN PRESENTATION CARD */}
      <section className="px-6 md:px-12 max-w-[1200px] mx-auto">
        <motion.div 
          className="bg-white border border-stone-200/90 rounded-sm shadow-sm flex flex-col lg:flex-row items-stretch overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          
          {/* LEFT: 3D BOOK COVER DISPLAY */}
          <div className="w-full lg:w-5/12 bg-[#F5F2EC] flex-shrink-0 p-8 sm:p-12 border-b lg:border-b-0 lg:border-r border-stone-200 flex items-center justify-center">
            <div className="w-full max-w-[320px] sticky top-28">
              {book.coverImageUrl ? (
                <div className="relative rounded-sm shadow-[0_20px_45px_-10px_rgba(0,0,0,0.35)] border border-stone-200 overflow-hidden bg-white aspect-[2/3]">
                  <img 
                    src={book.coverImageUrl} 
                    alt={displayTitle} 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-y-0 left-0 w-3.5 bg-gradient-to-r from-black/25 via-transparent to-transparent pointer-events-none" />
                </div>
              ) : (
                <div className="aspect-[2/3] bg-stone-200 rounded border border-stone-300 flex flex-col items-center justify-center p-8 text-center shadow-md">
                  <BookOpen className="w-16 h-16 text-stone-400 mb-3" strokeWidth={1} />
                  <span className="font-serif text-lg text-brand-dark">{displayTitle}</span>
                </div>
              )}

              {/* STOCK BADGE BELOW COVER */}
              <div className="mt-6 text-center">
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{shippingText}</span>
                </span>
              </div>
            </div>
          </div>
          
          {/* RIGHT: DETAILS & ACTIONS */}
          <div className="p-8 sm:p-12 flex flex-col flex-grow w-full lg:w-7/12 justify-between">
            <div>
              
              {/* BADGES & YEAR */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {isAmazon ? (
                  <span className="px-2.5 py-1 bg-amber-500 text-stone-950 font-bold text-[10px] tracking-widest uppercase rounded">
                    Amazon
                  </span>
                ) : book.promoBadge ? (
                  <span className="px-2.5 py-1 bg-brand-dark text-white text-[10px] tracking-wider uppercase font-semibold rounded flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    {book.promoBadge}
                  </span>
                ) : null}

                <span className="text-xs text-stone-500 font-mono">
                  {language === 'en' ? 'Published' : 'Utgjeve'}: {book.publishedYear}
                </span>
              </div>

              {/* TITLE */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-brand-dark leading-tight mb-4">
                {displayTitle}
              </h1>

              <div className="text-xs font-semibold tracking-widest uppercase text-brand-accent mb-6">
                Øivind H. Solheim
              </div>

              {/* HEADLINE */}
              {book.promoHeadline && (
                <p className="text-lg font-serif italic text-stone-700 leading-relaxed mb-6 border-l-2 border-brand-accent pl-3.5">
                  «{book.promoHeadline}»
                </p>
              )}

              {/* DESCRIPTION */}
              <div className="text-stone-700 text-sm sm:text-base leading-relaxed mb-8 font-sans whitespace-pre-wrap">
                {displayDescription}
              </div>

              {/* EXCERPT PREVIEW IF PRESENT */}
              {book.promoExcerpt && (
                <div className="bg-stone-50 border border-stone-200/80 rounded p-4 mb-8 text-xs font-serif italic text-stone-600 leading-relaxed">
                  <div className="font-sans font-semibold text-[10px] uppercase tracking-wider text-stone-500 not-italic mb-1">
                    {language === 'en' ? 'Book Excerpt' : 'Utdrag frå boka'}
                  </div>
                  «{book.promoExcerpt}»
                </div>
              )}

              {/* METADATA STRIP */}
              <div className="flex flex-wrap gap-4 text-xs font-mono text-stone-500 uppercase tracking-wider pb-6 border-b border-stone-100">
                {book.pageCount ? (
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{book.pageCount} {language === 'en' ? 'pages' : 'sider'}</span>
                  </div>
                ) : null}
                {book.isbn ? (
                  <div className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    <span>ISBN: {book.isbn}</span>
                  </div>
                ) : null}
              </div>

            </div>

            {/* PRICE & ORDER CTAs */}
            <div className="pt-6 mt-6 border-t border-stone-100">
              <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
                {effectivePrice > 0 && (
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-stone-500 font-semibold block mb-0.5">
                      {language === 'en' ? 'Book Price' : 'Bokpris'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-serif font-bold text-brand-dark">
                        kr {effectivePrice},-
                      </span>
                      {book.promoSpecialPrice && book.price && book.promoSpecialPrice < book.price && (
                        <span className="text-sm text-stone-400 line-through font-mono">
                          kr {book.price},-
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-right">
                  <span className="text-xs text-stone-500 block">
                    {isAmazon ? 'Amazon Global Logistics' : 'Posten / Rett i postkassa'}
                  </span>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap gap-3 items-center">
                {rawBuyLink ? (
                  <a 
                    href={rawBuyLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`flex-grow sm:flex-grow-0 px-6 py-3.5 text-xs font-semibold tracking-widest uppercase transition-colors inline-flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer ${
                      isAmazon 
                        ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                        : 'bg-brand-dark hover:bg-black text-white'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{isAmazon ? (language === 'en' ? 'Buy on Amazon' : 'Kjøp på Amazon') : (language === 'en' ? 'Buy Book Now' : 'Kjøp boka no')}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                ) : null}

                {/* DEDICATED SALES PAGE BUTTON */}
                <Link 
                  to={salesUrl}
                  className="flex-grow sm:flex-grow-0 px-6 py-3.5 border border-stone-300 hover:border-brand-dark text-brand-dark hover:bg-stone-50 text-xs font-semibold tracking-widest uppercase transition-colors inline-flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4 text-brand-accent" />
                  <span>{language === 'en' ? 'Dedicated Book Landing Page' : 'Gå til bokas salgsside'}</span>
                </Link>
              </div>

            </div>

          </div>
        </motion.div>
      </section>

    </div>
  );
}
