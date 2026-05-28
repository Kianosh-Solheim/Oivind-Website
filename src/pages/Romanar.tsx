import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';

interface Book {
  id: string;
  title: string;
  description: string;
  publishedYear: number;
}

export default function Romanar() {
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
          <ArrowLeft className="mr-2 w-4 h-4" /> TILBAKE TIL HEIM
        </Link>
        <h1 className="text-5xl md:text-6xl font-serif text-brand-dark leading-tight mb-6">
          Bøker
        </h1>
        <div className="w-16 h-px bg-brand-accent mx-auto mb-8"></div>
        <p className="text-lg md:text-xl text-brand-dark/80 font-sans leading-relaxed">
          Bøker om menneske, val og framtid.
        </p>
      </section>

      <section className="px-6 md:px-12 lg:px-24 pb-32 max-w-[1200px] mx-auto">
        {loading ? (
          <div className="text-center text-brand-muted py-12">Laster bøker...</div>
        ) : books.length === 0 ? (
          <div className="text-center text-brand-muted py-12">Ingen bøker registrert enno.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {books.map((book) => (
              <article key={book.id} className="bg-white p-8 md:p-12 border border-brand-sand flex flex-col h-full hover:-translate-y-1 transition-transform duration-300">
                <BookOpen className="w-8 h-8 text-brand-accent mb-6 opacity-80" strokeWidth={1} />
                <h2 className="text-2xl font-serif text-brand-dark mb-2">{book.title}</h2>
                <div className="text-brand-muted text-sm font-sans tracking-widest mb-6">UTGJEVING: {book.publishedYear}</div>
                <div className="text-brand-dark/80 leading-relaxed mb-8 flex-grow">
                  {book.description}
                </div>
                <button className="self-start text-xs font-semibold tracking-widest text-brand-accent hover:text-brand-dark uppercase border-b border-transparent hover:border-brand-dark transition-all">
                  Les Meir
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
