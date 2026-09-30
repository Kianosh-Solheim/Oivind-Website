import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { getCachedDocs } from '../lib/dbCache';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock, Plus, LogIn, LogOut, ShieldAlert, Edit3 } from 'lucide-react';
import { isHtml } from '../lib/utils';

interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  published?: boolean;
  language: string;
  createdAt: any;
  imageUrl?: string;
  imageCaption?: string;
}

export default function Dagbok() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { language, t } = useLanguage();
  const { user, loading: authLoading, isAdmin, signInWithGoogle, logout } = useAuth();

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const fetchDiary = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'diary'), orderBy('createdAt', 'desc'));
        const snap = await getCachedDocs(q, "diary_all");
        const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaryEntry));
        
        const filtered = fetched.filter(a => {
          if (language === 'en') return a.language === 'en' || a.language === 'both';
          return a.language === 'no' || a.language === 'both' || !a.language;
        });
        
        setEntries(filtered);
      } catch (error) {
        console.error("Error fetching diary", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDiary();
  }, [language, isAdmin]);

  if (authLoading) {
    return (
      <div className="bg-brand-surface min-h-screen flex items-center justify-center">
        <p className="text-xs text-brand-muted tracking-widest uppercase animate-pulse">
          {language === 'en' ? 'Checking access...' : 'Sjekkar tilgang...'}
        </p>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="bg-brand-surface min-h-screen flex items-center justify-center px-6 py-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white border border-gray-100 p-8 md:p-12 max-w-md w-full text-center shadow-sm"
        >
          <div className="w-14 h-14 bg-brand-surface rounded-full flex items-center justify-center mx-auto mb-6 text-brand-dark border border-gray-100">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl md:text-3xl font-serif text-brand-dark mb-3">
            {language === 'en' ? 'Private Diary' : 'Privat dagbok'}
          </h1>
          <div className="w-12 h-px bg-brand-accent mx-auto mb-6"></div>
          <p className="text-sm text-brand-dark/70 font-sans leading-relaxed mb-8">
            {language === 'en' 
              ? 'This section is private and only available to the administrator. Sign in to view.'
              : 'Denne seksjonen er privat og berre tilgjengeleg for administrator. Logg inn for å få tilgang.'}
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={signInWithGoogle} 
              className="inline-flex items-center justify-center px-6 py-3.5 bg-brand-dark text-white text-xs font-semibold tracking-widest uppercase hover:bg-black transition-colors"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Log in with Google' : 'Logg inn med Google'}
            </button>
            <Link 
              to="/" 
              className="inline-flex items-center justify-center px-6 py-3 text-xs font-semibold tracking-widest text-brand-muted hover:text-brand-dark uppercase transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('BACK_TO_HOME')}
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Signed in, but not an admin
  if (!isAdmin) {
    return (
      <div className="bg-brand-surface min-h-screen flex items-center justify-center px-6 py-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white border border-red-100 p-8 md:p-12 max-w-md w-full text-center shadow-sm"
        >
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-2xl md:text-3xl font-serif text-brand-dark mb-3">
            {language === 'en' ? 'Restricted Access' : 'Avgrensa tilgang'}
          </h1>
          <p className="text-sm text-brand-dark/70 font-sans leading-relaxed mb-3">
            {language === 'en' 
              ? 'You are signed in, but this account does not have administrator privileges.'
              : 'Du er innlogga, men denne kontoen har ikkje administratorrettigheiter.'}
          </p>
          <p className="text-xs text-brand-muted font-mono bg-gray-50 py-1.5 px-3 rounded mb-8 break-all">
            {user.email}
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={logout} 
              className="inline-flex items-center justify-center px-6 py-3.5 bg-brand-dark text-white text-xs font-semibold tracking-widest uppercase hover:bg-black transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Log out / Switch account' : 'Logg ut / Byt konto'}
            </button>
            <Link 
              to="/" 
              className="inline-flex items-center justify-center px-6 py-3 text-xs font-semibold tracking-widest text-brand-muted hover:text-brand-dark uppercase transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('BACK_TO_HOME')}
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
  };

  return (
    <div className="bg-brand-surface min-h-screen overflow-hidden">
      <motion.section 
        className="py-16 md:py-24 px-6 md:px-12 text-center max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between mb-12">
          <Link to="/" className="inline-flex items-center text-brand-muted hover:text-brand-dark transition-colors font-sans text-xs font-semibold tracking-widest uppercase">
            <ArrowLeft className="mr-2 w-4 h-4" /> {t('BACK_TO_HOME')}
          </Link>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-dark/5 border border-brand-dark/15 text-brand-dark text-[10px] font-semibold tracking-widest uppercase rounded-full">
              <Lock className="w-3 h-3 text-brand-accent" />
              {language === 'en' ? 'Admin only' : 'Kun for admin'}
            </span>
            <Link 
              to="/admin?compose_diary=true" 
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-dark text-white text-xs font-semibold tracking-widest uppercase hover:bg-black transition-colors rounded-sm shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              {language === 'en' ? 'New entry' : 'Nytt oppslag'}
            </Link>
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-serif text-brand-dark leading-tight mb-6">
          {language === 'en' ? 'Diary' : 'Dagbok'}
        </h1>
        <motion.div 
          className="w-16 h-px bg-brand-accent mx-auto mb-8"
          initial={{ width: 0 }}
          animate={{ width: 64 }}
          transition={{ duration: 1, delay: 0.5 }}
        ></motion.div>
        <p className="text-lg md:text-xl text-brand-dark/80 font-sans leading-relaxed">
          {language === 'en' ? 'A private space for personal notes and reflections.' : 'Ein privat plass for personlege notat og refleksjonar.'}
        </p>
      </motion.section>

      <section className="px-6 md:px-12 lg:px-24 pb-32 max-w-[800px] mx-auto">
        {loading ? (
          <div className="text-center text-brand-muted py-12">{language === 'en' ? 'Loading diary...' : 'Laster dagbok...'}</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-100 p-8">
            <p className="text-brand-muted mb-6">{language === 'en' ? 'No diary entries yet.' : 'Ingen dagbokoppslag enno.'}</p>
            <Link 
              to="/admin?compose_diary=true"
              className="inline-flex items-center px-4 py-2 bg-brand-dark text-white text-xs font-semibold tracking-widest uppercase hover:bg-black transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Write first entry' : 'Skriv fyrste oppslag'}
            </Link>
          </div>
        ) : (
          <motion.div 
            className="space-y-16"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {entries.map((entry) => (
                <motion.article 
                  key={entry.id} 
                  variants={itemVariants} 
                  className="bg-white p-8 md:p-12 border border-gray-100 shadow-sm relative group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
                    <div className="flex items-center gap-3">
                      {entry.createdAt && (
                        <span className="text-xs uppercase tracking-widest text-brand-muted font-semibold">
                          {entry.createdAt.toDate ? new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'no-NO', { year: 'numeric', month: 'long', day: 'numeric' }).format(entry.createdAt.toDate()) : ''}
                        </span>
                      )}
                      {entry.published === false && (
                        <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 bg-yellow-50 text-yellow-800 border border-yellow-200 font-semibold">
                          {language === 'en' ? 'Draft' : 'Utkast'}
                        </span>
                      )}
                    </div>
                    <Link 
                      to={`/admin?edit_diary=${entry.id}`}
                      className="inline-flex items-center text-brand-muted hover:text-brand-dark text-xs font-semibold tracking-widest uppercase transition-colors self-start md:self-auto"
                      title={language === 'en' ? 'Edit in admin' : 'Rediger i kontrollpanel'}
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1" />
                      {language === 'en' ? 'Edit' : 'Rediger'}
                    </Link>
                  </div>

                  {entry.title && (
                    <h2 className="text-2xl md:text-3xl font-serif text-brand-dark leading-snug mb-6">
                      {entry.title}
                    </h2>
                  )}
                  
                  {entry.imageUrl && (
                    <div className="w-full mb-8 bg-gray-50 flex items-center justify-center p-4 border border-gray-100">
                      <img src={entry.imageUrl} className="w-full h-auto max-h-[500px] object-contain rounded-sm" />
                    </div>
                  )}
                  {entry.imageCaption && (
                    <p className="text-sm text-center text-brand-muted mb-8 italic" dangerouslySetInnerHTML={{ __html: entry.imageCaption }} />
                  )}

                  {isHtml(entry.content) ? (
                    <div 
                      className="prose prose-brand max-w-none text-brand-dark/90 font-serif leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: entry.content }}
                    />
                  ) : (
                    <div className="prose prose-brand max-w-none text-brand-dark/90 font-serif leading-relaxed whitespace-pre-wrap">
                      {entry.content}
                    </div>
                  )}
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </div>
  );
}