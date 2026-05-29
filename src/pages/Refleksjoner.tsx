import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Plus, Edit } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { stripHtml, calculateReadingTime } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';

interface Article {
  id: string;
  title: string;
  content: string;
  published: boolean;
  language?: string;
  slug?: string;
  imageUrl?: string;
}

export default function Refleksjoner() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const isAdmin = user?.email === 'kianoshsolheim@gmail.com' || user?.email === 'oivindsolheim@gmail.com';

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const q = query(collection(db, 'articles'), where('published', '==', true), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const fetchedArticles = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
        // Filter out explicitly based on current language
        const filteredArticles = fetchedArticles.filter(a => {
          if (language === 'en') return a.language === 'en';
          return a.language !== 'en'; // default 'no' handles missing language field too
        });
        setArticles(filteredArticles);
      } catch (error) {
        console.error("Error fetching articles", error);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
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
          {t('REFLECTIONS')}
        </h1>
        <motion.div 
          className="w-16 h-px bg-brand-accent mx-auto mb-8"
          initial={{ width: 0 }}
          animate={{ width: 64 }}
          transition={{ duration: 1, delay: 0.5 }}
        ></motion.div>
        <p className="text-lg md:text-xl text-brand-dark/80 font-sans leading-relaxed">
          {language === 'en' ? 'Thoughts on life, technology, society, and our shared future.' : 'Tankar om livet, teknologien, samfunnet, og vår felles framtid.'}
        </p>
      </motion.section>

      <section className="px-6 md:px-12 lg:px-24 pb-32 max-w-[1200px] mx-auto">
        {loading ? (
          <div className="text-center text-brand-muted py-12">{language === 'en' ? 'Loading articles...' : 'Laster artikler...'}</div>
        ) : articles.length === 0 ? (
          <div className="text-center text-brand-muted py-12">{t('NO_ARTICLES')}</div>
        ) : (
          <motion.div 
            className="space-y-12"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {articles.map((article) => (
                <motion.article 
                  key={article.id} 
                  variants={itemVariants}
                  layout
                  className="bg-white border border-brand-sand flex flex-col md:flex-row items-stretch group relative overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 rounded-sm"
                >
                  {isAdmin && (
                    <button 
                      onClick={(e) => { e.preventDefault(); navigate(`/admin?edit=${article.id}`); }}
                      className="absolute bottom-4 left-4 p-2 bg-white/90 rounded-full shadow-sm text-brand-dark opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-gray-100 hover:scale-110"
                      title="Edit Article"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  {article.imageUrl && (
                    <div className="w-full md:w-2/5 h-64 md:h-auto overflow-hidden bg-brand-sand relative">
                      <img loading="lazy" src={article.imageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    </div>
                  )}
                  <div className={`p-8 md:p-12 flex flex-col justify-center ${article.imageUrl ? 'md:w-3/5' : 'w-full'}`}>
                    <div className="text-xs text-brand-muted uppercase tracking-widest font-semibold mb-3">
                      {calculateReadingTime(article.content)} min read
                    </div>
                    <h2 className="text-3xl font-serif text-brand-dark mb-4">{article.title}</h2>
                    <div className="text-brand-dark/80 font-serif leading-relaxed line-clamp-3 mb-8">
                      {stripHtml(article.content)}
                    </div>
                    <Link to={`/refleksjonar/${article.slug || article.id}`} className="inline-flex self-start text-xs font-semibold tracking-widest text-brand-accent hover:text-brand-dark uppercase border-b border-transparent hover:border-brand-dark transition-all">
                      {t('READ_MORE')} <motion.span className="ml-2 inline-block" whileHover={{ x: 5 }} transition={{  duration: 0.2 }}><ArrowRight className="w-3 h-3" /></motion.span>
                    </Link>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      <AnimatePresence>
        {isAdmin && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(`/admin?compose=true&lang=${language}`)}
            className="fixed bottom-8 right-8 w-14 h-14 bg-brand-dark text-white rounded-full shadow-lg flex items-center justify-center hover:bg-black transition-colors z-50 group"
            title={t('NEW_ARTICLE')}
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
