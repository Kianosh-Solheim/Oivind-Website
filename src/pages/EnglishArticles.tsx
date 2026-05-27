import { useState, useEffect } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { stripHtml } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';

interface Article {
  id: string;
  title: string;
  content: string;
  published: boolean;
  language?: string;
  slug?: string;
  imageUrl?: string;
}

export default function EnglishArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.email === 'kianoshsolheim@gmail.com' || user?.email === 'oivindsolheim@gmail.com';

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const q = query(
          collection(db, 'articles'), 
          where('published', '==', true), 
          where('language', '==', 'en')
        );
        const snap = await getDocs(q);
        const fetchedArticles = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
        // Sort locally to avoid needing a Firestore composite index
        fetchedArticles.sort((a, b) => {
          const timeA = (a as any).createdAt?.toMillis ? (a as any).createdAt.toMillis() : 0;
          const timeB = (b as any).createdAt?.toMillis ? (b as any).createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        setArticles(fetchedArticles);
      } catch (error) {
        console.error("Error fetching english articles", error);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  return (
    <div className="bg-brand-surface min-h-screen">
      <section className="py-20 md:py-32 px-6 md:px-12 text-center max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center text-brand-muted hover:text-brand-dark transition-colors font-sans text-xs font-semibold tracking-widest uppercase mb-12">
          <ArrowLeft className="mr-2 w-4 h-4" /> BACK TO HOME
        </Link>
        <h1 className="text-5xl md:text-6xl font-serif text-brand-dark leading-tight mb-6">
          English Reflections
        </h1>
        <div className="w-16 h-px bg-brand-accent mx-auto mb-8"></div>
        <p className="text-lg md:text-xl text-brand-dark/80 font-sans leading-relaxed">
          Thoughts on life, technology, society, and our shared future.
        </p>
      </section>

      <section className="px-6 md:px-12 lg:px-24 pb-32 max-w-[1200px] mx-auto">
        {loading ? (
          <div className="text-center text-brand-muted py-12">Loading articles...</div>
        ) : articles.length === 0 ? (
          <div className="text-center text-brand-muted py-12">No English articles published yet.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {articles.map((article) => (
              <article key={article.id} className="bg-white border border-brand-sand flex flex-col h-full hover:-translate-y-1 transition-transform duration-300 overflow-hidden group">
                {article.imageUrl && (
                  <div className="w-full h-48 md:h-64 overflow-hidden bg-brand-sand">
                    <img loading="lazy" src={article.imageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                )}
                <div className="p-8 md:p-12 flex flex-col flex-grow w-full">
                  <h2 className="text-3xl font-serif text-brand-dark mb-4">{article.title}</h2>
                  <div className="text-brand-dark/80 font-serif leading-relaxed mb-8 flex-grow line-clamp-4">
                    {stripHtml(article.content)}
                  </div>
                  <Link to={`/English/${article.slug || article.id}`} className="inline-flex self-start text-xs font-semibold tracking-widest text-brand-accent hover:text-brand-dark uppercase border-b border-transparent hover:border-brand-dark transition-all">
                    Read More
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {isAdmin && (
        <button
          onClick={() => navigate('/admin?compose=true&lang=en')}
          className="fixed bottom-8 right-8 w-14 h-14 bg-brand-dark text-white rounded-full shadow-lg flex items-center justify-center hover:bg-black transition-colors hover:scale-110 z-50 group"
          title="New Article (English)"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
