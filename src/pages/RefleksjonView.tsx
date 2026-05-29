import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MessageSquarePlus } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { isHtml, calculateReadingTime } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import Comments from '../components/Comments';

interface Article {
  id: string;
  title: string;
  content: string;
  published: boolean;
  language?: string;
  slug?: string;
  imageUrl?: string;
  imageCaption?: string;
  translationId?: string;
}

export default function RefleksjonView() {
  const { slug } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [translationSlug, setTranslationSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { t, language, setLanguage } = useLanguage();
  
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeQuote, setActiveQuote] = useState('');
  
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !contentRef.current?.contains(selection.anchorNode)) {
        if (!activeQuote) {
          setSelectionPosition(null);
          setSelectedText('');
        }
        return;
      }
      
      const text = selection.toString().trim();
      if (text.length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setSelectedText(text);
        setSelectionPosition({
          top: rect.top + window.scrollY - 40,
          left: rect.left + rect.width / 2
        });
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [activeQuote]);

  const handleQuoteClick = () => {
    setActiveQuote(selectedText);
    setSelectionPosition(null);
    window.getSelection()?.removeAllRanges();
    
    // Scroll to comments
    setTimeout(() => {
      document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };


  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;
      try {
        let fetchedArticle: Article | null = null;
        const qSlug = query(collection(db, 'articles'), where('slug', '==', slug), where('published', '==', true));
        const snapSlug = await getDocs(qSlug);
        
        if (!snapSlug.empty) {
          fetchedArticle = { id: snapSlug.docs[0].id, ...snapSlug.docs[0].data() } as Article;
        } else {
          // Fallback to searching by ID
          const qId = query(collection(db, 'articles'), where(documentId(), '==', slug), where('published', '==', true));
          const snapId = await getDocs(qId);
          if (!snapId.empty) {
            fetchedArticle = { id: snapId.docs[0].id, ...snapId.docs[0].data() } as Article;
          }
        }
        
        setArticle(fetchedArticle);
        
        if (fetchedArticle?.translationId) {
          const qTrans = query(collection(db, 'articles'), where(documentId(), '==', fetchedArticle.translationId));
          const snapTrans = await getDocs(qTrans);
          if (!snapTrans.empty) {
            const transData = snapTrans.docs[0].data() as Article;
            if (transData.published) {
              setTranslationSlug(transData.slug || snapTrans.docs[0].id);
            }
          }
        } else {
          setTranslationSlug(null);
        }
      } catch (error) {
        console.error("Error fetching article", error);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [slug]);

  if (loading) {
    return (
      <div className="bg-brand-surface min-h-screen py-32 text-center text-brand-muted flex items-center justify-center">
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          {language === 'en' ? 'Loading reflection...' : 'Laster inn refleksjonen...'}
        </motion.div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="bg-brand-surface min-h-screen py-32 text-center">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-serif text-brand-dark mb-4">{language === 'en' ? 'Reflection not found' : 'Fann ikkje refleksjonen'}</motion.h1>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Link to="/refleksjonar" className="text-brand-accent hover:text-brand-dark transition-colors uppercase tracking-widest text-xs font-semibold">
            {language === 'en' ? 'BACK TO REFLECTIONS' : 'TILBAKE TIL REFLEKSJONAR'}
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-brand-surface min-h-screen">
      <motion.section 
        className="py-20 md:py-32 px-6 md:px-12 max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <Link to="/refleksjonar" className="inline-flex items-center text-brand-muted hover:text-brand-dark transition-colors font-sans text-xs font-semibold tracking-widest uppercase mb-12">
          <ArrowLeft className="mr-2 w-4 h-4" /> {t('ALL_REFLECTIONS')}
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <span className="text-xs text-brand-muted uppercase tracking-widest font-semibold flex items-center gap-4">
            {calculateReadingTime(article.content)} min read
            {article.language && (
              <span className="bg-brand-sand px-2 py-0.5 text-[10px] text-brand-dark/70 rounded-sm">
                {article.language === 'en' ? 'ENGLISH' : 'NORSK'}
              </span>
            )}
          </span>
          
          {translationSlug && (
            <Link 
              to={`/refleksjonar/${translationSlug}`}
              onClick={() => setLanguage((article.language || 'no') === 'en' ? 'no' : 'en')}
              className="inline-flex items-center text-brand-accent hover:text-brand-dark text-xs font-semibold tracking-widest uppercase transition-colors"
            >
              {article.language === 'en' ? 'Les på norsk' : 'Read in English'} &rarr;
            </Link>
          )}
        </div>
        <motion.h1 
          className="text-4xl md:text-5xl lg:text-6xl font-serif text-brand-dark leading-tight mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {article.title}
        </motion.h1>
        
        {article.imageUrl && (
          <motion.figure 
            className="mb-12"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="w-full h-[40vh] min-h-[300px] overflow-hidden bg-brand-sand">
              <img loading="lazy" src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
            </div>
            {article.imageCaption && (
              <figcaption 
                className="text-center text-sm text-brand-muted mt-3 italic"
                dangerouslySetInnerHTML={{ __html: article.imageCaption }}
              />
            )}
          </motion.figure>
        )}
        
        <motion.div 
          className="bg-white p-8 md:p-12 lg:p-16 border border-brand-sand shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          ref={contentRef}
        >
          {isHtml(article.content) ? (
            <div 
              className="prose prose-brand max-w-none text-brand-dark/90 font-serif leading-relaxed text-lg"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          ) : (
            <div className="prose prose-brand max-w-none text-brand-dark/90 font-serif leading-relaxed text-lg whitespace-pre-wrap">
              {article.content}
            </div>
          )}
        </motion.div>
        
        <AnimatePresence>
          {selectionPosition && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ 
                position: 'absolute', 
                top: selectionPosition.top, 
                left: selectionPosition.left,
                transform: 'translateX(-50%)',
                zIndex: 50
              }}
              className="bg-brand-dark text-white rounded shadow-lg flex items-center shadow-2xl"
            >
              <button 
                onClick={handleQuoteClick}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-widest hover:bg-black transition-colors rounded"
              >
                <MessageSquarePlus className="w-4 h-4" />
                {language === 'en' ? 'Comment' : 'Kommenter'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div id="comments-section">
          <Comments articleId={article.id} initialQuote={activeQuote} />
        </div>
      </motion.section>
    </div>
  );
}
