import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Check, 
  Truck, 
  PenTool, 
  ShieldCheck, 
  Star, 
  ArrowLeft, 
  BookOpen, 
  ExternalLink, 
  FileText, 
  Hash, 
  ChevronDown,
  AlertCircle,
  Sparkles,
  Edit3,
  Globe
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, doc, getDoc, getDocFromCache, writeBatch, serverTimestamp } from 'firebase/firestore';
import { getCachedDocs, invalidateCache } from '../lib/dbCache';
import { motion, AnimatePresence } from 'motion/react';
import { slugify, resolveBookBuyLinks, getSecondaryEditionButtonLabel, hasBookLanguageInfo } from '../lib/utils';
import { Book, AboutSettings } from '../types';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BookWysiwygEditor from '../components/BookWysiwygEditor';

export default function BokSalg() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [book, setBook] = useState<Book | null>(null);
  const [, setAllBooks] = useState<Book[]>([]);
  const [aboutData, setAboutData] = useState<AboutSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [readExcerptOpen, setReadExcerptOpen] = useState(false);
  const [isWysiwygOpen, setIsWysiwygOpen] = useState(false);

  // Fetch book based on slug or load all for /salg showcase
  useEffect(() => {
    const loadBookData = async () => {
      setLoading(true);
      try {
        // Load author info from settings/about
        try {
          const aboutRef = doc(db, 'settings', 'about');
          let aboutSnap: any = null;
          try {
            aboutSnap = await getDoc(aboutRef);
          } catch (e) {
            aboutSnap = await getDocFromCache(aboutRef);
          }
          if (aboutSnap && aboutSnap.exists()) {
            setAboutData(aboutSnap.data() as AboutSettings);
          }
        } catch (aboutErr) {
          console.warn('Kunne ikkje hente forfattarinfo frå settings/about:', aboutErr);
        }

        const q = query(collection(db, 'books'), orderBy('publishedYear', 'desc'));
        let snap: any = null;
        try {
          snap = await getCachedDocs(q, 'books_all');
        } catch (e) {
          snap = await getDocs(q);
        }

        const list: Book[] = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        setAllBooks(list);

        if (slug) {
          const decodedSlug = decodeURIComponent(slug).trim().toLowerCase();
          const targetSlug = slugify(decodedSlug);

          // 1. Direct promoSlug match or targetSlug match
          let found = list.find(b => b.promoSlug && (b.promoSlug.toLowerCase() === decodedSlug || slugify(b.promoSlug) === targetSlug));
          
          // 2. ID match
          if (!found) {
            found = list.find(b => b.id === slug || b.id === decodedSlug);
          }

          // 3. Title match (slugified or exact lowercase)
          if (!found) {
            found = list.find(b => slugify(b.title) === targetSlug || b.title.toLowerCase() === decodedSlug);
          }

          if (found) {
            setBook(found);
          } else {
            setBook(null);
          }
        } else if (list.length > 0) {
          // If at /salg with no slug, check if one has promoActive, else pick latest book
          const activePromo = list.find(b => b.promoActive);
          setBook(activePromo || list[0]);
        }
      } catch (err) {
        console.error('Feil ved henting av bok til salgsside:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBookData();
  }, [slug]);

  // Scroll listener for sticky mobile purchase bar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 480) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[85vh] bg-[#FDFCF7] flex flex-col items-center justify-center p-6 text-brand-dark">
        <div className="w-10 h-10 border-2 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin mb-4" />
        <p className="text-xs uppercase tracking-widest font-semibold text-brand-muted">Laster bokpromosjon...</p>
      </div>
    );
  }

  // If no book found
  if (!book) {
    return (
      <div className="min-h-[85vh] bg-[#FDFCF7] py-20 px-6 flex flex-col items-center justify-center text-center">
        <BookOpen className="w-16 h-16 text-brand-muted/40 mb-6" strokeWidth={1} />
        <h1 className="text-3xl md:text-4xl font-serif text-brand-dark mb-4">Salgssida vart ikkje funne</h1>
        <p className="text-brand-muted max-w-md mb-8 text-sm leading-relaxed">
          Vi fann diverre ikkje boka du leita etter. Sjekk adressa eller sjå alle tilgjengelege bøker.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            to="/boker"
            className="px-6 py-3.5 bg-brand-dark hover:bg-black text-white text-xs font-semibold tracking-widest uppercase transition-colors"
          >
            Sjå alle bøker
          </Link>
          <Link
            to="/"
            className="px-6 py-3.5 border border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white text-xs font-semibold tracking-widest uppercase transition-colors"
          >
            Attende til framsida
          </Link>
        </div>
      </div>
    );
  }

  const currentLang: 'no' | 'en' = language === 'en' ? 'en' : 'no';
  const hasLangInfo = hasBookLanguageInfo(book, currentLang);
  const effectivePrice = book.promoSpecialPrice || book.price || 299;
  const buyLinks = resolveBookBuyLinks(book, currentLang);
  const buyUrl = buyLinks.primaryLink;
  const isAmazon = buyLinks.primaryIsAmazon;
  const isStripe = buyLinks.primaryIsStripe;
  const hasBothEditions = buyLinks.hasBothEditions;
  const secondaryBuyUrl = buyLinks.secondaryLink;
  const secondaryLang = buyLinks.secondaryLang;

  const displayTitle = (currentLang === 'en' && book.titleEn) ? book.titleEn : book.title;
  const displayDescription = currentLang === 'en'
    ? (book.promoDescriptionEn || book.descriptionEn || (book.language === 'en' ? (book.promoDescription || book.description) : ''))
    : (book.promoDescription || book.description || '');
  const displayExcerpt = currentLang === 'en'
    ? (book.promoExcerptEn || (book.language === 'en' ? book.promoExcerpt : ''))
    : (book.promoExcerpt || '');

  const defaultBadge = isAmazon
    ? (currentLang === 'en' ? 'Available on Amazon' : 'Tilgjengeleg på Amazon')
    : (currentLang === 'en' ? 'Signed edition available' : 'Moglegheit for signert utgåve utan ekstra kostnad');
  const rawBadge = currentLang === 'en' ? book.promoBadgeEn : book.promoBadge;
  const badgeText = (!rawBadge || rawBadge === 'Signert utgåve frå forfattaren' || (isAmazon && rawBadge.toLowerCase().includes('signert')))
    ? defaultBadge
    : rawBadge;

  const headline = currentLang === 'en'
    ? (book.promoHeadlineEn || (book.language === 'en' ? book.promoHeadline : ''))
    : (book.promoHeadline || 'Ein gripande roman om menneske, val og framtid');

  const shippingText = isAmazon
    ? (currentLang === 'en' ? (book.promoShippingTextEn || 'In stock • Delivery from Amazon') : 'Levering frå Amazon')
    : (currentLang === 'en'
        ? (book.promoShippingTextEn || 'Free shipping direct to your mailbox')
        : (book.promoShippingText || 'Fri frakt rett heim i postkassa di'));
  
  const isReviewsExplicitlyOff = book.showReviews === false || book.showPromoQuotes === false;
  const showReviewsSection = !isReviewsExplicitlyOff;

  const quotes = currentLang === 'en'
    ? (book.promoQuotesEn && book.promoQuotesEn.length > 0
        ? book.promoQuotesEn
        : (book.language === 'en' && book.promoQuotes ? book.promoQuotes : []))
    : (book.promoQuotes && book.promoQuotes.length > 0
        ? book.promoQuotes
        : [
            {
              quote: "Bøker som opnar dører til refleksjon og djupare meining.",
              author: "Omtale",
              source: "Litterært blikk"
            }
          ]);

  const handleWysiwygSave = async (updatedFields: Partial<Book>) => {
    if (!book || !book.id) return;
    const batch = writeBatch(db);
    const sanitizedPayload: Record<string, any> = {};
    for (const [key, val] of Object.entries(updatedFields)) {
      if (val !== undefined) {
        sanitizedPayload[key] = val;
      }
    }
    sanitizedPayload.updatedAt = serverTimestamp();

    batch.update(doc(db, 'books', book.id), sanitizedPayload);
    await batch.commit();
    invalidateCache();
    setBook(prev => prev ? { ...prev, ...sanitizedPayload } : null);
  };

  return (
    <div className="bg-[#FDFCF7] text-brand-dark min-h-screen selection:bg-brand-accent/20">
      
      {/* ADMIN WYSIWYG QUICK BAR */}
      {isAdmin && book && (
        <div className="bg-amber-500 text-stone-950 px-6 py-2.5 text-xs font-semibold flex flex-wrap items-center justify-between gap-3 shadow-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-stone-950 shrink-0" />
            <span>Administrator-modus: Du ser denne boka slik lesarane gjer.</span>
          </div>
          <button
            type="button"
            onClick={() => setIsWysiwygOpen(true)}
            className="px-3.5 py-1.5 bg-stone-950 hover:bg-black text-amber-300 font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Rediger boka visuelt (WYSIWYG)</span>
          </button>
        </div>
      )}

      {/* RENDER WYSIWYG EDITOR MODAL */}
      {isAdmin && isWysiwygOpen && book && (
        <BookWysiwygEditor
          book={book}
          onSave={handleWysiwygSave}
          onClose={() => setIsWysiwygOpen(false)}
          onSwitchToForm={() => navigate(`/admin?tab=books&targetBook=${book.id}`)}
        />
      )}

      {/* TOP NAVIGATION / BREADCRUMB */}
      <nav className="border-b border-stone-200/70 bg-white/80 backdrop-blur-sm sticky top-0 z-40 px-6 md:px-12 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link 
            to="/boker" 
            className="inline-flex items-center text-xs font-semibold tracking-widest uppercase text-brand-muted hover:text-brand-dark transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-2" /> {currentLang === 'en' ? 'All books' : 'Alle bøker'}
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <span className="hidden md:inline-block text-[11px] font-mono uppercase tracking-wider text-brand-muted">
              {currentLang === 'en' ? 'Book Launch & Store' : 'Kampanje & Salg'}
            </span>
            {hasBothEditions && secondaryBuyUrl && secondaryLang && (
              <a
                href={secondaryBuyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex px-3 py-2 border border-stone-300 hover:border-brand-dark bg-white hover:bg-stone-50 text-brand-dark text-[11px] font-semibold tracking-wider uppercase transition-colors items-center gap-1.5"
              >
                <Globe className="w-3.5 h-3.5 text-brand-accent" />
                <span>{getSecondaryEditionButtonLabel(secondaryLang, secondaryBuyUrl, currentLang)}</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            )}
            {buyUrl ? (
              <a
                href={buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-brand-dark hover:bg-black text-white text-[11px] font-semibold tracking-widest uppercase transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>
                  {isAmazon
                    ? (currentLang === 'en' ? 'Buy on Amazon' : 'Kjøp frå Amazon')
                    : isStripe
                      ? (currentLang === 'en' ? 'Buy book (Stripe)' : 'Kjøp boka (Stripe)')
                      : (currentLang === 'en' ? 'Buy book' : 'Kjøp boka')}
                </span>
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
              </a>
            ) : (
              <span className="px-3 py-1.5 text-xs text-stone-500 bg-stone-100 rounded">
                {currentLang === 'en' ? 'Purchase link coming soon' : 'Kjøpslenkje kjem snart'}
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* HERO / FRONTCOVER PROMOTION SECTION */}
      <section className="pt-12 md:pt-20 pb-16 md:pb-24 px-6 md:px-12 lg:px-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* LEFT: 3D-STYLED PROMINENT FRONTCOVER */}
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-5 flex flex-col items-center justify-center order-1 lg:order-1"
          >
            <div className="relative group max-w-[340px] sm:max-w-[380px] w-full">
              
              {/* Soft decorative background glow */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-amber-100/60 to-stone-200/50 rounded-2xl filter blur-xl opacity-70 -z-10 group-hover:opacity-100 transition-opacity" />

              {/* Book presentation frame */}
              <div className="relative bg-white p-3 md:p-4 rounded-sm shadow-2xl border border-stone-200/80 transition-transform duration-500 group-hover:-translate-y-1">
                {book.coverImageUrl ? (
                  <div className="relative overflow-hidden bg-stone-100 rounded-sm aspect-[1/1.5] flex items-center justify-center shadow-inner">
                    <img
                      src={book.coverImageUrl}
                      alt={`Frontcover for ${book.title}`}
                      className="w-full h-full object-cover object-center transform transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                    
                    {/* Spine highlight overlay effect */}
                    <div className="absolute top-0 bottom-0 left-0 w-4 bg-gradient-to-r from-black/20 via-white/10 to-transparent pointer-events-none" />
                    <div className="absolute top-0 bottom-0 left-2 w-px bg-white/30 pointer-events-none" />
                  </div>
                ) : (
                  <div className="aspect-[1/1.5] bg-stone-100 flex flex-col items-center justify-center p-8 text-center border border-dashed border-stone-300">
                    <BookOpen className="w-16 h-16 text-stone-300 mb-3" strokeWidth={1} />
                    <span className="font-serif text-lg font-bold text-brand-dark line-clamp-3">{book.title}</span>
                    <span className="text-xs text-brand-muted mt-2">av Øivind H. Solheim</span>
                  </div>
                )}
              </div>

              {/* Small trust caption under cover */}
              <div className="mt-4 text-center">
                <p className="text-[11px] font-sans text-brand-muted tracking-wider uppercase">
                  {currentLang === 'en' ? 'Physical book' : 'Fysisk bok'} • {book.pageCount ? `${book.pageCount} ${currentLang === 'en' ? 'pages' : 'sider'} • ` : ''} {currentLang === 'en' ? 'Published' : 'Utgjeve'} {book.publishedYear}
                </p>
              </div>
            </div>
          </motion.div>

          {/* RIGHT: CONVERSION HEADLINE, PRICE & PRIMARY PURCHASE CTA */}
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="lg:col-span-7 flex flex-col items-start order-2 lg:order-2"
          >
            {/* BADGE */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-900 rounded-full text-xs font-semibold tracking-wide mb-6">
              <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span>{badgeText}</span>
            </div>

            {/* TITLE */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-brand-dark leading-[1.1] mb-5 tracking-tight">
              {displayTitle}
            </h1>

            {/* AUTHOR CREDIT */}
            <p className="text-sm font-sans tracking-widest uppercase font-semibold text-brand-accent mb-6">
              {currentLang === 'en' ? 'by Øivind H. Solheim' : 'av Øivind H. Solheim'}
            </p>

            {/* HERO TAGLINE / SLAGORD OR MISSING LANGUAGE INFO BOX */}
            {hasLangInfo ? (
              headline ? (
                <p className="text-lg sm:text-xl font-serif text-stone-700 leading-relaxed mb-8 border-l-2 border-brand-accent pl-4 italic">
                  {headline}
                </p>
              ) : null
            ) : (
              <div className="w-full bg-amber-50/90 border border-amber-200 rounded-sm p-5 mb-8">
                <div className="flex items-start gap-3 mb-3.5">
                  <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 mb-1">
                      {currentLang === 'en'
                        ? 'Not all information is available in English'
                        : 'Ikkje all informasjon er tilgjengeleg på norsk'}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                      {currentLang === 'en'
                        ? 'Not all information for this book is available in the language the website is currently set to. Switch language to read the full presentation.'
                        : 'Ikkje all informasjon om denne boka er tilgjengeleg på språket nettsida er på no. Byt språk for å lese heile omtalen.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLanguage(currentLang === 'en' ? 'no' : 'en')}
                  className="px-4 py-2.5 bg-brand-dark hover:bg-black text-white text-xs font-semibold tracking-wider uppercase rounded-sm transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  <Globe className="w-4 h-4 text-amber-400" />
                  <span>{currentLang === 'en' ? 'Switch to Norwegian (Norsk)' : 'Byt til engelsk (English)'}</span>
                </button>
              </div>
            )}

            {/* PRICE & OFFERS BOX */}
            <div className="w-full bg-white border border-stone-200/90 rounded-sm p-6 sm:p-7 shadow-sm mb-8">
              <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4 border-b border-stone-100">
                <div>
                  <span className="text-xs uppercase tracking-widest text-brand-muted font-semibold block mb-1">
                    {currentLang === 'en' ? 'Book Price' : 'Kampanjepris'}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-serif font-bold text-brand-dark">
                      kr {effectivePrice},-
                    </span>
                    {book.promoSpecialPrice && book.price && book.price > book.promoSpecialPrice && (
                      <span className="text-sm text-stone-400 line-through">
                        kr {book.price},-
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />{' '}
                    {isAmazon
                      ? (currentLang === 'en' ? 'In stock on Amazon' : 'På lager')
                      : (currentLang === 'en' ? 'In stock for fast shipping' : 'På lager for rask sending')}
                  </span>
                  <p className="text-[11px] text-stone-500 mt-1">
                    {shippingText}
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS - PRIMARY (ACTIVE LANGUAGE) + SECONDARY (OTHER LANGUAGE IF BOTH EXIST) */}
              <div className="pt-6 space-y-3">
                {buyUrl ? (
                  <a
                    href={buyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    id="buy-book-primary-cta"
                    className={`w-full py-4 px-8 font-sans text-sm sm:text-base font-semibold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-[0.99] group cursor-pointer ${
                      isAmazon
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-brand-dark hover:bg-black text-white'
                    }`}
                  >
                    <ShoppingBag className="w-5 h-5 transition-transform group-hover:scale-110" />
                    <span>
                      {isAmazon
                        ? (currentLang === 'en' ? 'Buy on Amazon' : 'Kjøp frå Amazon')
                        : (currentLang === 'en' ? 'Buy the book now' : 'Kjøp boka no')}
                    </span>
                    <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                  </a>
                ) : (
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded text-center text-xs text-stone-600">
                    <AlertCircle className="w-4 h-4 mx-auto text-amber-600 mb-1" />
                    {currentLang === 'en'
                      ? 'Purchase link (Stripe or Amazon) for this book has not been added yet.'
                      : 'Kjøpslenkje (Stripe eller Amazon) for denne boka er ikkje lagt inn enno.'}
                  </div>
                )}

                {/* SECONDARY LANGUAGE EDITION BUTTON WHEN BOOK HAS LINKS FOR BOTH NORWEGIAN AND ENGLISH */}
                {hasBothEditions && secondaryBuyUrl && secondaryLang && (
                  <a
                    href={secondaryBuyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    id="buy-book-secondary-lang-cta"
                    className="w-full py-3.5 px-6 bg-stone-50 hover:bg-amber-50/70 border border-stone-300 hover:border-amber-500 text-brand-dark font-sans text-xs sm:text-sm font-semibold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2.5 group cursor-pointer"
                  >
                    <Globe className="w-4 h-4 text-brand-accent shrink-0" />
                    <span>{getSecondaryEditionButtonLabel(secondaryLang, secondaryBuyUrl, currentLang)}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
              </div>

              {/* 3 VALUE GUARANTEES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 mt-6 border-t border-stone-100 text-xs text-stone-600">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-brand-accent shrink-0" />
                  <span>
                    {isAmazon
                      ? (currentLang === 'en' ? 'Delivery from Amazon' : 'Levering frå Amazon')
                      : (currentLang === 'en' ? 'Fast delivery to your home' : 'Rask levering rett heim')}
                  </span>
                </div>
                {isAmazon ? (
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-brand-accent shrink-0" />
                    <span>{currentLang === 'en' ? 'English / International edition' : 'Originalutgåve'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-brand-accent shrink-0" />
                    <span>{currentLang === 'en' ? 'Signed copy at no extra cost' : 'Signert utgåve utan ekstra kostnad'}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-accent shrink-0" />
                  <span className="font-medium text-stone-800">
                    {isAmazon
                      ? (currentLang === 'en' ? 'Buy from Amazon' : 'Kjøp frå Amazon')
                      : isStripe
                        ? (currentLang === 'en' ? 'Secure payment with Stripe' : 'Trygg betaling med Stripe')
                        : (currentLang === 'en' ? 'Secure & easy payment' : 'Trygg og enkel betaling')}
                  </span>
                </div>
              </div>
            </div>

            {/* QUICK META DETAILS */}
            <div className="flex flex-wrap gap-5 text-xs text-stone-500 font-mono uppercase">
              {book.isbn && (
                <div className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-stone-400" /> ISBN: {book.isbn}
                </div>
              )}
              {book.pageCount && (
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-stone-400" /> {book.pageCount} {currentLang === 'en' ? 'pages' : 'sider'}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-stone-400" />{' '}
                {hasBothEditions
                  ? (currentLang === 'en' ? 'Norwegian & English editions' : 'Norsk og engelsk utgåve')
                  : currentLang === 'en'
                    ? 'English edition'
                    : 'Norsk språk'}
              </div>
            </div>

          </motion.div>
        </div>
      </section>

      {/* FEATURED QUOTE / REVIEWS SECTION */}
      {hasLangInfo && showReviewsSection && quotes.length > 0 && (
        <section className="bg-white border-y border-stone-200/70 py-16 px-6 md:px-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-[11px] font-sans uppercase tracking-[0.25em] text-brand-accent font-semibold block mb-2">
                {currentLang === 'en' ? 'Reviews & Reader Voices' : 'Omtaler & Lesarstemmer'}
              </span>
              <h2 className="text-2xl md:text-3xl font-serif text-brand-dark">
                {currentLang === 'en' ? 'What Readers Are Saying' : 'Kva seier lesarane?'}
              </h2>
            </div>

            <div className={`grid ${quotes.length > 1 ? 'md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
              {quotes.map((q, idx) => (
                <div key={idx} className="bg-[#FDFCF7] border border-stone-200/80 p-8 rounded-sm relative flex flex-col justify-between">
                  <div className="text-3xl text-brand-accent/40 font-serif leading-none mb-3">“</div>
                  <p className="font-serif text-stone-800 text-lg leading-relaxed italic mb-6">
                    {q.quote}
                  </p>
                  <div className="pt-4 border-t border-stone-200/50 flex items-center justify-between">
                    <span className="font-sans font-semibold text-xs text-brand-dark uppercase tracking-wider">
                      {q.author || (currentLang === 'en' ? 'Reader' : 'Lesar')}
                    </span>
                    {q.source && (
                      <span className="text-[11px] text-stone-500 italic">
                        {q.source}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ADMIN NOTICE WHEN REVIEWS ARE EXPLICITLY HIDDEN */}
      {isAdmin && !showReviewsSection && (
        <div className="bg-stone-100 border-y border-stone-200 py-3.5 px-6 text-center text-xs text-stone-600 font-sans">
          <span className="font-semibold text-stone-900">Merk (synleg berre for admin):</span> Omtaler og «Kva seier lesarane?» er for tida slått <strong>av</strong> for denne boka. Du kan slå det på att i kontrollpanelet under «Bøker & Salg».
        </div>
      )}

      {/* STORY & BOOK DETAILS (TEKST LENGER NED) */}
      <section className="py-20 px-6 md:px-12 max-w-4xl mx-auto">
        
        {/* OM BOKA OR LANGUAGE UNAVAILABLE INFO BOX */}
        {hasLangInfo ? (
          <>
            <div className="mb-16">
              <div className="text-center mb-10">
                <span className="text-[11px] font-sans uppercase tracking-[0.25em] text-brand-accent font-semibold block mb-2">
                  {currentLang === 'en' ? 'Story & Themes' : 'Handling & Tematikk'}
                </span>
                <h2 className="text-3xl md:text-4xl font-serif text-brand-dark">
                  {currentLang === 'en' ? 'About the Book' : 'Om boka'}
                </h2>
                <div className="w-12 h-px bg-brand-accent mx-auto mt-4" />
              </div>

              <div className="bg-white border border-stone-200/80 p-8 md:p-12 shadow-sm rounded-sm">
                <div className="prose prose-lg brand-prose max-w-none font-serif text-stone-800 leading-relaxed whitespace-pre-wrap">
                  {displayDescription}
                </div>

                {/* HIGHLIGHT BULLET POINTS */}
                {(() => {
                  const rawHighlights = currentLang === 'en'
                    ? (book.promoHighlightsEn && book.promoHighlightsEn.length > 0
                        ? book.promoHighlightsEn
                        : [
                            'High-quality edition with carefully crafted design',
                            isAmazon ? 'Worldwide delivery from Amazon' : 'Shipped directly to your mailbox with free delivery'
                          ])
                    : (book.promoHighlights && book.promoHighlights.length > 0
                        ? book.promoHighlights
                        : [
                            'Innbunden kvalitetsbok med vakkert omslag',
                            isAmazon ? 'Levering frå Amazon' : 'Sendast rett til di postkasse utan ekstra fraktkostnad'
                          ]);
                  const filteredHighlights = rawHighlights.filter(hl => 
                    !isAmazon || (!hl.toLowerCase().includes('signert') && !hl.toLowerCase().includes('signering') && !hl.toLowerCase().includes('signed'))
                  );

                  if (filteredHighlights.length === 0) return null;

                  return (
                    <div className="mt-10 pt-8 border-t border-stone-100">
                      <h3 className="text-sm font-sans uppercase tracking-widest font-semibold text-brand-dark mb-4">
                        {currentLang === 'en' ? 'What to expect:' : 'Kva du kan forvente:'}
                      </h3>
                      <ul className="grid sm:grid-cols-2 gap-3.5">
                        {filteredHighlights.map((hl, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-stone-700">
                            <Check className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                            <span>{hl}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* UTDRAG / SMÅBIT FRÅ BOKA */}
            {displayExcerpt && (
              <div className="mb-16">
                <div className="bg-stone-50 border border-stone-200/90 rounded-sm p-8 md:p-12">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-200">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-brand-accent" />
                      <h3 className="text-xs uppercase tracking-widest font-semibold text-brand-dark">
                        {currentLang === 'en' ? 'Book Excerpt' : 'Utdrag frå boka'}
                      </h3>
                    </div>
                    <button
                      onClick={() => setReadExcerptOpen(!readExcerptOpen)}
                      className="text-xs font-semibold text-brand-accent hover:text-brand-dark uppercase tracking-wider flex items-center gap-1"
                    >
                      {readExcerptOpen
                        ? (currentLang === 'en' ? 'Hide excerpt' : 'Skjul utdrag')
                        : (currentLang === 'en' ? 'Read excerpt' : 'Les utdrag')}
                      <ChevronDown className={`w-3.5 h-3.5 transform transition-transform ${readExcerptOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  <div className={`font-serif text-stone-800 leading-relaxed italic text-base md:text-lg whitespace-pre-wrap transition-all ${readExcerptOpen ? '' : 'line-clamp-4'}`}>
                    {displayExcerpt}
                  </div>

                  {!readExcerptOpen && (
                    <button
                      onClick={() => setReadExcerptOpen(true)}
                      className="mt-4 text-xs font-semibold text-brand-dark hover:text-brand-accent underline underline-offset-4 uppercase tracking-wider"
                    >
                      {currentLang === 'en' ? 'Click to read full excerpt →' : 'Klikk for å lese heile utdraget →'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="mb-16 bg-amber-50/90 border border-amber-200 rounded-sm p-8 md:p-10 text-center shadow-sm">
            <Globe className="w-10 h-10 text-amber-700 mx-auto mb-3" />
            <h2 className="text-2xl font-serif text-brand-dark mb-2">
              {currentLang === 'en'
                ? 'Not all information is available in English'
                : 'Ikkje all informasjon er tilgjengeleg på norsk'}
            </h2>
            <p className="text-sm text-stone-700 max-w-lg mx-auto mb-6 leading-relaxed">
              {currentLang === 'en'
                ? 'Detailed descriptions and excerpts for this book have not been added in English yet. Switch the website language to Norwegian to read all information about this book.'
                : 'Utdjupande omtale og utdrag for denne boka er ikkje lagt inn på norsk enno. Byt nettsidespråk til engelsk for å lese all informasjon om boka.'}
            </p>
            <button
              type="button"
              onClick={() => setLanguage(currentLang === 'en' ? 'no' : 'en')}
              className="px-6 py-3 bg-brand-dark hover:bg-black text-white text-xs font-semibold tracking-widest uppercase rounded-sm transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Globe className="w-4 h-4 text-amber-400" />
              <span>{currentLang === 'en' ? 'Switch to Norwegian (Norsk)' : 'Byt til engelsk (English)'}</span>
            </button>
          </div>
        )}

        {/* OM FORFATTAREN (HENTA FRÅ OM MEG) */}
        <div className="bg-white border border-stone-200/80 p-8 md:p-12 rounded-sm mb-16 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-stone-100 border-2 border-stone-200 shrink-0">
              <img 
                src={aboutData?.imageUrl || '/oivind-h-solheim.png'} 
                alt="Øivind H. Solheim" 
                className="w-full h-full object-cover grayscale contrast-125 hover:grayscale-0 hover:contrast-100 transition-all duration-500"
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-sans uppercase tracking-widest text-brand-accent font-semibold block mb-1">
                {currentLang === 'en' ? 'The Author' : 'Forfattaren'}
              </span>
              <h3 className="text-2xl font-serif text-brand-dark mb-3">Øivind H. Solheim</h3>
              
              {/* BIO CONTENT DIRECT FROM SETTINGS/ABOUT */}
              <div className="font-serif text-stone-700 leading-relaxed text-sm md:text-base mb-4 space-y-3">
                {currentLang === 'en' ? (
                  aboutData?.shortBioEn ? (
                    <p>{aboutData.shortBioEn}</p>
                  ) : aboutData?.bioEn ? (
                    <div className="markdown-body line-clamp-5">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {aboutData.bioEn}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p>
                      Øivind H. Solheim is an author, writer, and photographer. Through novels, short stories, and personal reflections, he explores human relationships, the passage of time, and the intersection between tradition and modern society.
                    </p>
                  )
                ) : (
                  aboutData?.shortBioNo ? (
                    <p>{aboutData.shortBioNo}</p>
                  ) : aboutData?.bioNo ? (
                    <div className="markdown-body line-clamp-5">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {aboutData.bioNo}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p>
                      Øivind H. Solheim er forfattar, skribent og fotograf. Gjennom romanar, noveller og personlege refleksjonar utforskar han menneskelege relasjonar, tidas gang og møtet mellom tradisjon og det moderne samfunnet.
                    </p>
                  )
                )}
              </div>

              <Link 
                to="/om-meg"
                className="text-xs font-semibold text-brand-dark hover:text-brand-accent tracking-widest uppercase inline-flex items-center gap-1 group"
              >
                <span>{currentLang === 'en' ? 'Read more on the "About" page' : 'Les meir på «Om meg»-sida'}</span>
                <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>

        {/* AVSLUTTANDE KJØP-SEKSJON (CLOSING BOTTOM CTA) */}
        <div className="bg-brand-dark text-white p-8 md:p-14 rounded-sm shadow-xl text-center relative overflow-hidden">
          <div className="max-w-2xl mx-auto relative z-10">
            <span className="text-xs uppercase tracking-[0.25em] text-brand-accent font-semibold block mb-3">
              {isAmazon
                ? (currentLang === 'en' ? 'Available on Amazon' : 'Tilgjengeleg på Amazon')
                : (currentLang === 'en' ? 'Direct from the author' : 'Direkte frå forfattaren')}
            </span>
            <h2 className="text-3xl md:text-5xl font-serif mb-4 leading-tight">
              {currentLang === 'en'
                ? `Get your copy of ${displayTitle}`
                : `Sikre deg eit eksemplar av ${displayTitle}`}
            </h2>
            <p className="text-stone-300 font-serif text-base md:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
              {isAmazon
                ? (currentLang === 'en'
                    ? 'Order the book easily and securely on Amazon with delivery straight to your door.'
                    : 'Bestill boka enkelt og trygt på Amazon med levering rett heim til deg.')
                : (currentLang === 'en'
                    ? 'Optional signed copy with a personal note at no extra cost. Packed and shipped directly to your mailbox.'
                    : 'Moglegheit for signert utgåve med personleg helsing – heilt utan ekstra kostnad. Boka vert pakka og sendt rett heim i postkassa di.')}
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4">
              {buyUrl ? (
                <a
                  href={buyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-10 py-4 bg-brand-accent hover:bg-amber-600 text-brand-dark hover:text-white font-sans text-sm font-semibold tracking-widest uppercase transition-all duration-200 shadow-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {isAmazon
                      ? (currentLang === 'en' ? 'Buy on Amazon' : 'Kjøp frå Amazon')
                      : (currentLang === 'en' ? `Buy the book (kr ${effectivePrice},-)` : `Kjøp boka (kr ${effectivePrice},-)`)}
                  </span>
                  <ExternalLink className="w-4 h-4 opacity-75" />
                </a>
              ) : (
                <span className="px-8 py-4 bg-stone-800 text-stone-400 font-sans text-xs uppercase tracking-wider">
                  {currentLang === 'en' ? 'Purchase link coming soon' : 'Kjøpslenkje kjem snart'}
                </span>
              )}

              {hasBothEditions && secondaryBuyUrl && secondaryLang && (
                <a
                  href={secondaryBuyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-7 py-4 bg-white/10 hover:bg-white/20 border border-white/35 text-white font-sans text-xs font-semibold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Globe className="w-4 h-4 text-amber-400" />
                  <span>{getSecondaryEditionButtonLabel(secondaryLang, secondaryBuyUrl, currentLang)}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-75" />
                </a>
              )}

              <Link
                to="/boker"
                className="w-full sm:w-auto px-8 py-4 border border-white/30 hover:border-white text-white font-sans text-xs font-semibold tracking-widest uppercase transition-colors"
              >
                {currentLang === 'en' ? 'See other books' : 'Sjå andre bøker'}
              </Link>
            </div>

            <p className="text-stone-400 text-xs mt-6">
              {shippingText} •{' '}
              {isAmazon
                ? (currentLang === 'en' ? 'Secure checkout on Amazon' : 'Kjøp trygt frå Amazon')
                : isStripe
                  ? (currentLang === 'en' ? 'Secure payment with Stripe' : 'Trygg betaling med Stripe')
                  : (currentLang === 'en' ? 'Secure payment' : 'Trygg betaling')}{' '}
              • {isAmazon ? (currentLang === 'en' ? 'Delivery from Amazon' : 'Levering frå Amazon') : (currentLang === 'en' ? 'Fast dispatch' : 'Rask utsending')}
            </p>
          </div>
        </div>

      </section>

      {/* STICKY MOBILE / TABLET PURCHASE BAR */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-2xl p-3 md:px-8 z-50 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              {book.coverImageUrl && (
                <img
                  src={book.coverImageUrl}
                  alt={displayTitle}
                  className="w-9 h-12 object-cover rounded-sm border border-stone-200 shrink-0 hidden sm:block"
                />
              )}
              <div className="min-w-0">
                <h4 className="font-serif font-bold text-sm text-brand-dark truncate">
                  {displayTitle}
                </h4>
                <p className="text-[11px] text-stone-500 truncate">
                  kr {effectivePrice},- • {isAmazon ? (currentLang === 'en' ? 'Delivery from Amazon' : 'Levering frå Amazon') : (currentLang === 'en' ? 'Free shipping' : 'Fri frakt')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {hasBothEditions && secondaryBuyUrl && secondaryLang && (
                <a
                  href={secondaryBuyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:inline-flex px-4 py-3 border border-stone-300 hover:border-brand-dark text-brand-dark text-xs font-semibold tracking-wider uppercase transition-colors items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5 text-brand-accent" />
                  <span>{getSecondaryEditionButtonLabel(secondaryLang, secondaryBuyUrl, currentLang)}</span>
                </a>
              )}
              {buyUrl ? (
                <a
                  href={buyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-brand-dark hover:bg-black text-white text-xs font-semibold tracking-widest uppercase transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{isAmazon ? (currentLang === 'en' ? 'Buy on Amazon' : 'Kjøp frå Amazon') : (currentLang === 'en' ? 'Buy now' : 'Kjøp no')}</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              ) : (
                <span className="px-4 py-2 text-xs text-stone-500 bg-stone-100 rounded">
                  {currentLang === 'en' ? 'Buy' : 'Kjøp'}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
