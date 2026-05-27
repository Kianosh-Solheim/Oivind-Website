import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { isHtml } from '../lib/utils';

interface Article {
  id: string;
  title: string;
  content: string;
  published: boolean;
  language?: string;
  slug?: string;
  imageUrl?: string;
}

export default function EnglishArticleView() {
  const { slug } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;
      try {
        const qSlug = query(collection(db, 'articles'), where('slug', '==', slug), where('published', '==', true));
        const snapSlug = await getDocs(qSlug);
        
        if (!snapSlug.empty) {
          setArticle({ id: snapSlug.docs[0].id, ...snapSlug.docs[0].data() } as Article);
        } else {
          // Fallback to ID
          const qId = query(collection(db, 'articles'), where(documentId(), '==', slug), where('published', '==', true));
          const snapId = await getDocs(qId);
          if (!snapId.empty) {
            setArticle({ id: snapId.docs[0].id, ...snapId.docs[0].data() } as Article);
          }
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
      <div className="bg-brand-surface min-h-screen py-32 text-center text-brand-muted">
        Loading article...
      </div>
    );
  }

  if (!article) {
    return (
      <div className="bg-brand-surface min-h-screen py-32 text-center">
        <h1 className="text-3xl font-serif text-brand-dark mb-4">Article Not Found</h1>
        <Link to="/English" className="text-brand-accent hover:text-brand-dark transition-colors uppercase tracking-widest text-xs font-semibold">
          BACK TO ENGLISH ARTICLES
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-brand-surface min-h-screen">
      <section className="py-20 md:py-32 px-6 md:px-12 max-w-3xl mx-auto">
        <Link to="/English" className="inline-flex items-center text-brand-muted hover:text-brand-dark transition-colors font-sans text-xs font-semibold tracking-widest uppercase mb-12">
          <ArrowLeft className="mr-2 w-4 h-4" /> ALL ARTICLES
        </Link>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-brand-dark leading-tight mb-12">
          {article.title}
        </h1>
        
        {article.imageUrl && (
          <div className="w-full h-[40vh] min-h-[300px] mb-12 overflow-hidden bg-brand-sand">
            <img loading="lazy" src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
          </div>
        )}
        
        <div className="bg-white p-8 md:p-12 lg:p-16 border border-brand-sand shadow-sm">
          <div 
            className={`prose prose-brand max-w-none text-brand-dark/90 font-serif leading-relaxed text-lg ${!isHtml(article.content) ? 'whitespace-pre-wrap' : ''}`}
            dangerouslySetInnerHTML={isHtml(article.content) ? { __html: article.content } : undefined}
          >
            {!isHtml(article.content) && article.content}
          </div>
        </div>
      </section>
    </div>
  );
}
