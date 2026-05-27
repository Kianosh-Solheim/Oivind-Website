import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { stripHtml } from '../lib/utils'; // ensures excerpts display cleanly

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

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const q = query(collection(db, 'articles'), where('published', '==', true), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const fetchedArticles = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
        // Filter out explicitly English articles
        const norskArticles = fetchedArticles.filter(a => a.language !== 'en');
        setArticles(norskArticles);
      } catch (error) {
        console.error("Error fetching articles", error);
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
          <ArrowLeft className="mr-2 w-4 h-4" /> TILBAKE TIL HEIM
        </Link>
        <h1 className="text-5xl md:text-6xl font-serif text-brand-dark leading-tight mb-6">
          Refleksjoner
        </h1>
        <div className="w-16 h-px bg-brand-accent mx-auto mb-8"></div>
        <p className="text-lg md:text-xl text-brand-dark/80 font-sans leading-relaxed">
          Tankar om livet, teknologien, samfunnet, og vår felles framtid.
        </p>
      </section>

      <section className="px-6 md:px-12 lg:px-24 pb-32 max-w-[1200px] mx-auto">
        {loading ? (
          <div className="text-center text-brand-muted py-12">Laster artikler...</div>
        ) : articles.length === 0 ? (
          <div className="text-center text-brand-muted py-12">Ingen artikler publisert enno.</div>
        ) : (
          <div className="space-y-12">
            {articles.map((article) => (
              <article key={article.id} className="bg-white border border-brand-sand flex flex-col md:flex-row items-stretch group overflow-hidden">
                {article.imageUrl && (
                  <div className="w-full md:w-2/5 h-64 md:h-auto overflow-hidden bg-brand-sand">
                    <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                )}
                <div className={`p-8 md:p-12 flex flex-col justify-center ${article.imageUrl ? 'md:w-3/5' : 'w-full'}`}>
                  <h2 className="text-3xl font-serif text-brand-dark mb-4">{article.title}</h2>
                  <div className="text-brand-dark/80 font-serif leading-relaxed line-clamp-3 mb-8">
                    {stripHtml(article.content)}
                  </div>
                  <Link to={`/refleksjonar/${article.slug || article.id}`} className="inline-flex self-start text-xs font-semibold tracking-widest text-brand-accent hover:text-brand-dark uppercase border-b border-transparent hover:border-brand-dark transition-all">
                    Les Meir
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
