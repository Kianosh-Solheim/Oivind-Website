import { useState, useEffect } from 'react';
import { ArrowRight, BookOpen, ShoppingBag, CreditCard, Sparkles, ExternalLink, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { collection, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCachedDocs } from '../lib/dbCache';
import { Book } from '../types';
import { slugify, getBuyLinkType } from '../lib/utils';
import heroImg from '../assets/bilde_framside.jpeg';
import { useLanguage } from '../context/LanguageContext';

export default function Home() {
  const { t, language } = useLanguage();
  const [heroBook, setHeroBook] = useState<Book | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchHeroBook = async () => {
      try {
        const q = query(collection(db, 'books'));
        const snap = await getCachedDocs(q, 'books_all');
        const booksList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
        const focused = booksList.find(b => b.isHeroFocus === true);
        if (isMounted) {
          setHeroBook(focused || null);
        }
      } catch (err) {
        console.error('Error loading hero focus book:', err);
      }
    };

    fetchHeroBook();
    return () => { isMounted = false; };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" as const } },
  };

  // Helper values for dynamic book hero if active
  const rawBuyLink = heroBook 
    ? ((language === 'en' && heroBook.buyLinkEn) ? heroBook.buyLinkEn : (heroBook.buyLink || ''))
    : '';
  const buyLinkType = getBuyLinkType(rawBuyLink);
  const isAmazon = buyLinkType === 'amazon';

  const bookTitle = heroBook 
    ? ((language === 'en' && heroBook.titleEn) ? heroBook.titleEn : heroBook.title) 
    : '';
  const bookDescription = heroBook 
    ? ((language === 'en' && heroBook.descriptionEn) ? heroBook.descriptionEn : heroBook.description) 
    : '';
  const displayPrice = heroBook ? (heroBook.promoSpecialPrice || heroBook.price || 0) : 0;

  const readMoreUrl = heroBook 
    ? (heroBook.promoSlug ? `/salg/${heroBook.promoSlug}` : (heroBook.title ? `/salg/${slugify(heroBook.title)}` : `/boker`))
    : '/boker';

  let shippingText = heroBook?.promoShippingText || '';
  if (isAmazon) {
    if (!shippingText || shippingText.toLowerCase().includes('post') || shippingText.toLowerCase().includes('rask levering fra amazon')) {
      shippingText = language === 'en' ? 'In stock • Delivery from Amazon' : 'På lager • Levering frå Amazon';
    } else {
      shippingText = shippingText.replace(/rask levering fra amazon/gi, 'levering frå Amazon')
                                 .replace(/rask levering frå amazon/gi, 'levering frå Amazon')
                                 .replace(/på lager for rask sending/gi, 'på lager');
    }
  } else if (!shippingText && heroBook) {
    shippingText = language === 'en' ? 'Fast delivery • Signed copy available' : 'På lager for rask sending • Signert utgåve';
  }

  return (
    <>
      {/* HERO SECTION: DYNAMIC BOOK FOCUS OR STANDARD HERO */}
      {heroBook ? (
        <section className="relative min-h-[80vh] w-full bg-[#141210] text-white flex items-center justify-center px-6 md:px-12 lg:px-24 py-16 md:py-24 overflow-hidden">
          {/* Ambient background glow matching book */}
          {heroBook.coverImageUrl && (
            <div 
              className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl pointer-events-none -z-0 bg-amber-500/40"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-transparent pointer-events-none" />

          <div className="relative z-10 max-w-[1500px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            {/* Left: Book Information & Direct Call To Actions */}
            <motion.div 
              className="lg:col-span-7 space-y-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Badge */}
              <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-semibold tracking-widest uppercase rounded-full">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  {heroBook.promoBadge || (isAmazon ? (language === 'en' ? 'Available on Amazon' : 'Kjøp på Amazon') : (language === 'en' ? 'Featured Book' : 'Bok i hovudfokus'))}
                </span>

                {shippingText && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-stone-300 font-sans">
                    <Truck className="w-3.5 h-3.5 text-amber-400" />
                    <span>{shippingText}</span>
                  </span>
                )}
              </motion.div>

              {/* Title */}
              <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl md:text-6xl font-serif leading-[1.1] text-white">
                {bookTitle}
              </motion.h1>

              {/* Promo headline */}
              {heroBook.promoHeadline && (
                <motion.p variants={itemVariants} className="text-xl sm:text-2xl font-serif italic text-amber-200/95 leading-snug">
                  «{heroBook.promoHeadline}»
                </motion.p>
              )}

              {/* Description */}
              <motion.p variants={itemVariants} className="text-base md:text-lg text-stone-300 font-sans leading-relaxed line-clamp-4 max-w-2xl">
                {bookDescription}
              </motion.p>

              {/* Price */}
              {displayPrice > 0 && (
                <motion.div variants={itemVariants} className="flex items-baseline gap-3 pt-2">
                  <span className="text-3xl font-serif font-bold text-white">
                    kr {displayPrice},-
                  </span>
                  {heroBook.promoSpecialPrice && heroBook.price && heroBook.promoSpecialPrice < heroBook.price && (
                    <span className="text-base text-stone-500 line-through font-sans">
                      kr {heroBook.price},-
                    </span>
                  )}
                </motion.div>
              )}

              {/* Action Buttons: BUY NOW (Direct Stripe/Amazon) & READ MORE */}
              <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 pt-4">
                {rawBuyLink ? (
                  <a
                    href={rawBuyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-amber-600 hover:bg-amber-500 text-white font-sans text-xs tracking-[0.15em] uppercase py-4 px-8 inline-flex items-center justify-center gap-2.5 transition-all duration-300 shadow-xl hover:shadow-amber-900/40 font-semibold cursor-pointer"
                  >
                    {isAmazon ? (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>{language === 'en' ? 'BUY ON AMAZON' : 'KJØP PÅ AMAZON'}</span>
                      </>
                    ) : buyLinkType === 'stripe' ? (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>{language === 'en' ? 'BUY NOW' : 'KJØP BOKA NO'}</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        <span>{language === 'en' ? 'ORDER BOOK' : 'KJØP BOKA'}</span>
                      </>
                    )}
                  </a>
                ) : (
                  <Link
                    to={readMoreUrl}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-sans text-xs tracking-[0.15em] uppercase py-4 px-8 inline-flex items-center justify-center gap-2.5 transition-all duration-300 shadow-xl font-semibold"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{language === 'en' ? 'ORDER BOOK' : 'BESTILL BOKA'}</span>
                  </Link>
                )}

                <Link
                  to={readMoreUrl}
                  className="border border-white/80 hover:bg-white hover:text-brand-dark transition-all duration-300 text-white font-sans text-xs tracking-[0.15em] uppercase py-4 px-8 inline-flex items-center justify-center gap-2 font-semibold"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{language === 'en' ? 'READ MORE' : 'LES MEIR'}</span>
                </Link>
              </motion.div>
            </motion.div>

            {/* Right: Book Cover 3D Display */}
            <motion.div 
              className="lg:col-span-5 flex flex-col items-center justify-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
            >
              <Link to={readMoreUrl} className="group relative block max-w-[280px] sm:max-w-[340px] md:max-w-[380px] w-full transition-transform duration-500 hover:scale-[1.03]">
                {heroBook.coverImageUrl ? (
                  <div className="relative rounded shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border border-white/10 overflow-hidden bg-stone-900 aspect-[2/3]">
                    <img 
                      src={heroBook.coverImageUrl} 
                      alt={bookTitle}
                      className="w-full h-full object-cover"
                    />
                    {/* Spine gradient effect */}
                    <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/50 via-transparent to-transparent pointer-events-none" />
                  </div>
                ) : (
                  <div className="w-full aspect-[2/3] bg-stone-900 rounded border border-white/10 flex flex-col items-center justify-center p-8 text-center shadow-2xl">
                    <BookOpen className="w-12 h-12 text-stone-500 mb-4" />
                    <span className="font-serif text-xl text-white">{bookTitle}</span>
                  </div>
                )}
              </Link>

              {heroBook.promoQuotes && heroBook.promoQuotes.length > 0 && heroBook.promoQuotes[0]?.quote && (
                <div className="mt-6 text-center max-w-sm px-4">
                  <p className="text-xs sm:text-sm font-serif italic text-stone-300">
                    «{heroBook.promoQuotes[0].quote}»
                  </p>
                  {heroBook.promoQuotes[0].author && (
                    <p className="text-[11px] font-sans tracking-wider uppercase text-amber-400/90 mt-1">
                      — {heroBook.promoQuotes[0].author}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </section>
      ) : (
        /* STANDARD HERO SECTION */
        <section className="relative h-[80vh] min-h-[600px] w-full bg-brand-dark flex flex-col justify-center px-6 md:px-12 lg:px-24 object-cover overflow-hidden">
          <div className="absolute inset-0 z-0">
            <motion.img 
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.7 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              src={heroImg}
              alt="Lake mirroring sky" 
              className="w-full h-full object-cover object-center"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"></div>
          </div>
          
          <motion.div 
            className="relative z-10 max-w-2xl text-white"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl lg:text-6xl font-serif leading-tight">
              {language === 'en' ? (
                <>I don't write about the future.<br />I write about people living while the future is made.</>
              ) : (
                <>Eg skriv ikkje om framtida.<br />Eg skriv om menneske som lever medan framtida blir til.</>
              )}
            </motion.h2>
            <motion.div variants={itemVariants} className="mt-12">
              <Link to="/refleksjonar" className="border border-white hover:bg-white hover:text-brand-dark transition-all duration-300 text-white font-sans text-xs tracking-[0.15em] uppercase py-4 px-8 inline-block">
                {language === 'en' ? 'READ MY LATEST REFLECTIONS' : 'LES DEI SISTE REFLEKSJONANE MINE'}
              </Link>
            </motion.div>
          </motion.div>
        </section>
      )}

      <section className="py-24 px-6 md:px-12 lg:px-24 mx-auto max-w-[1600px] grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center overflow-hidden">
        <motion.div 
          className="max-w-xl"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <span className="text-xs font-sans tracking-[0.3em] font-semibold text-brand-muted uppercase">{language === 'en' ? 'Welcome' : 'Velkommen'}</span>
          <h2 className="text-4xl md:text-5xl mt-6 font-serif text-brand-dark leading-tight">
            {language === 'en' ? 'I write to understand.' : 'Eg skriv for å forstå.'}
          </h2>
          <div className="w-16 h-px bg-brand-accent mt-8 mb-8"></div>
          <p className="text-base md:text-lg text-brand-dark/80 leading-relaxed font-sans mb-10">
            {language === 'en' ? 
              'To put into words what worries me, inspires me, and what needs to be said out loud. My texts spring from nature, from people, from the times we live in – and from the hope that we can create a better tomorrow.' : 
              'For å setja ord på det som uroar meg, inspirerer meg, og det som må seiast høgt. Tekstane mine spring ut frå naturen, frå menneske, frå tida vi lever i – og frå håpet om at vi kan skapa ein betre morgondag.'
            }
          </p>
          <Link to="/om-meg" className="inline-flex items-center text-brand-accent hover:text-brand-dark transition-colors font-sans text-xs font-semibold tracking-widest uppercase">
            {t('READ_MORE')} <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </motion.div>
        <motion.div 
          className="w-full relative group"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >
          <div className="absolute inset-0 border border-brand-accent/20 translate-x-4 translate-y-4 -z-10 transition-transform duration-500 group-hover:translate-x-6 group-hover:translate-y-6"></div>
          <img 
            src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop" 
            alt="Person sitting on a rock overlooking mountains" 
            className="w-full aspect-[4/3] lg:aspect-[16/10] object-cover"
          />
        </motion.div>
      </section>

      <section className="py-24 px-6 md:px-12 text-center bg-brand-sand flex flex-col items-center justify-center relative overflow-hidden">
        <motion.div 
          className="max-w-4xl mx-auto relative"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.span 
            initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
            whileInView={{ scale: 1, opacity: 0.5, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            className="text-8xl text-brand-accent/30 font-serif leading-none absolute -top-12 -left-12 hidden md:block"
          >
            “
          </motion.span>
          <p className="text-2xl md:text-3xl lg:text-4xl font-serif italic text-brand-dark leading-snug">
            {language === 'en' ? 
              'Technology can amplify us, humanity can save us.' : 
              'Teknologien kan forsterka oss, menneskelegheit kan redda oss.'
            }
          </p>
          <p className="text-3xl md:text-5xl font-signature text-brand-dark mt-8 text-right flex justify-end items-center gap-4">
            Øivind H. Solheim
          </p>
        </motion.div>
      </section>

      <section className="pt-24 pb-32 px-6 md:px-12 lg:px-16 mx-auto bg-brand-light font-sans">
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6 max-w-[1800px] mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="bg-brand-surface group cursor-pointer flex flex-col h-full border border-gray-100 hover:shadow-xl transition-shadow duration-500 rounded-sm overflow-hidden">
            <div className="h-56 xl:h-48 w-full overflow-hidden">
              <img loading="lazy" src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80" alt="Bøker" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
            </div>
            <div className="p-8 flex flex-col flex-grow">
              <h3 className="text-sm tracking-widest font-semibold text-brand-dark mb-4">{t('BOOKS')}</h3>
              <p className="text-sm text-brand-dark/70 leading-relaxed mb-10 flex-grow">
                {t('HOME_SUBTITLE')}
              </p>
              <Link to="/boker" className="inline-flex items-center text-brand-accent text-xs font-semibold tracking-widest uppercase mt-auto hover:text-brand-dark transition-colors">
                {t('SEE_BOOKS')} <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants} className="bg-brand-surface group cursor-pointer flex flex-col h-full border border-gray-100 hover:shadow-xl transition-shadow duration-500 rounded-sm overflow-hidden">
            <div className="h-56 xl:h-48 w-full overflow-hidden">
              <img loading="lazy" src="https://images.unsplash.com/photo-1455390582262-044cdead27d8?w=800&q=80" alt="Refleksjoner" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
            </div>
            <div className="p-8 flex flex-col flex-grow">
              <h3 className="text-sm tracking-widest font-semibold text-brand-dark mb-4">{t('REFLECTIONS')}</h3>
              <p className="text-sm text-brand-dark/70 leading-relaxed mb-10 flex-grow">
                {language === 'en' ? 'Thoughts on AI, democracy, aging, truth, and humanity.' : 'Tankar om KI, demokrati, aldring, sanning og det menneskelege.'}
              </p>
              <Link to="/refleksjonar" className="inline-flex items-center text-brand-accent text-xs font-semibold tracking-widest uppercase mt-auto hover:text-brand-dark transition-colors">
                {language === 'en' ? 'READ REFLECTIONS' : 'LES REFLEKSJONAR'} <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-brand-surface group cursor-pointer flex flex-col h-full border border-gray-100 hover:shadow-xl transition-shadow duration-500 rounded-sm overflow-hidden">
            <div className="h-56 xl:h-48 w-full overflow-hidden">
              <img loading="lazy" src="https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&q=80" alt="Musikk" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
            </div>
            <div className="p-8 flex flex-col flex-grow">
              <h3 className="text-sm tracking-widest font-semibold text-brand-dark mb-4">{t('MUSIC')}</h3>
              <p className="text-sm text-brand-dark/70 leading-relaxed mb-10 flex-grow">
                {language === 'en' ? 'Songs, lyrics, and tones springing from life and time.' : 'Songar, tekster og tonar som spring ut frå livet og tida.'}
              </p>
              <Link to="/musikk" className="inline-flex items-center text-brand-accent text-xs font-semibold tracking-widest uppercase mt-auto hover:text-brand-dark transition-colors">
                {language === 'en' ? 'LISTEN TO MUSIC' : 'LYTT TIL MUSIKKEN'} <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-brand-surface group cursor-pointer flex flex-col h-full border border-gray-100 hover:shadow-xl transition-shadow duration-500 rounded-sm overflow-hidden">
            <div className="h-56 xl:h-48 w-full overflow-hidden">
              <img loading="lazy" src="https://images.unsplash.com/photo-1439853949703-ff2200f56f34?w=800&q=80" alt="Foto & Natur" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
            </div>
            <div className="p-8 flex flex-col flex-grow">
              <h3 className="text-sm tracking-widest font-semibold text-brand-dark mb-4">{t('PHOTO')} & NATUR</h3>
              <p className="text-sm text-brand-dark/70 leading-relaxed mb-10 flex-grow">
                {language === 'en' ? 'Pictures from hikes, quiet moments, and nature.' : 'Bilete frå turar, stille augneblink og møte med naturen.'}
              </p>
              <Link to="/foto" className="inline-flex items-center text-brand-accent text-xs font-semibold tracking-widest uppercase mt-auto hover:text-brand-dark transition-colors">
                {language === 'en' ? 'SEE PHOTOS' : 'SJÅ BILETA'} <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-brand-surface group cursor-pointer flex flex-col h-full border border-gray-100 hover:shadow-xl transition-shadow duration-500 rounded-sm overflow-hidden">
            <div className="h-56 xl:h-48 w-full overflow-hidden">
              <img loading="lazy" src="https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=800&q=80" alt="Video" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out grayscale opacity-90" />
            </div>
            <div className="p-8 flex flex-col flex-grow">
              <h3 className="text-sm tracking-widest font-semibold text-brand-dark mb-4">{t('VIDEO')} & {language === 'en' ? 'READINGS' : 'OPPLESING'}</h3>
              <p className="text-sm text-brand-dark/70 leading-relaxed mb-10 flex-grow">
                {language === 'en' ? 'Thoughts from screen to voice. Readings, videos, and posts.' : 'Tankar frå skjerm til stemme. Opplesingar, videoar og innlegg.'}
              </p>
              <Link to="/video" className="inline-flex items-center text-brand-accent text-xs font-semibold tracking-widest uppercase mt-auto hover:text-brand-dark transition-colors">
                {language === 'en' ? 'WATCH VIDEOS' : 'SJÅ VIDEOAR'} <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </section>
    </>
  );
}
