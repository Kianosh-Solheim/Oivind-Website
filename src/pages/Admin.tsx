import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy, updateDoc } from 'firebase/firestore';
import TextareaAutosize from 'react-textarea-autosize';
import RichTextEditor from '../components/RichTextEditor';
import { ArrowLeft, Plus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import FileManager from '../components/FileManager';
import ImagePickerModal from '../components/ImagePickerModal';

interface Article {
  id?: string;
  title: string;
  content: string;
  published: boolean;
  language?: string;
  slug?: string;
  imageUrl?: string;
}

interface Book {
  id?: string;
  title: string;
  description: string;
  publishedYear: number;
}

export default function Admin() {
  const { user, signInWithGoogle, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  
  const [isComposing, setIsComposing] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [articleForm, setArticleForm] = useState({ title: '', content: '', published: true, language: 'no', slug: '', imageUrl: '' });
  
  const [bookForm, setBookForm] = useState({ title: '', description: '', publishedYear: new Date().getFullYear() });

  useEffect(() => {
    if (user) {
      loadData();
      
      const params = new URLSearchParams(location.search);
      if (params.get('compose') === 'true') {
        const lang = params.get('lang') || 'no';
        setEditingArticleId(null);
        setArticleForm({ title: '', content: '', published: true, language: lang, slug: '', imageUrl: '' });
        setIsComposing(true);
        // Clear params so it doesn't stay in URL unnecessarily
        navigate('/admin', { replace: true });
      }
    }
  }, [user, location.search, navigate]);

  const loadData = async () => {
    try {
      const articlesSnap = await getDocs(query(collection(db, 'articles'), orderBy('createdAt', 'desc')));
      setArticles(articlesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Article)));

      const booksSnap = await getDocs(query(collection(db, 'books'), orderBy('createdAt', 'desc')));
      setBooks(booksSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Book)));
    } catch (e) {
      console.error("Failed to load data", e);
    }
  };

  const saveArticle = async () => {
    if (!user) return;
    if (!articleForm.title || !articleForm.content) {
      alert("Please provide a title and meaningful content.");
      return;
    }
    try {
      const articleData: any = {
        title: articleForm.title,
        content: articleForm.content,
        published: articleForm.published,
        language: articleForm.language,
        slug: articleForm.slug || articleForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        imageUrl: articleForm.imageUrl || '',
        updatedAt: serverTimestamp()
      };

      if (editingArticleId) {
        await updateDoc(doc(db, 'articles', editingArticleId), articleData);
      } else {
        await addDoc(collection(db, 'articles'), {
          ...articleData,
          authorId: user.uid,
          createdAt: serverTimestamp(),
        });
      }

      setArticleForm({ title: '', content: '', published: true, language: 'no', slug: '', imageUrl: '' });
      setEditingArticleId(null);
      setIsComposing(false);
      loadData();
    } catch (e) {
      console.error("Error saving article", e);
      alert("Error saving article. Are you sure you are an admin?");
    }
  };

  const editArticle = (article: Article) => {
    setEditingArticleId(article.id!);
    setArticleForm({
      title: article.title,
      content: article.content,
      published: article.published,
      language: article.language || 'no',
      slug: article.slug || '',
      imageUrl: article.imageUrl || ''
    });
    setIsComposing(true);
    window.scrollTo({ top: 0 });
  };

  const addBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'books'), {
        ...bookForm,
        publishedYear: Number(bookForm.publishedYear),
        authorId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setBookForm({ title: '', description: '', publishedYear: new Date().getFullYear() });
      loadData();
    } catch (e) {
      console.error("Error adding book", e);
      alert("Error adding book. Are you sure you are an admin?");
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    await deleteDoc(doc(db, 'articles', id));
    loadData();
  };

  const deleteBook = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    await deleteDoc(doc(db, 'books', id));
    loadData();
  };

  if (!user) {
    return (
      <div className="min-h-screen py-32 px-6 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-serif mb-6">Admin Login</h1>
        <button onClick={signInWithGoogle} className="px-6 py-3 bg-brand-dark text-white text-sm tracking-widest hover:bg-black transition-colors">
          SIGN IN WITH GOOGLE
        </button>
      </div>
    );
  }

  // --- COMPOSE MODE (Medium-like editor) ---
  if (isComposing) {
    return (
      <div className="min-h-screen bg-white font-sans flex flex-col">
        <header className="px-6 py-4 border-b flex justify-between items-center bg-white sticky top-0 z-50">
          <button 
            onClick={() => setIsComposing(false)} 
            className="text-xs font-semibold tracking-widest text-brand-muted hover:text-brand-dark flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> DASHBOARD
          </button>
          
          <div className="flex items-center gap-4 md:gap-6 relative">
            <select 
              value={articleForm.language} 
              onChange={e => setArticleForm({...articleForm, language: e.target.value})} 
              className="text-xs border-none focus:ring-0 cursor-pointer text-brand-dark font-medium uppercase tracking-widest bg-transparent outline-none"
            >
              <option value="no">NORSK</option>
              <option value="en">ENGLISH</option>
            </select>

            <label className="flex items-center space-x-2 text-xs font-medium tracking-widest uppercase cursor-pointer">
              <input type="checkbox" checked={articleForm.published} onChange={e => setArticleForm({...articleForm, published: e.target.checked})} className="accent-brand-accent w-3 h-3" />
              <span>{articleForm.published ? 'Published' : 'Draft'}</span>
            </label>
            
            <button onClick={saveArticle} className="px-6 py-2.5 bg-brand-dark text-white text-xs font-semibold tracking-widest hover:bg-black transition-colors">
              {editingArticleId ? 'UPDATE' : 'PUBLISH'}
            </button>
          </div>
        </header>
        
        <main className="flex-grow max-w-3xl mx-auto w-full px-6 py-12 flex flex-col relative">
          
          <input 
            type="text" 
            placeholder="Custom slug (optional)" 
            value={articleForm.slug} 
            onChange={e => setArticleForm({...articleForm, slug: e.target.value})}
            className="w-full text-xs font-sans text-brand-muted placeholder:text-gray-300 border-none outline-none focus:ring-0 mb-4 bg-transparent"
          />
           
          <TextareaAutosize 
            placeholder="Story Title" 
            value={articleForm.title}
            onChange={e => setArticleForm({...articleForm, title: e.target.value})}
            className="w-full text-4xl md:text-5xl lg:text-6xl font-serif text-brand-dark placeholder:text-gray-200 mb-8 border-none outline-none focus:ring-0 resize-none bg-transparent leading-tight"
          />
          
          {articleForm.imageUrl ? (
            <div className="w-full h-[40vh] min-h-[300px] mb-12 bg-brand-sand overflow-hidden relative group rounded-md">
              <img loading="lazy" src={articleForm.imageUrl} alt="Cover" className="w-full h-full object-cover" />
              <button 
                onClick={() => setArticleForm({...articleForm, imageUrl: ''})} 
                className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1.5 text-xs font-semibold tracking-widest uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              >
                Fjern bilde
              </button>
            </div>
          ) : (
            <div className="mb-12 border border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors"
                 onClick={() => setShowImagePicker(true)}>
              <span className="text-sm font-semibold tracking-widest uppercase text-brand-muted">Legg til hovudbilde</span>
            </div>
          )}

          <div className="flex-grow w-full">
            <RichTextEditor content={articleForm.content} onChange={c => setArticleForm({...articleForm, content: c})} />
          </div>

          {showImagePicker && (
            <ImagePickerModal 
              onClose={() => setShowImagePicker(false)} 
              onSelect={(url) => {
                setArticleForm({...articleForm, imageUrl: url});
              }}
            />
          )}
        </main>
      </div>
    );
  }

  // --- DASHBOARD MODE ---
  return (
    <div className="min-h-screen py-16 px-6 max-w-[1400px] mx-auto font-sans">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-serif text-brand-dark">Dashboard</h1>
        <button onClick={logout} className="text-sm font-semibold tracking-widest text-brand-accent hover:text-brand-dark">LOGOUT</button>
      </div>

      <div className="grid lg:grid-cols-2 gap-16">
        {/* ARTICLES MANAGE */}
        <section>
          <div className="flex justify-between items-center border-b pb-4 mb-6">
            <h2 className="text-2xl font-serif">Articles</h2>
            <button 
              onClick={() => {
                setEditingArticleId(null);
                setArticleForm({ title: '', content: '', published: true, language: 'no', slug: '', imageUrl: '' });
                setIsComposing(true);
              }}
              className="flex items-center text-xs font-semibold tracking-widest bg-brand-dark text-white px-4 py-2 hover:bg-black transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" /> NEW ARTICLE
            </button>
          </div>

          <div className="space-y-4">
            {articles.map(article => (
              <div key={article.id} className="p-5 border border-gray-100 flex justify-between items-center bg-brand-surface group hover:border-brand-accent transition-colors">
                <div className="flex-grow">
                  <h3 className="font-semibold text-lg mb-1">{article.title} {article.imageUrl && <span className="text-brand-muted ml-2 text-xs">(has cover)</span>}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] tracking-widest text-brand-accent font-semibold uppercase">{article.language || 'no'}</span>
                    <span className="text-[10px] tracking-widest text-brand-muted uppercase">{article.published ? 'Published' : 'Draft'}</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => editArticle(article)} className="text-brand-dark text-xs font-semibold tracking-widest hover:text-brand-accent transition-colors">EDIT</button>
                  <button onClick={() => deleteArticle(article.id!)} className="text-red-500 text-xs font-semibold tracking-widest opacity-50 hover:opacity-100 transition-opacity">DELETE</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BOOKS MANAGE */}
        <section>
          <h2 className="text-2xl font-serif border-b pb-4 mb-6">Books</h2>
          <form onSubmit={addBook} className="space-y-4 mb-8 bg-brand-surface border border-gray-100 p-6">
            <input 
              type="text" placeholder="Title" required
              value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})}
              className="w-full p-3 border-none ring-1 ring-gray-200 focus:ring-brand-accent bg-white outline-none" />
            <textarea 
              placeholder="Description" required rows={3}
              value={bookForm.description} onChange={e => setBookForm({...bookForm, description: e.target.value})}
              className="w-full p-3 border-none ring-1 ring-gray-200 focus:ring-brand-accent bg-white outline-none"></textarea>
            <input 
              type="number" placeholder="Year" required
              value={bookForm.publishedYear} onChange={e => setBookForm({...bookForm, publishedYear: parseInt(e.target.value)})}
              className="w-full p-3 border-none ring-1 ring-gray-200 focus:ring-brand-accent bg-white outline-none" />
            <button type="submit" className="w-full py-3 bg-brand-dark text-white uppercase tracking-widest font-semibold text-xs mt-4 hover:bg-black transition-colors">ADD BOOK</button>
          </form>

          <div className="space-y-4">
            {books.map(book => (
              <div key={book.id} className="p-5 border border-gray-100 flex justify-between items-center bg-brand-surface">
                <div>
                  <h3 className="font-semibold">{book.title}</h3>
                  <span className="text-xs text-gray-500">{book.publishedYear}</span>
                </div>
                <button onClick={() => deleteBook(book.id!)} className="text-red-500 text-xs tracking-widest">DELETE</button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-16">
        <FileManager />
      </div>
    </div>
  );
}
