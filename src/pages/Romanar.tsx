import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  BookOpen, 
  ShoppingBag, 
  CreditCard, 
  Sparkles, 
  ExternalLink, 
  Star, 
  Truck, 
  Check, 
  Search, 
  ShieldCheck, 
  PenTool, 
  ArrowRight, 
  Plus, 
  SlidersHorizontal,
  Package,
  HeartHandshake,
  Globe,
  AlertCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { getCachedDocs } from '../lib/dbCache';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  slugify,
  getBuyLinkType,
  resolveBookBuyLinks,
  getSecondaryEditionButtonLabel,
  isBookAvailableInLanguage,
  hasBookLanguageInfo
} from '../lib/utils';
import { Book } from '../types';

export default function Romanar() {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const currentLang: 'no' | 'en' = language === 'en' ? 'en' : 'no';

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | 'direct' | 'amazon'>('all');
  const [langFilter, setLangFilter] = useState<'all' | 'no' | 'en'>('all');
  const [sortBy, setSortBy] = useState<'year-desc' | 'year-asc' | 'title' | 'price-asc' | 'price-desc'>('year-desc');

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const q = query(collection(db, 'books'), orderBy('publishedYear', 'desc'));
        const snap = await getCachedDocs(q, "books_all");
        setBooks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book)));
      } catch (error) {
        console.error("Error fetching books", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  // Spotlight book: ONLY if explicitly featured (isHeroFocus or promoActive) AND has a sales link in currentLang
  const spotlightBook = useMemo(() => {
    if (books.length === 0) return null;
    const heroFocus = books.find(b => b.isHeroFocus === true && isBookAvailableInLanguage(b, currentLang));
    if (heroFocus) return heroFocus;
    const activePromo = books.find(b => b.promoActive === true && isBookAvailableInLanguage(b, currentLang));
    return activePromo || null;
  }, [books, currentLang]);

  // Filtered & Sorted books
  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const noLink = (b.buyLink || '').trim();
      const enLink = (b.buyLinkEn || '').trim();

      // Language filter
      if (langFilter === 'no' && b.language === 'en' && !noLink) return false;
      if (langFilter === 'en' && b.language === 'no' && !enLink) return false;

      // Platform / Format filter
      const hasAmazon = getBuyLinkType(noLink) === 'amazon' || getBuyLinkType(enLink) === 'amazon';
      const hasDirect = (noLink && getBuyLinkType(noLink) !== 'amazon') || (enLink && getBuyLinkType(enLink) !== 'amazon');
      if (formatFilter === 'amazon' && !hasAmazon) return false;
      if (formatFilter === 'direct' && !hasDirect) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const titleMatch = (b.title || '').toLowerCase().includes(q) || (b.titleEn || '').toLowerCase().includes(q);
        const descMatch = (b.description || '').toLowerCase().includes(q) || (b.descriptionEn || '').toLowerCase().includes(q);
        const isbnMatch = (b.isbn || '').toLowerCase().includes(q);
        const yearMatch = String(b.publishedYear).includes(q);
        if (!titleMatch && !descMatch && !isbnMatch && !yearMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'year-desc') return (b.publishedYear || 0) - (a.publishedYear || 0);
      if (sortBy === 'year-asc') return (a.publishedYear || 0) - (b.publishedYear || 0);
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      const priceA = a.promoSpecialPrice || a.price || 0;
      const priceB = b.promoSpecialPrice || b.price || 0;
      if (sortBy === 'price-asc') return priceA - priceB;
      if (sortBy === 'price-desc') return priceB - priceA;
      return 0;
    });
  }, [books, langFilter, formatFilter, searchTerm, sortBy]);

  return (
    <div className="bg-[#FAF8F5] text-brand-dark min-h-screen selection:bg-brand-accent/20 font-sans pb-32">
      
      {/* STOREFRONT TOP BANNER */}
      <section className="border-b border-stone-200/70 bg-white pt-16 pb-12 px-6 md:px-12 lg:px-24">
        <div className="max-w-[1400px] mx-auto">
          
          <div className="flex items-center justify-between gap-4 mb-8">
            <Link 
              to="/" 
              className="inline-flex items-center text-stone-500 hover:text-brand-dark transition-colors text-xs font-semibold tracking-widest uppercase"
            >
              <ArrowLeft className="mr-2 w-4 h-4" /> {t('HOME')}
            </Link>

            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-full">
              <Sparkles className="w-3 h-3 text-amber-600" />
              {language === 'en' ? 'Official Bookstore' : 'Forlag & Nettbokhandel'}
            </span>
          </div>

          <div className="max-w-3xl">
            <div className="text-xs font-semibold tracking-[0.25em] uppercase text-brand-accent mb-3">
              {language === 'en' ? 'ØIVIND H. SOLHEIM • FICTION PUBLISHING' : 'ØIVIND H. SOLHEIM • FIKSJONSFORLAGET'}
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-brand-dark leading-[1.15] mb-6">
              {language === 'en' ? 'Books & Publications' : 'Bøker & Utgjevingar'}
            </h1>
            <div className="w-16 h-0.5 bg-brand-accent mb-6" />
            <p className="text-base sm:text-lg text-stone-600 font-sans leading-relaxed">
              {language === 'en'
                ? 'Order signed copies directly from the author with free delivery, or buy worldwide editions through Amazon.'
                : 'Bestill signerte romanar direkte frå forfattaren med fri frakt, eller kjøp verdsomspennande utgåver via Amazon.'}
            </p>
          </div>

          {/* 4 PUBLISHER TRUST PILLARS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-12 pt-8 border-t border-stone-100 text-xs">
            <div className="flex items-start gap-3 p-3.5 bg-stone-50/80 border border-stone-100 rounded-sm">
              <Truck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-stone-900 block mb-0.5">
                  {language === 'en' ? 'Free Shipping' : 'Rask & fri frakt'}
                </span>
                <span className="text-stone-500 leading-snug block">
                  {language === 'en' ? 'Direct to your mailbox' : 'Rett heim i postkassa'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-stone-50/80 border border-stone-100 rounded-sm">
              <PenTool className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-stone-900 block mb-0.5">
                  {language === 'en' ? 'Signed Editions' : 'Signert av forfattaren'}
                </span>
                <span className="text-stone-500 leading-snug block">
                  {language === 'en' ? 'Personal note included' : 'Personleg helsing mogleg'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-stone-50/80 border border-stone-100 rounded-sm">
              <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-stone-900 block mb-0.5">
                  {language === 'en' ? 'Secure Checkout' : 'Trygg handel'}
                </span>
                <span className="text-stone-500 leading-snug block">
                  {language === 'en' ? 'Via Stripe & Amazon' : 'Med Stripe eller Amazon'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-stone-50/80 border border-stone-100 rounded-sm">
              <BookOpen className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-stone-900 block mb-0.5">
                  {language === 'en' ? 'Hardcover Quality' : 'Kvalitetsinnbinding'}
                </span>
                <span className="text-stone-500 leading-snug block">
                  {language === 'en' ? 'High-grade paper' : 'Kvalitetspapir og design'}
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* FEATURED SPOTLIGHT CARD (UTVALD UTGJEVING) */}
      {spotlightBook && (
        <section className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 pt-12 pb-6">
          <div className="text-[11px] font-mono uppercase tracking-widest text-amber-900 font-semibold mb-3 flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span>{language === 'en' ? 'FEATURED PUBLICATION' : 'UTVALD UTGJEVING I BUTIKKEN'}</span>
          </div>

          {(() => {
            const buyLinks = resolveBookBuyLinks(spotlightBook, currentLang);
            const rawLink = buyLinks.primaryLink;
            const isSpotlightAmazon = buyLinks.primaryIsAmazon;
            const hasSpotlightLangInfo = hasBookLanguageInfo(spotlightBook, currentLang);
            const spotlightTitle = (currentLang === 'en' && spotlightBook.titleEn) ? spotlightBook.titleEn : spotlightBook.title;
            const spotlightDesc = currentLang === 'en'
              ? (spotlightBook.descriptionEn || spotlightBook.promoDescriptionEn || (spotlightBook.language === 'en' ? (spotlightBook.promoDescription || spotlightBook.description) : ''))
              : (spotlightBook.promoDescription || spotlightBook.description || '');
            const spotlightHeadline = currentLang === 'en'
              ? (spotlightBook.promoHeadlineEn || (spotlightBook.language === 'en' ? spotlightBook.promoHeadline : ''))
              : (spotlightBook.promoHeadline || '');
            const spotlightBadge = currentLang === 'en'
              ? (spotlightBook.promoBadgeEn || (isSpotlightAmazon ? 'Available on Amazon' : 'Featured Release'))
              : (spotlightBook.promoBadge || (isSpotlightAmazon ? 'Tilgjengeleg på Amazon' : 'Hovudutgjeving'));
            const spotlightPrice = spotlightBook.promoSpecialPrice || spotlightBook.price || 0;
            const spotlightSlug = spotlightBook.promoSlug || slugify(spotlightBook.title);
            const detailUrl = spotlightBook.promoSlug ? `/salg/${spotlightSlug}` : `/boker/${spotlightBook.id}`;

            let spotlightShipping = currentLang === 'en' ? (spotlightBook.promoShippingTextEn || '') : (spotlightBook.promoShippingText || '');
            if (isSpotlightAmazon) {
              spotlightShipping = currentLang === 'en' ? (spotlightBook.promoShippingTextEn || 'In stock • Delivery from Amazon') : 'På lager • Levering frå Amazon';
            } else if (!spotlightShipping) {
              spotlightShipping = currentLang === 'en' ? 'In stock • Fast delivery with signed copy' : 'På lager for rask sending • Signert utgåve';
            }

            return (
              <div className="bg-white border border-stone-200/90 rounded-sm shadow-sm overflow-hidden p-6 sm:p-8 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                
                {/* 3D BOOK COVER DISPLAY */}
                <div className="lg:col-span-4 flex justify-center">
                  <Link to={detailUrl} className="group relative block max-w-[240px] sm:max-w-[280px] w-full transition-transform duration-300 hover:scale-[1.03]">
                    {spotlightBook.coverImageUrl ? (
                      <div className="relative rounded-sm shadow-[0_18px_40px_-10px_rgba(0,0,0,0.35)] border border-stone-200 overflow-hidden bg-stone-50 aspect-[2/3]">
                        <img 
                          src={spotlightBook.coverImageUrl} 
                          alt={spotlightTitle}
                          className="w-full h-full object-cover"
                        />
                        {/* Book spine line overlay */}
                        <div className="absolute inset-y-0 left-0 w-3.5 bg-gradient-to-r from-black/25 via-transparent to-transparent pointer-events-none" />
                      </div>
                    ) : (
                      <div className="w-full aspect-[2/3] bg-stone-100 rounded border border-stone-200 flex flex-col items-center justify-center p-6 text-center shadow-md">
                        <BookOpen className="w-12 h-12 text-stone-400 mb-3" />
                        <span className="font-serif text-lg text-brand-dark">{spotlightTitle}</span>
                      </div>
                    )}
                  </Link>
                </div>

                {/* SPOTLIGHT CONTENT */}
                <div className="lg:col-span-8 flex flex-col items-start">
                  <div className="flex flex-wrap items-center gap-2.5 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-300/80 text-amber-900 rounded-full text-xs font-semibold tracking-wider uppercase">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      {spotlightBadge}
                    </span>
                    <span className="text-xs text-stone-500 font-mono">
                      {spotlightBook.publishedYear} • {spotlightBook.pageCount ? `${spotlightBook.pageCount} ${currentLang === 'en' ? 'pages' : 'sider'}` : (currentLang === 'en' ? 'Hardcover' : 'Innbunden')}
                    </span>
                  </div>

                  <Link to={detailUrl}>
                    <h2 className="text-3xl sm:text-4xl font-serif text-brand-dark hover:text-brand-accent transition-colors mb-2 leading-tight">
                      {spotlightTitle}
                    </h2>
                  </Link>

                  <p className="text-xs font-sans uppercase tracking-widest font-semibold text-brand-accent mb-3">
                    {currentLang === 'en' ? 'by Øivind H. Solheim' : 'av Øivind H. Solheim'}
                  </p>

                  {hasSpotlightLangInfo ? (
                    <>
                      {spotlightHeadline && (
                        <p className="text-base sm:text-lg font-serif italic text-stone-700 leading-snug mb-4 border-l-2 border-amber-600 pl-3.5">
                          «{spotlightHeadline}»
                        </p>
                      )}

                      {spotlightDesc && (
                        <p className="text-sm sm:text-base text-stone-600 leading-relaxed line-clamp-3 mb-6 max-w-2xl font-sans">
                          {spotlightDesc}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="w-full max-w-2xl bg-amber-50/70 border border-amber-200/90 rounded-sm p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5 text-xs sm:text-sm text-stone-700">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <span>
                          {currentLang === 'en'
                            ? 'Not all information about this book is available in the language the website is currently set to (English).'
                            : 'Ikkje all informasjon om denne boka er tilgjengeleg på språket nettsida er på no (norsk).'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLanguage(currentLang === 'en' ? 'no' : 'en')}
                        className="px-3.5 py-2 bg-brand-dark hover:bg-black text-white text-[11px] font-semibold uppercase tracking-wider rounded-sm transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5 text-amber-400" />
                        <span>{currentLang === 'en' ? 'Switch to Norwegian' : 'Byt til engelsk'}</span>
                      </button>
                    </div>
                  )}

                  {/* PRICE & DELIVERY */}
                  <div className="flex flex-wrap items-baseline gap-4 mb-6 pb-6 border-b border-stone-100 w-full">
                    {spotlightPrice > 0 && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-serif font-bold text-brand-dark">
                          kr {spotlightPrice},-
                        </span>
                        {spotlightBook.promoSpecialPrice && spotlightBook.price && spotlightBook.promoSpecialPrice < spotlightBook.price && (
                          <span className="text-sm text-stone-400 line-through font-mono">
                            kr {spotlightBook.price},-
                          </span>
                        )}
                      </div>
                    )}

                    <div className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50/80 border border-emerald-200/60 px-3 py-1 rounded">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{spotlightShipping}</span>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex flex-wrap items-center gap-3">
                    {rawLink ? (
                      <a
                        href={rawLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-6 py-3.5 text-white text-xs font-semibold tracking-widest uppercase transition-colors inline-flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer ${
                          isSpotlightAmazon
                            ? 'bg-amber-600 hover:bg-amber-500'
                            : 'bg-brand-dark hover:bg-black'
                        }`}
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>{isSpotlightAmazon ? (currentLang === 'en' ? 'Buy on Amazon' : 'Kjøp på Amazon') : (currentLang === 'en' ? 'Buy Book Now' : 'Kjøp boka no')}</span>
                        <ExternalLink className="w-3 h-3 opacity-75" />
                      </a>
                    ) : null}

                    {buyLinks.hasBothEditions && buyLinks.secondaryLink && buyLinks.secondaryLang && (
                      <a
                        href={buyLinks.secondaryLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-3.5 bg-stone-50 hover:bg-amber-50/80 border border-stone-300 hover:border-amber-500 text-brand-dark text-xs font-semibold tracking-wider uppercase transition-colors inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Globe className="w-4 h-4 text-brand-accent" />
                        <span>{getSecondaryEditionButtonLabel(buyLinks.secondaryLang, buyLinks.secondaryLink, currentLang)}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    )}

                    <Link
                      to={detailUrl}
                      className="px-6 py-3.5 border border-stone-300 hover:border-brand-dark text-brand-dark hover:bg-stone-50 text-xs font-semibold tracking-widest uppercase transition-colors inline-flex items-center gap-2"
                    >
                      <BookOpen className="w-4 h-4 text-brand-accent" />
                      <span>{currentLang === 'en' ? 'Read Details & Blurb' : 'Les meir & omtale'}</span>
                    </Link>
                  </div>
                </div>

              </div>
            );
          })()}
        </section>
      )}

      {/* FILTER & SEARCH STOREFRONT BAR */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 pt-10 pb-6">
        <div className="bg-white border border-stone-200/80 rounded-sm p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* SEARCH INPUT */}
          <div className="relative flex-grow max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder={language === 'en' ? 'Search books by title, year, ISBN...' : 'Søk etter tittel, år, ISBN...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs border border-stone-200 rounded-sm focus:border-brand-dark focus:ring-1 focus:ring-brand-dark outline-none bg-stone-50/50"
            />
          </div>

          {/* FILTER PILLS */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => setFormatFilter('all')}
              className={`px-3 py-1.5 rounded-sm transition-colors uppercase tracking-wider font-semibold text-[11px] ${
                formatFilter === 'all' 
                  ? 'bg-brand-dark text-white' 
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {language === 'en' ? 'All' : 'Alle'} ({books.length})
            </button>

            <button
              onClick={() => setFormatFilter('direct')}
              className={`px-3 py-1.5 rounded-sm transition-colors uppercase tracking-wider font-semibold text-[11px] flex items-center gap-1 ${
                formatFilter === 'direct' 
                  ? 'bg-brand-dark text-white' 
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <CreditCard className="w-3 h-3" />
              {language === 'en' ? 'Direct (Stripe)' : 'Direkte (Stripe)'}
            </button>

            <button
              onClick={() => setFormatFilter('amazon')}
              className={`px-3 py-1.5 rounded-sm transition-colors uppercase tracking-wider font-semibold text-[11px] flex items-center gap-1 ${
                formatFilter === 'amazon' 
                  ? 'bg-brand-dark text-white' 
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <ShoppingBag className="w-3 h-3" />
              Amazon
            </button>
          </div>

          {/* SORT SELECTOR */}
          <div className="flex items-center gap-2 text-xs shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="py-1.5 px-2.5 text-xs border border-stone-200 rounded-sm bg-white text-stone-700 outline-none focus:border-brand-dark cursor-pointer"
            >
              <option value="year-desc">{language === 'en' ? 'Newest first' : 'Nyaste først'}</option>
              <option value="year-asc">{language === 'en' ? 'Oldest first' : 'Eldste først'}</option>
              <option value="title">{language === 'en' ? 'Title (A–Z)' : 'Tittel (A–Å)'}</option>
              <option value="price-asc">{language === 'en' ? 'Price (low to high)' : 'Pris (låg–høg)'}</option>
              <option value="price-desc">{language === 'en' ? 'Price (high to low)' : 'Pris (høg–låg)'}</option>
            </select>
          </div>

        </div>
      </section>

      {/* PRODUCT CATALOG GRID */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 py-6">
        
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-flex items-center gap-2 text-stone-400 uppercase tracking-widest text-xs font-semibold animate-pulse">
              <BookOpen className="w-5 h-5 animate-spin" />
              <span>{language === 'en' ? 'Loading bookstore...' : 'Laster forlagskatalogen...'}</span>
            </div>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="py-20 text-center bg-white border border-stone-200 rounded-sm p-8">
            <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" strokeWidth={1} />
            <h3 className="text-xl font-serif text-brand-dark mb-2">
              {language === 'en' ? 'No books found' : 'Ingen bøker funne'}
            </h3>
            <p className="text-stone-500 text-xs max-w-sm mx-auto mb-6">
              {language === 'en' 
                ? 'Try changing your search or filter settings.' 
                : 'Prøv å endre søkeord eller filtre for å sjå fleire bøker.'}
            </p>
            <button
              onClick={() => { setSearchTerm(''); setFormatFilter('all'); setLangFilter('all'); }}
              className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold tracking-wider uppercase transition-colors"
            >
              {language === 'en' ? 'Reset filters' : 'Nullstill filtre'}
            </button>
          </div>
        ) : (
          <>
            {/* TOP INFO BANNER WHEN SOME OR ALL BOOKS LACK LANGUAGE-SPECIFIC INFORMATION */}
            {filteredBooks.some(b => !hasBookLanguageInfo(b, currentLang)) && (
              <div className="mb-8 bg-amber-50/90 border border-amber-200 rounded-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-stone-900 mb-0.5">
                      {currentLang === 'en'
                        ? 'Not all book information is available in English'
                        : 'Ikkje all bokinformasjon er tilgjengeleg på norsk'}
                    </h4>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {currentLang === 'en'
                        ? 'Some books on this page do not yet have information added in the language the website is currently set to. You can switch language to read full descriptions in Norwegian.'
                        : 'Enkelte bøker på denne sida har ikkje informasjon lagt inn på språket nettsida er på no. Du kan byte språk for å lese omtalen på engelsk.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLanguage(currentLang === 'en' ? 'no' : 'en')}
                  className="px-4 py-2.5 bg-brand-dark hover:bg-black text-white text-xs font-semibold tracking-wider uppercase rounded-sm transition-colors inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>{currentLang === 'en' ? 'Switch to Norwegian (Norsk)' : 'Byt til engelsk (English)'}</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredBooks.map((book) => {
                const buyLinks = resolveBookBuyLinks(book, currentLang);
                const rawLink = buyLinks.hasLinkForCurrentLang ? buyLinks.primaryLink : '';
                const isAmazonBook = getBuyLinkType(rawLink || buyLinks.primaryLink) === 'amazon';
                const hasLangInfo = hasBookLanguageInfo(book, currentLang);

                const displayTitle = (currentLang === 'en' && book.titleEn) ? book.titleEn : book.title;
                const displayDesc = currentLang === 'en'
                  ? (book.descriptionEn || book.promoDescriptionEn || (book.language === 'en' ? book.description : ''))
                  : (book.description || book.promoDescription || '');
                const displayHeadline = currentLang === 'en'
                  ? (book.promoHeadlineEn || (book.language === 'en' ? book.promoHeadline : ''))
                  : (book.promoHeadline || '');
                const displayBadge = currentLang === 'en'
                  ? book.promoBadgeEn
                  : book.promoBadge;

                const effectivePrice = book.promoSpecialPrice || book.price || 0;
                const slug = book.promoSlug || slugify(book.title);
                const salesUrl = book.promoSlug ? `/salg/${slug}` : `/boker/${book.id}`;

                // Shipping text logic respecting Amazon preferences & language
                let shippingLabel = currentLang === 'en' ? (book.promoShippingTextEn || '') : (book.promoShippingText || '');
                if (isAmazonBook) {
                  shippingLabel = currentLang === 'en'
                    ? (book.promoShippingTextEn || 'Delivery from Amazon • In stock')
                    : 'Levering frå Amazon • På lager';
                } else if (!shippingLabel) {
                  shippingLabel = currentLang === 'en'
                    ? 'Fast delivery • Signed copy available'
                    : 'På lager for rask sending • Signert utgåve';
                }

                return (
                  <article 
                    key={book.id} 
                    className="bg-white border border-stone-200/90 rounded-sm shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                  >
                    {/* TOP COVER CONTAINER WITH PEDESTAL */}
                    <div className="relative bg-[#F3EFEA]/70 p-8 flex items-center justify-center border-b border-stone-100 overflow-hidden h-[340px]">
                      
                      {/* BADGES */}
                      <div className="absolute top-3.5 left-3.5 z-10 flex flex-col gap-1.5 items-start">
                        {isAmazonBook && rawLink ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-stone-950 font-bold text-[10px] tracking-widest uppercase rounded shadow-sm">
                            <ShoppingBag className="w-3 h-3" /> Amazon
                          </span>
                        ) : displayBadge ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-dark text-white text-[10px] tracking-wider uppercase font-semibold rounded shadow-sm">
                            <Sparkles className="w-3 h-3 text-amber-300" /> {displayBadge}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 text-stone-700 text-[10px] tracking-wider uppercase font-semibold border border-stone-200 rounded">
                            {currentLang === 'en' ? 'Hardcover' : 'Innbunden'}
                          </span>
                        )}

                        {book.promoSpecialPrice && book.price && book.promoSpecialPrice < book.price && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold uppercase rounded shadow-sm">
                            {currentLang === 'en' ? 'Sale' : 'Tilbod'}
                          </span>
                        )}
                      </div>

                      {/* YEAR BADGE */}
                      <div className="absolute top-3.5 right-3.5 z-10">
                        <span className="text-[11px] font-mono text-stone-500 bg-white/80 px-2 py-0.5 rounded border border-stone-200/60">
                          {book.publishedYear}
                        </span>
                      </div>

                      {/* BOOK COVER WITH 3D SHADOW & SPINE */}
                      <Link to={salesUrl} className="relative block h-full aspect-[2/3] transition-transform duration-500 group-hover:scale-105">
                        {book.coverImageUrl ? (
                          <div className="w-full h-full rounded shadow-[0_12px_28px_-6px_rgba(0,0,0,0.3)] border border-stone-200 overflow-hidden bg-white">
                            <img 
                              src={book.coverImageUrl} 
                              alt={displayTitle}
                              className="w-full h-full object-cover"
                            />
                            {/* Book spine line shadow */}
                            <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/25 via-transparent to-transparent pointer-events-none" />
                          </div>
                        ) : (
                          <div className="w-full h-full rounded bg-stone-200 border border-stone-300 flex flex-col items-center justify-center p-6 text-center shadow-md">
                            <BookOpen className="w-10 h-10 text-stone-400 mb-2" strokeWidth={1} />
                            <span className="font-serif text-sm text-stone-700 leading-tight">{displayTitle}</span>
                          </div>
                        )}
                      </Link>
                    </div>

                    {/* BOOK DETAILS BODY */}
                    <div className="p-6 flex flex-col flex-grow">
                      
                      {/* FORMAT & METADATA */}
                      <div className="flex items-center gap-2 text-[11px] text-stone-500 uppercase tracking-wider mb-2 font-mono">
                        <span>
                          {isAmazonBook && rawLink
                            ? (currentLang === 'en' ? 'Amazon Edition' : 'Amazon-utgåve')
                            : (currentLang === 'en' ? 'Hardcover Book' : 'Innbunden bok')}
                        </span>
                        {book.pageCount ? (
                          <>
                            <span>•</span>
                            <span>{book.pageCount} {currentLang === 'en' ? 'pages' : 'sider'}</span>
                          </>
                        ) : null}
                      </div>

                      {/* TITLE */}
                      <Link to={salesUrl}>
                        <h3 className="text-xl sm:text-2xl font-serif text-brand-dark group-hover:text-brand-accent transition-colors mb-1.5 leading-tight">
                          {displayTitle}
                        </h3>
                      </Link>

                      <p className="text-[11px] font-sans uppercase tracking-widest font-semibold text-brand-accent mb-2">
                        {currentLang === 'en' ? 'by Øivind H. Solheim' : 'av Øivind H. Solheim'}
                      </p>

                      {hasLangInfo ? (
                        <>
                          {/* HEADLINE OR SHORT PROMO */}
                          {displayHeadline && (
                            <p className="text-xs font-serif italic text-stone-600 mb-3 line-clamp-1 border-l-2 border-stone-300 pl-2">
                              «{displayHeadline}»
                            </p>
                          )}

                          {/* DESCRIPTION BLURB */}
                          <p className="text-xs text-stone-600 leading-relaxed line-clamp-3 mb-6 font-sans">
                            {displayDesc}
                          </p>
                        </>
                      ) : (
                        <div className="bg-amber-50/70 border border-amber-200/80 rounded-sm p-3.5 mb-5 text-xs text-stone-700 flex flex-col gap-2.5">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                            <span className="leading-snug">
                              {currentLang === 'en'
                                ? 'Not all information for this book is available in the current website language (English).'
                                : 'Ikkje all informasjon om denne boka er tilgjengeleg på språket nettsida er på no (norsk).'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setLanguage(currentLang === 'en' ? 'no' : 'en')}
                            className="self-start px-3 py-1.5 bg-white hover:bg-stone-100 border border-amber-300 text-stone-900 font-semibold text-[10px] uppercase tracking-wider rounded-sm transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Globe className="w-3 h-3 text-amber-700" />
                            <span>{currentLang === 'en' ? 'Switch to Norwegian' : 'Byt til engelsk'}</span>
                          </button>
                        </div>
                      )}

                      {/* FOOTER: STOCK & PRICE & BUTTONS */}
                      <div className="mt-auto pt-4 border-t border-stone-100 space-y-4">
                        
                        {/* STOCK & SHIPPING STATUS */}
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="inline-flex items-center gap-1.5 text-stone-600 font-sans">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{shippingLabel}</span>
                          </span>
                        </div>

                        {/* PRICE & BUTTONS ROW */}
                        <div className="flex items-center justify-between gap-3">
                          
                          {/* PRICE */}
                          <div>
                            {effectivePrice > 0 ? (
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl font-serif font-bold text-brand-dark">
                                  kr {effectivePrice},-
                                </span>
                                {book.promoSpecialPrice && book.price && book.promoSpecialPrice < book.price && (
                                  <span className="text-xs text-stone-400 line-through font-mono">
                                    kr {book.price},-
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-stone-400 italic">
                                {currentLang === 'en' ? 'Price on request' : 'Pris på førespurnad'}
                              </span>
                            )}
                          </div>

                          {/* CTA BUTTONS */}
                          <div className="flex items-center gap-2">
                            {rawLink ? (
                              <a
                                href={rawLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`px-3.5 py-2.5 text-[11px] font-semibold tracking-wider uppercase transition-colors inline-flex items-center gap-1.5 rounded-sm shadow-sm cursor-pointer ${
                                  isAmazonBook 
                                    ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                                    : 'bg-brand-dark hover:bg-black text-white'
                                }`}
                                title={isAmazonBook ? (currentLang === 'en' ? 'Buy from Amazon' : 'Kjøp frå Amazon') : (currentLang === 'en' ? 'Buy book (Stripe)' : 'Kjøp boka (Stripe)')}
                              >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                <span>{isAmazonBook ? 'Amazon' : (currentLang === 'en' ? 'Buy' : 'Kjøp')}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                              </a>
                            ) : null}

                            <Link
                              to={salesUrl}
                              className="px-3 py-2.5 border border-stone-300 hover:border-brand-dark text-brand-dark text-[11px] font-semibold tracking-wider uppercase transition-colors inline-flex items-center gap-1 rounded-sm"
                              title={currentLang === 'en' ? 'Read more about the book' : 'Les meir om boka'}
                            >
                              <span>{currentLang === 'en' ? 'Details' : 'Les meir'}</span>
                              <ArrowRight className="w-3 h-3 text-stone-500" />
                            </Link>
                          </div>

                        </div>

                      </div>

                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

      </section>

      {/* PUBLISHER INQUIRY / BULK ORDERS SECTION */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 mt-16">
        <div className="bg-stone-100 border border-stone-200/90 rounded-sm p-8 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900 mb-2">
              <HeartHandshake className="w-4 h-4 text-amber-700" />
              <span>{currentLang === 'en' ? 'Libraries & Book Clubs' : 'For bokhandlarar, bibliotek og lesesirklar'}</span>
            </div>
            <h3 className="text-2xl font-serif text-brand-dark mb-2">
              {currentLang === 'en' ? 'Interested in bulk orders or book events?' : 'Ønsker du fleire eksemplar eller forfattarbesøk?'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              {currentLang === 'en'
                ? 'We offer bulk discounts for book clubs, schools, and organizations. Contact the author directly for inquiries or events.'
                : 'For lesesirklar, bibliotek og større bestillingar tilbyr vi særskilte rabattar. Ta gjerne kontakt med forfattaren direkte for førespurnader om foredrag eller bokbad.'}
            </p>
          </div>

          <Link
            to="/om-meg"
            className="px-6 py-3.5 bg-brand-dark hover:bg-black text-white text-xs font-semibold tracking-widest uppercase transition-colors inline-flex items-center gap-2 shrink-0"
          >
            <span>{currentLang === 'en' ? 'Contact Author' : 'Ta kontakt her'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* FLOATING ADMIN BUTTON FOR LOGGED IN ADMIN */}
      <AnimatePresence>
        {user && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/admin?tab=books&new=true')}
            className="fixed bottom-8 right-8 w-14 h-14 bg-brand-dark text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-black transition-colors z-50 group border border-white/20"
            title={currentLang === 'en' ? 'Add new book to store' : 'Ny bok i nettbutikken'}
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
}
