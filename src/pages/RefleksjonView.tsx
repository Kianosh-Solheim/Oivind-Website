import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { isHtml, calculateReadingTime } from '../lib/utils';

interface Article {
  id: string;
  title: string;
  content: string;
  published: boolean;
  language?: string;
  slug?: string;
  imageUrl?: string;
  imageCaption?: string;
}

export default function RefleksjonView() {
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
          // Fallback to searching by ID
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
        Laster inn refleksjonen...
      </div>
    );
  }

  if (!article) {
    return (
      <div className="bg-brand-surface min-h-screen py-32 text-center">
        <h1 className="text-3xl font-serif text-brand-dark mb-4">Fann ikkje refleksjonen</h1>
        <Link to="/refleksjonar" className="text-brand-accent hover:text-brand-dark transition-colors uppercase tracking-widest text-xs font-semibold">
          TILBAKE TIL REFLEKSJONAR
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-brand-surface min-h-screen">
      <section className="py-20 md:py-32 px-6 md:px-12 max-w-3xl mx-auto">
        <Link to="/refleksjonar" className="inline-flex items-center text-brand-muted hover:text-brand-dark transition-colors font-sans text-xs font-semibold tracking-widest uppercase mb-12">
          <ArrowLeft className="mr-2 w-4 h-4" /> ALLE REFLEKSJONAR
        </Link>
        <div className="flex items-center gap-4 mb-4">
          <span className="text-xs text-brand-muted uppercase tracking-widest font-semibold">
            {calculateReadingTime(article.content)} min read
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-brand-dark leading-tight mb-12">
          {article.title}
        </h1>
        
        {article.imageUrl && (
          <figure className="mb-12">
            <div className="w-full h-[40vh] min-h-[300px] overflow-hidden bg-brand-sand">
              <img loading="lazy" src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
            </div>
            {article.imageCaption && (
              <figcaption className="text-center text-sm text-brand-muted mt-3 italic">
                {article.imageCaption}
              </figcaption>
            )}
          </figure>
        )}
        
        <div className="bg-white p-8 md:p-12 lg:p-16 border border-brand-sand shadow-sm">
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
        </div>
      </section>
    </div>
  );
}
