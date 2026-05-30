import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { isHtml } from '../lib/utils';

interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  language: string;
  createdAt: any;
}

export default function Dagbok() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { language, t } = useLanguage();

  useEffect(() => {
    const fetchDiary = async () => {
      try {
        const q = query(collection(db, 'diary'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
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
  }, [language]);

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
        className="py-20 md:py-32 px-6 md:px-12 text-center max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <Link to="/" className="inline-flex items-center text-brand-muted hover:text-brand-dark transition-colors font-sans text-xs font-semibold tracking-widest uppercase mb-12">
          <ArrowLeft className="mr-2 w-4 h-4" /> {t('BACK_TO_HOME')}
        </Link>
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
          {language === 'en' ? 'A place for daily thoughts and reflections.' : 'Ein plass for daglege tankar og refleksjonar.'}
        </p>
      </motion.section>

      <section className="px-6 md:px-12 lg:px-24 pb-32 max-w-[800px] mx-auto">
        {loading ? (
          <div className="text-center text-brand-muted py-12">{language === 'en' ? 'Loading diary...' : 'Laster dagbok...'}</div>
        ) : entries.length === 0 ? (
          <div className="text-center text-brand-muted py-12">{language === 'en' ? 'No entries found.' : 'Ingen oppslag funne.'}</div>
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
                  className="bg-white p-8 md:p-12 border border-gray-100 shadow-sm"
                >
                  <div className="flex flex-col gap-4 mb-6">
                    {entry.createdAt && (
                      <span className="text-xs uppercase tracking-widest text-brand-muted font-semibold">
                        {entry.createdAt.toDate ? new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'no-NO', { year: 'numeric', month: 'long', day: 'numeric' }).format(entry.createdAt.toDate()) : ''}
                      </span>
                    )}
                    {entry.title && (
                      <h2 className="text-2xl md:text-3xl font-serif text-brand-dark leading-snug">
                        {entry.title}
                      </h2>
                    )}
                  </div>
                  
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