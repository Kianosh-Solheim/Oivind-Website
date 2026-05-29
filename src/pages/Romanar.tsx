import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, ShoppingBag, FileText, Hash, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';

interface Book {
  id: string;
  title: string;
  description: string;
  publishedYear: number;
  coverImageUrl?: string;
  isbn?: string;
  buyLink?: string;
  pageCount?: number;
  language?: 'no' | 'en' | 'both';
  titleEn?: string;
  descriptionEn?: string;
  buyLinkEn?: string;
}

export default function Romanar() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const q = query(collection(db, 'books'), orderBy('publishedYear', 'desc'));
        const snap = await getDocs(q);
        setBooks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book)));
      } catch (error) {
        console.error("Error fetching books", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  return (
    <div className="bg-brand-surface min-h-screen">
      <section className="py-20 md:py-32 px-6 md:px-12 text-center max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center text-brand-muted hover:text-brand-dark transition-colors font-sans text-xs font-semibold tracking-widest uppercase mb-12">
          <ArrowLeft className="mr-2 w-4 h-4" /> {t('HOME')}
        </Link>
        <h1 className="text-5xl md:text-6xl font-serif text-brand-dark leading-tight mb-6">
          {t('BOOKS')}
        </h1>
        <div className="w-16 h-px bg-brand-accent mx-auto mb-8"></div>
        <p className="text-lg md:text-xl text-brand-dark/80 font-sans leading-relaxed">
          {language === 'en' ? 'Books about people, choices, and the future.' : 'Bøker om menneske, val og framtid.'}
        </p>
      </section>

      <section className="px-6 md:px-12 lg:px-24 pb-32 max-w-[1200px] mx-auto">
        {loading ? (
          <div className="text-center text-brand-muted py-12">Laster bøker...</div>
        ) : books.length === 0 ? (
          <div className="text-center text-brand-muted py-12">Ingen bøker registrert enno.</div>
        ) : (
          <div className="space-y-16">
            {books.filter(book => {
              if (language === 'en') return book.language === 'en' || book.language === 'both' || !book.language;
              return book.language === 'no' || book.language === 'both' || !book.language;
            }).map((book) => {
              const displayTitle = language === 'en' && book.language === 'both' && book.titleEn ? book.titleEn : book.title;
              const displayDescription = language === 'en' && book.language === 'both' && book.descriptionEn ? book.descriptionEn : book.description;
              const displayBuyLink = language === 'en' && book.language === 'both' && book.buyLinkEn ? book.buyLinkEn : book.buyLink;
              
              return (
              <article key={book.id} className="bg-white border border-brand-sand flex flex-col md:flex-row shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
                {book.coverImageUrl ? (
                  <div className="w-full md:w-1/3 bg-gray-50 flex-shrink-0 flex items-center justify-center p-8 border-b md:border-b-0 md:border-r border-brand-sand">
                    <img src={book.coverImageUrl} alt={`Omslag for ${displayTitle}`} className="max-w-[200px] md:max-w-full drop-shadow-xl hover:scale-105 transition-transform duration-500 ease-out" />
                  </div>
                ) : (
                  <div className="w-full md:w-1/3 bg-gray-50 flex-shrink-0 flex items-center justify-center p-12 border-b md:border-b-0 md:border-r border-brand-sand min-h-[300px]">
                    <BookOpen className="w-16 h-16 text-gray-300" strokeWidth={1} />
                  </div>
                )}
                
                <div className="p-8 md:p-12 flex flex-col flex-grow">
                  <div className="text-xs text-brand-muted uppercase tracking-widest font-semibold mb-3">
                    {language === 'en' ? 'PUBLISHED' : 'UTGJEVING'}: {book.publishedYear}
                  </div>
                  <h2 className="text-3xl font-serif text-brand-dark mb-6">{displayTitle}</h2>
                  
                  <div className="text-brand-dark/80 leading-relaxed mb-8 font-serif whitespace-pre-wrap flex-grow relative">
                    {displayDescription}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-8 border-t border-gray-100">
                    <div className="flex flex-wrap gap-4 text-xs font-sans text-brand-muted uppercase tracking-wider">
                      {book.pageCount ? (
                        <div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {book.pageCount} {language === 'en' ? 'pages' : 'sider'}</div>
                      ) : null}
                      {book.isbn ? (
                        <div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> ISBN: {book.isbn}</div>
                      ) : null}
                    </div>
                    
                    {displayBuyLink && (
                      <a 
                        href={displayBuyLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center bg-brand-dark hover:bg-black text-white px-6 py-3 text-xs font-semibold tracking-widest uppercase transition-colors shrink-0"
                      >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        {language === 'en' ? 'Buy book' : 'Kjøp boka'}
                      </a>
                    )}
                  </div>
                </div>
              </article>
            )})}
          </div>
        )}
      </section>

      <AnimatePresence>
        {user && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/admin?tab=books&new=true')}
            className="fixed bottom-8 right-8 w-14 h-14 bg-brand-dark text-white rounded-full shadow-lg flex items-center justify-center hover:bg-black transition-colors z-50 group"
            title="Ny bok"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
