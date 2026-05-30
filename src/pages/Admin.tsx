import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy, updateDoc, getDoc } from 'firebase/firestore';
import TextareaAutosize from 'react-textarea-autosize';
import RichTextEditor from '../components/RichTextEditor';
import { ArrowLeft, Plus, Info } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GoogleGenAI } from '@google/genai';

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
  imageCaption?: string;
  translationId?: string;
}

interface Book {
  id?: string;
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

interface DiaryEntry {
  id?: string;
  title: string;
  content: string;
  language: 'no' | 'en' | 'both';
  translationId?: string;
}

export default function Admin() {
  const { user, signInWithGoogle, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  
  const [isComposing, setIsComposing] = useState(false);
  const [isComposingDiary, setIsComposingDiary] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showBookImagePicker, setShowBookImagePicker] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [originalArticle, setOriginalArticle] = useState<Article | null>(null);
  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null);
  const [originalDiary, setOriginalDiary] = useState<DiaryEntry | null>(null);
  const [articleFilter, setArticleFilter] = useState('all');
  const [articleForm, setArticleForm] = useState({ title: '', content: '', published: true, language: 'no', slug: '', imageUrl: '', imageCaption: '', translationId: '' });
  const [infoDialog, setInfoDialog] = useState<{title: string, content: React.ReactNode} | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);
  const [dashboardTab, setDashboardTab] = useState<'articles' | 'books' | 'diary' | 'files'>('articles');
  
  const [bookForm, setBookForm] = useState<Book>({ title: '', description: '', publishedYear: new Date().getFullYear(), coverImageUrl: '', isbn: '', buyLink: '', pageCount: 0, language: 'no', titleEn: '', descriptionEn: '', buyLinkEn: '' });

  const [diaryForm, setDiaryForm] = useState<DiaryEntry>({ title: '', content: '', language: 'both' });

  useEffect(() => {
    if (user) {
      loadData();
      
      const params = new URLSearchParams(location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'books' || tabParam === 'files' || tabParam === 'articles' || tabParam === 'diary') {
        setDashboardTab(tabParam as any);
      }
      
      if (params.get('compose') === 'true') {
        const lang = params.get('lang') || 'no';
        setEditingArticleId(null);
        setArticleForm({ title: '', content: '', published: true, language: lang, slug: '', imageUrl: '', imageCaption: '', translationId: '' });
        setIsComposing(true);
      } else if (params.get('edit')) {
        const editId = params.get('edit')!;
        getDoc(doc(db, 'articles', editId)).then(docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setEditingArticleId(docSnap.id);
            setArticleForm({
              title: data.title || '',
              content: data.content || '',
              published: data.published ?? true,
              language: data.language || 'no',
              slug: data.slug || '',
              imageUrl: data.imageUrl || '',
              imageCaption: data.imageCaption || '',
              translationId: data.translationId || ''
            });
            setIsComposing(true);
          }
        });
      } else if (params.get('compose_diary') === 'true') {
        setEditingDiaryId(null);
        setDiaryForm({ title: '', content: '', language: 'both', translationId: '' });
        setIsComposingDiary(true);
      } else if (params.get('edit_diary')) {
        const editId = params.get('edit_diary')!;
        getDoc(doc(db, 'diary', editId)).then(docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setEditingDiaryId(docSnap.id);
            setDiaryForm({
              title: data.title || '',
              content: data.content || '',
              language: data.language || 'both',
              translationId: data.translationId || ''
            });
            setIsComposingDiary(true);
          }
        });
      }
    }
  }, [user, location.search, navigate]);

  const loadData = async () => {
    try {
      const articlesSnap = await getDocs(query(collection(db, 'articles'), orderBy('createdAt', 'desc')));
      setArticles(articlesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Article)));

      const booksSnap = await getDocs(query(collection(db, 'books'), orderBy('createdAt', 'desc')));
      setBooks(booksSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Book)));

      const diariesSnap = await getDocs(query(collection(db, 'diary'), orderBy('createdAt', 'desc')));
      setDiaries(diariesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as DiaryEntry)));
    } catch (e) {
      console.error("Failed to load data", e);
    }
  };

  const saveArticle = async () => {
    if (!user) return;
    if (!articleForm.title || !articleForm.content) {
      console.error("Please provide a title and meaningful content.");
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
        imageCaption: articleForm.imageCaption || '',
        translationId: articleForm.translationId || '',
        updatedAt: serverTimestamp()
      };

      let newArticleId = editingArticleId;
      if (editingArticleId) {
        await updateDoc(doc(db, 'articles', editingArticleId), articleData);
      } else {
        const docRef = await addDoc(collection(db, 'articles'), {
          ...articleData,
          authorId: user.uid,
          createdAt: serverTimestamp(),
        });
        newArticleId = docRef.id;
      }

      if (articleForm.translationId && newArticleId) {
        // Also update the translated article back to this one
        await updateDoc(doc(db, 'articles', articleForm.translationId), {
          translationId: newArticleId
        });
      }

      setArticleForm({ title: '', content: '', published: true, language: 'no', slug: '', imageUrl: '', imageCaption: '', translationId: '' });
      setEditingArticleId(null);
      setOriginalArticle(null);
      setIsComposing(false);
      navigate('/admin');
      loadData();
    } catch (e) {
      console.error("Feil ved lagring av artikkel. Er du sikker på at du er administrator? Error:", e);
    }
  };

  const editArticle = (article: Article) => {
    navigate(`/admin?edit=${article.id}`);
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
      setBookForm({ title: '', description: '', publishedYear: new Date().getFullYear(), coverImageUrl: '', isbn: '', buyLink: '', pageCount: 0, language: 'no', titleEn: '', descriptionEn: '', buyLinkEn: '' });
      loadData();
    } catch (e) {
      console.error("Feil ved lagring av bok. Er du sikker på at du er administrator? Error:", e);
    }
  };

  const [isTranslating, setIsTranslating] = useState(false);

  const createTranslation = async (article: Article) => {
    const targetLang = (article.language || 'no') === 'no' ? 'en' : 'no';
    
    setEditingArticleId(null);
    setArticleForm({
      title: 'Omsetter...',
      content: '<p>Omsetter tekst, vennligst vent...</p>',
      published: false,
      language: targetLang,
      slug: '',
      imageUrl: article.imageUrl || '',
      imageCaption: article.imageCaption ? 'Omsetter...' : '',
      translationId: article.id
    });
    setOriginalArticle(article);
    setIsComposing(true);
    setIsTranslating(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('VITE_GEMINI_API_KEY mangler i GitHub secrets / miljøvariabler.');
      
      const ai = new GoogleGenAI({ apiKey });

      const translateCall = async (text: string, context: string) => {
        if (!text) return '';
        const prompt = `You are a professional translator. Translate the following ${context} into ${targetLang === 'en' ? 'English' : 'Norwegian'}. \n\nIMPORTANT: Return ONLY the translated text, preserving any markdown layout or HTML tags if they exist. Do not add any conversational text.\n\nText to translate:\n${text}`;
        
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
        });

        return response.text || '';
      };

      const [translatedTitle, translatedContent, translatedCaption] = await Promise.all([
        translateCall(article.title, "article title"),
        translateCall(article.content, "HTML article content"),
        translateCall(article.imageCaption || '', "image caption")
      ]);

      setArticleForm({
        title: translatedTitle,
        content: translatedContent,
        published: false,
        language: targetLang,
        slug: '',
        imageUrl: article.imageUrl || '',
        imageCaption: translatedCaption,
        translationId: article.id
      });
    } catch (e) {
      console.error("Translation error:", e);
      setArticleForm({
        title: `${article.title} (${targetLang.toUpperCase()}) [Feil ved automatisk omsetting]`,
        content: article.content, // Fallback to original
        published: false,
        language: targetLang,
        slug: '',
        imageUrl: article.imageUrl || '',
        imageCaption: article.imageCaption || '',
        translationId: article.id
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const deleteArticle = async (id: string) => {
    setConfirmDialog({
      title: 'Slett artikkel',
      message: 'Er du sikker på at du vil slette denne artikkelen?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'articles', id));
          loadData();
        } catch (e) {
          console.error(e);
        }
        setConfirmDialog(null);
      }
    });
  };

  const deleteBook = async (id: string) => {
    setConfirmDialog({
      title: 'Slett bok',
      message: 'Er du sikker på at du vil slette denne boka?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'books', id));
          loadData();
        } catch (e) {
          console.error(e);
        }
        setConfirmDialog(null);
      }
    });
  };

  const saveDiary = async () => {
    if (!user) return;
    try {
      let newDiaryId = editingDiaryId;
      if (editingDiaryId) {
         await updateDoc(doc(db, 'diary', editingDiaryId), {
           title: diaryForm.title,
           content: diaryForm.content,
           language: diaryForm.language,
           translationId: diaryForm.translationId || '',
           updatedAt: serverTimestamp()
         });
      } else {
         const docRef = await addDoc(collection(db, 'diary'), {
           title: diaryForm.title,
           content: diaryForm.content,
           language: diaryForm.language,
           translationId: diaryForm.translationId || '',
           authorId: user.uid,
           createdAt: serverTimestamp(),
           updatedAt: serverTimestamp()
         });
         newDiaryId = docRef.id;
      }
      
      if (diaryForm.translationId && newDiaryId) {
        await updateDoc(doc(db, 'diary', diaryForm.translationId), {
          translationId: newDiaryId
        });
      }

      setDiaryForm({ title: '', content: '', language: 'both' });
      setEditingDiaryId(null);
      setOriginalDiary(null);
      setIsComposingDiary(false);
      navigate('/admin?tab=diary');
      loadData();
    } catch (e) {
      console.error("Feil ved lagring av dagbok. Er du sikker på at du er administrator? Error:", e);
    }
  };

  const createDiaryTranslation = async (diary: DiaryEntry) => {
    const targetLang = (diary.language || 'no') === 'no' ? 'en' : 'no';
    
    setEditingDiaryId(null);
    setDiaryForm({
      title: diary.title ? 'Omsetter...' : '',
      content: '<p>Omsetter tekst, vennligst vent...</p>',
      language: targetLang,
      translationId: diary.id
    });
    setOriginalDiary(diary);
    setIsComposingDiary(true);
    setIsTranslating(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('VITE_GEMINI_API_KEY mangler i GitHub secrets / miljøvariabler.');
      
      const ai = new GoogleGenAI({ apiKey });

      const translateCall = async (text: string, context: string) => {
        if (!text) return '';
        const prompt = `You are a professional translator. Translate the following ${context} into ${targetLang === 'en' ? 'English' : 'Norwegian'}. \n\nIMPORTANT: Return ONLY the translated text, preserving any markdown layout or HTML tags if they exist. Do not add any conversational text.\n\nText to translate:\n${text}`;
        
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
        });

        return response.text || '';
      };

      const [translatedTitle, translatedContent] = await Promise.all([
        translateCall(diary.title, "diary entry title"),
        translateCall(diary.content, "HTML diary entry content")
      ]);

      setDiaryForm({
        title: translatedTitle,
        content: translatedContent,
        language: targetLang,
        translationId: diary.id
      });
    } catch (e) {
      console.error("Translation error:", e);
      setDiaryForm({
        title: diary.title ? `${diary.title} (${targetLang.toUpperCase()}) [Feil ved automatisk omsetting]` : '',
        content: diary.content,
        language: targetLang,
        translationId: diary.id
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const deleteDiary = async (id: string) => {
    setConfirmDialog({
      title: 'Slett dagbokoppslag',
      message: 'Er du sikker på at du vil slette dette oppslaget?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'diary', id));
          loadData();
        } catch (e) {
          console.error("Feil ved sletting av oppslag. Mangler rettigheter. Error:", e);
        }
        setConfirmDialog(null);
      }
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen py-32 px-6 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-serif mb-6">Admin Logg Inn</h1>
        <button onClick={signInWithGoogle} className="px-6 py-3 bg-brand-dark text-white text-sm tracking-widest hover:bg-black transition-colors">
          LOGG INN MED GOOGLE
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
            onClick={() => { setIsComposing(false); setOriginalArticle(null); navigate('/admin'); }} 
            className="text-xs font-semibold tracking-widest text-brand-muted hover:text-brand-dark flex items-center shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> KONTROLLPANEL
          </button>
          
          <div id="editor-toolbar-container" className="hidden md:flex flex-grow justify-center mx-4"></div>

          <div className="flex items-center gap-4 md:gap-6 relative shrink-0">
            <div className="flex items-center gap-1 group">
              <select 
                value={articleForm.language} 
                onChange={e => setArticleForm({...articleForm, language: e.target.value})} 
                className="text-xs border-none focus:ring-0 cursor-pointer text-brand-dark font-medium uppercase tracking-widest bg-transparent outline-none pl-0"
              >
                <option value="no">NORSK</option>
                <option value="en">ENGELSK</option>
              </select>
              <button 
                onClick={() => setInfoDialog({
                  title: 'Språkvalg',
                  content: <p>Vel språket artikkelen er skriven på. Dette blir brukt for å filtrere og vise riktig versjon til rett publikum.</p>
                })} 
                className="text-gray-300 hover:text-brand-dark transition-colors mr-2"
                title="Informasjon om språk"
              >
                <Info className="w-4 h-4" />
              </button>

              {/* Translation Selection */}
              <select 
                value={articleForm.translationId || ''} 
                onChange={e => setArticleForm({...articleForm, translationId: e.target.value})} 
                className="text-xs border-none focus:ring-0 cursor-pointer text-brand-muted font-medium bg-transparent outline-none max-w-[120px] truncate"
              >
                <option value="">Ingen omsetting</option>
                {articles.filter(a => a.language !== articleForm.language && a.id !== editingArticleId).map(a => (
                  <option key={a.id} value={a.id}>Lenke til: {a.title}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 group">
              <label className="flex items-center space-x-2 text-xs font-medium tracking-widest uppercase cursor-pointer">
                <input type="checkbox" checked={articleForm.published} onChange={e => setArticleForm({...articleForm, published: e.target.checked})} className="accent-brand-accent w-3 h-3" />
                <span>{articleForm.published ? 'Publisert' : 'Utkast'}</span>
              </label>
              <button 
                onClick={() => setInfoDialog({
                  title: 'Publiseringsstatus',
                  content: <p>Dersom <strong>Utkast</strong> er valt, vil artikkelen berre vere synleg her i kontrollpanelet. Set han til <strong>Publisert</strong> for å gjere han synleg for publikum. Du kan når som helst endre dette seinare.</p>
                })} 
                className="text-gray-300 hover:text-brand-dark transition-colors"
                title="Informasjon om status"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            
            <button onClick={saveArticle} className="px-6 py-2.5 bg-brand-dark text-white text-xs font-semibold tracking-widest hover:bg-black transition-colors">
              {editingArticleId ? 'OPPDATER' : 'PUBLISER'}
            </button>
          </div>
        </header>
        
        <main className={`flex-grow w-full py-12 relative flex ${originalArticle ? 'max-w-[1600px] px-8 mx-auto gap-12' : 'max-w-3xl px-6 mx-auto flex-col'}`}>
          
          {infoDialog && (
            <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
              <div className="bg-brand-surface w-full max-w-md rounded-sm p-8 relative shadow-2xl">
                <button 
                  onClick={() => setInfoDialog(null)}
                  className="absolute top-4 right-4 text-brand-muted hover:text-brand-dark"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-xl font-serif mb-4">{infoDialog.title}</h3>
                <div className="space-y-4 text-sm text-brand-muted leading-relaxed">
                  {infoDialog.content}
                </div>
                <div className="mt-8">
                  <button 
                    onClick={() => setInfoDialog(null)}
                    className="w-full py-3 bg-brand-dark text-white text-xs font-semibold tracking-widest uppercase hover:bg-black transition-colors"
                  >
                    Eg forstår
                  </button>
                </div>
              </div>
            </div>
          )}

          {originalArticle && (
            <div className="w-1/2 flex flex-col border-r border-gray-200 pr-12 overflow-y-auto max-h-[calc(100vh-140px)] sticky top-[88px] opacity-70 hover:opacity-100 transition-opacity">
              <div className="text-xs font-semibold tracking-widest text-brand-accent uppercase mb-4 sticky top-0 bg-white py-2 z-10 border-b border-gray-100">
                Originalversjon ({originalArticle.language === 'en' ? 'Engelsk' : 'Norsk'})
              </div>
              <h1 className="w-full text-4xl md:text-5xl font-serif text-brand-dark mb-8 leading-tight">
                {originalArticle.title}
              </h1>
              {originalArticle.imageUrl && (
                <div className="w-full mb-8">
                  <img src={originalArticle.imageUrl} className="w-full h-auto max-h-[300px] object-cover rounded-sm" />
                  {originalArticle.imageCaption && <p className="text-sm text-center text-brand-muted mt-2 italic">{originalArticle.imageCaption}</p>}
                </div>
              )}
              <div className="prose prose-lg brand-prose max-w-none pb-12" dangerouslySetInnerHTML={{ __html: originalArticle.content }} />
            </div>
          )}

          <div className={originalArticle ? "w-1/2 flex flex-col min-w-0" : "flex flex-col w-full"}>
            {originalArticle && (
              <div className="text-xs font-semibold tracking-widest text-brand-dark uppercase mb-4 sticky top-0 bg-white py-2 z-10 border-b border-gray-100">
                Omsetting ({articleForm.language === 'en' ? 'Engelsk' : 'Norsk'})
              </div>
            )}
            <div className="flex items-center gap-2 mb-4 w-full group">
              <input 
                type="text" 
                placeholder="Eigendefinert slug (valfritt)" 
                value={articleForm.slug} 
                onChange={e => setArticleForm({...articleForm, slug: e.target.value})}
                className="w-full text-xs font-sans text-brand-muted placeholder:text-gray-300 border-none outline-none focus:ring-0 bg-transparent"
              />
              <button 
                onClick={() => setInfoDialog({
                  title: 'Kva er ein URL-slug?',
                  content: (
                    <>
                      <p>Ein <strong>slug</strong> er den delen av ei nettadresse (URL) som identifiserer akkurat di side i ei leseleg form.</p>
                      <p><strong>Kvifor vere varsam med å endre han?</strong><br/>Når du lagar ein artikkel, blir sluggen automatisk generert basert på tittelen. Dersom du endrar sluggen <em>etter</em> at artikkelen er publisert og delt, vil gamle lenkjer til artikkelen slutte å verke, og du vil tape eventuell søkemotorverdi (SEO) han har opparbeidd seg.</p>
                      <p><strong>Når bør du endre han?</strong><br/>Du bør berre setje ein eigendefinert slug den aller første gongen du lagar artikkelen, for å gjere han kortare eller meir målretta.</p>
                    </>
                  )
                })} 
                className="text-gray-300 hover:text-brand-dark transition-colors"
                title="Informasjon om URL-slug"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
             
            <TextareaAutosize 
              placeholder="Artikkeltittel" 
              value={articleForm.title}
              onChange={e => setArticleForm({...articleForm, title: e.target.value})}
              className="w-full text-4xl md:text-5xl lg:text-6xl font-serif text-brand-dark placeholder:text-gray-200 mb-8 border-none outline-none focus:ring-0 resize-none bg-transparent leading-tight"
            />
            
            {articleForm.imageUrl ? (
              <div className="w-full mb-12 relative group rounded-md">
                <div className="w-full h-[40vh] min-h-[300px] bg-brand-sand overflow-hidden relative">
                  <img loading="lazy" src={articleForm.imageUrl} alt="Cover" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setArticleForm({...articleForm, imageUrl: '', imageCaption: ''})} 
                    className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1.5 text-xs font-semibold tracking-widest uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  >
                    Fjern bilde
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2 w-full max-w-lg mx-auto group relative">
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={e => setArticleForm({...articleForm, imageCaption: e.currentTarget.innerHTML})}
                    className="w-full text-sm text-center text-brand-muted bg-transparent border-none outline-none focus:ring-0 placeholder:text-gray-300 italic pr-8 empty:before:content-['Bilettekst_(valfritt)'] empty:before:text-gray-300 focus:empty:before:content-['']"
                    dangerouslySetInnerHTML={{ __html: articleForm.imageCaption }}
                  />
                  <button 
                    onClick={() => setInfoDialog({
                      title: 'Bilettekst',
                      content: <p>Biletteksten vil bli synt fram under biletet. Dette er ikkje berre nyttig for lesaren, men bidreg også til betre tilgjenge (universell utforming) og søkemotorverdi (SEO).</p>
                    })} 
                    className="text-gray-300 hover:text-brand-dark transition-colors absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                    title="Informasjon om bilettekst"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
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
                language={articleForm.language}
                onClose={() => setShowImagePicker(false)} 
                onSelect={(url, caption) => {
                  setArticleForm({...articleForm, imageUrl: url, imageCaption: caption || articleForm.imageCaption});
                }}
              />
            )}
          </div>
        </main>
      </div>
    );
  }

  // --- COMPOSE MODE DIARY ---
  if (isComposingDiary) {
    return (
      <div className="min-h-screen bg-white font-sans flex flex-col">
        <header className="px-6 py-4 border-b flex justify-between items-center bg-white sticky top-0 z-50">
          <button 
            onClick={() => { setIsComposingDiary(false); navigate('/admin?tab=diary'); }} 
            className="text-xs font-semibold tracking-widest text-brand-muted hover:text-brand-dark flex items-center shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> KONTROLLPANEL
          </button>
          
          <div id="editor-toolbar-container" className="hidden md:flex flex-grow justify-center mx-4"></div>

          <div className="flex items-center gap-4 md:gap-6 relative shrink-0">
            <div className="flex items-center gap-1 group">
              <select 
                value={diaryForm.language} 
                onChange={e => setDiaryForm({...diaryForm, language: e.target.value as any})} 
                className="text-xs border-none focus:ring-0 cursor-pointer text-brand-dark font-medium uppercase tracking-widest bg-transparent outline-none pl-0"
              >
                <option value="both">BEGGE</option>
                <option value="no">NORSK</option>
                <option value="en">ENGELSK</option>
              </select>
              <button 
                onClick={() => setInfoDialog({
                  title: 'Språkvalg Dagbok',
                  content: <p>Vel om oppslaget skal vere synleg på både norsk og engelsk, eller berre eitt av språka.</p>
                })} 
                className="text-gray-300 hover:text-brand-dark transition-colors mr-2"
                title="Informasjon om språk"
              >
                <Info className="w-4 h-4" />
              </button>

              <select 
                value={diaryForm.translationId || ''} 
                onChange={e => setDiaryForm({...diaryForm, translationId: e.target.value})} 
                className="text-xs border-none focus:ring-0 cursor-pointer text-brand-muted font-medium bg-transparent outline-none max-w-[120px] truncate"
              >
                <option value="">Ingen omsetting</option>
                {diaries.filter(d => d.language !== diaryForm.language && d.id !== editingDiaryId && d.language !== 'both').map(d => (
                  <option key={d.id} value={d.id}>Lenke til: {d.title || 'Uten tittel'}</option>
                ))}
              </select>
            </div>
            
            <button onClick={saveDiary} className="px-6 py-2.5 bg-brand-dark text-white text-xs font-semibold tracking-widest hover:bg-black transition-colors">
              {editingDiaryId ? 'OPPDATER' : 'PUBLISER I DAGBOK'}
            </button>
          </div>
        </header>
        
        <main className={`flex-grow w-full py-12 relative flex ${originalDiary ? 'max-w-[1600px] px-8 mx-auto gap-12' : 'max-w-3xl px-6 mx-auto flex-col'}`}>
          {infoDialog && (
            <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
              <div className="bg-brand-surface w-full max-w-md rounded-sm p-8 relative shadow-2xl">
                <button 
                  onClick={() => setInfoDialog(null)}
                  className="absolute top-4 right-4 text-brand-muted hover:text-brand-dark"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-xl font-serif mb-4">{infoDialog.title}</h3>
                <div className="space-y-4 text-sm text-brand-muted leading-relaxed">
                  {infoDialog.content}
                </div>
                <div className="mt-8">
                  <button 
                    onClick={() => setInfoDialog(null)}
                    className="w-full py-3 bg-brand-dark text-white text-xs font-semibold tracking-widest uppercase hover:bg-black transition-colors"
                  >
                    Eg forstår
                  </button>
                </div>
              </div>
            </div>
          )}

          {originalDiary && (
            <div className="w-1/2 flex flex-col border-r border-gray-200 pr-12 overflow-y-auto max-h-[calc(100vh-140px)] sticky top-[88px] opacity-70 hover:opacity-100 transition-opacity">
              <div className="text-xs font-semibold tracking-widest text-brand-accent uppercase mb-4 sticky top-0 bg-white py-2 z-10 border-b border-gray-100">
                Originalversjon ({originalDiary.language === 'en' ? 'Engelsk' : originalDiary.language === 'both' ? 'Begge' : 'Norsk'})
              </div>
              <h1 className="w-full text-4xl md:text-5xl font-serif text-brand-dark mb-8 leading-tight">
                {originalDiary.title || 'Uten tittel'}
              </h1>
              <div className="prose prose-lg brand-prose max-w-none pb-12" dangerouslySetInnerHTML={{ __html: originalDiary.content }} />
            </div>
          )}

          <div className={originalDiary ? "w-1/2 flex flex-col min-w-0" : "flex flex-col w-full"}>
            {originalDiary && (
              <div className="text-xs font-semibold tracking-widest text-brand-dark uppercase mb-4 sticky top-0 bg-white py-2 z-10 border-b border-gray-100">
                Omsetting ({diaryForm.language === 'en' ? 'Engelsk' : diaryForm.language === 'both' ? 'Begge' : 'Norsk'})
              </div>
            )}
            <TextareaAutosize 
              placeholder="Tittel (valfritt)" 
              value={diaryForm.title}
              onChange={e => setDiaryForm({...diaryForm, title: e.target.value})}
              className="w-full text-4xl md:text-5xl lg:text-6xl font-serif text-brand-dark placeholder:text-gray-200 mb-8 border-none outline-none focus:ring-0 resize-none bg-transparent leading-tight"
            />
            
            <div className="flex-grow w-full">
              <RichTextEditor content={diaryForm.content} onChange={c => setDiaryForm({...diaryForm, content: c})} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- DASHBOARD MODE ---
  const filteredArticles = articles.filter(a => {
    if (articleFilter === 'no') return a.language !== 'en';
    if (articleFilter === 'en') return a.language === 'en';
    if (articleFilter === 'draft') return !a.published;
    if (articleFilter === 'published') return a.published;
    return true;
  });

  return (
    <div className="min-h-screen py-8 md:py-16 px-4 md:px-6 max-w-[1400px] mx-auto font-sans">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-8 md:mb-12 gap-4">
        <h1 className="text-3xl md:text-4xl font-serif text-brand-dark">Kontrollpanel</h1>
        <button onClick={logout} className="text-xs md:text-sm font-semibold tracking-widest text-brand-accent hover:text-brand-dark transition-colors border border-brand-accent/20 px-4 py-2 hover:bg-brand-accent/5">LOGG UT</button>
      </div>

      {infoDialog && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
          <div className="bg-brand-surface w-full max-w-md rounded-sm p-8 relative shadow-2xl">
            <button 
              onClick={() => setInfoDialog(null)}
              className="absolute top-4 right-4 text-brand-muted hover:text-brand-dark"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="text-xl font-serif mb-4">{infoDialog.title}</h3>
            <div className="space-y-4 text-sm text-brand-muted leading-relaxed">
              {infoDialog.content}
            </div>
            <div className="mt-8">
              <button 
                onClick={() => setInfoDialog(null)}
                className="w-full py-3 bg-brand-dark text-white text-xs font-semibold tracking-widest uppercase hover:bg-black transition-colors"
              >
                Eg forstår
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-16">
        {/* SIDEBAR NAVIGATION */}
        <aside className="lg:col-span-3 xl:col-span-2">
          <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 border-b lg:border-b-0 border-gray-200">
            <button 
              onClick={() => setDashboardTab('articles')} 
              className={`text-left px-4 py-3 text-xs tracking-widest uppercase font-semibold transition-colors shrink-0 ${dashboardTab === 'articles' ? 'bg-brand-dark text-white' : 'text-brand-muted hover:text-brand-dark hover:bg-gray-50'}`}
            >
              Artiklar
            </button>
            <button 
              onClick={() => setDashboardTab('books')} 
              className={`text-left px-4 py-3 text-xs tracking-widest uppercase font-semibold transition-colors shrink-0 ${dashboardTab === 'books' ? 'bg-brand-dark text-white' : 'text-brand-muted hover:text-brand-dark hover:bg-gray-50'}`}
            >
              Bøker
            </button>
            <button 
              onClick={() => setDashboardTab('diary')} 
              className={`text-left px-4 py-3 text-xs tracking-widest uppercase font-semibold transition-colors shrink-0 ${dashboardTab === 'diary' ? 'bg-brand-dark text-white' : 'text-brand-muted hover:text-brand-dark hover:bg-gray-50'}`}
            >
              Dagbok
            </button>
            <button 
              onClick={() => setDashboardTab('files')} 
              className={`text-left px-4 py-3 text-xs tracking-widest uppercase font-semibold transition-colors shrink-0 ${dashboardTab === 'files' ? 'bg-brand-dark text-white' : 'text-brand-muted hover:text-brand-dark hover:bg-gray-50'}`}
            >
              Filer
            </button>
          </nav>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="lg:col-span-9 xl:col-span-10">
          {/* ARTICLES MANAGE */}
          {dashboardTab === 'articles' && (
            <section>
          <div className="flex flex-col md:flex-row md:justify-between md:items-end border-b border-gray-200 pb-4 mb-6 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <h2 className="text-2xl font-serif text-brand-dark mb-0">Artiklar</h2>
                <button 
                  onClick={() => setInfoDialog({
                    title: 'Artiklar',
                    content: <p>Ei oversikt over alle artiklane du har skrive. Du kan filtrere på språk eller publiseringsstatus, eller trykke «Ny Artikkel» for å byrje på ein ny tekst.</p>
                  })} 
                  className="text-gray-300 hover:text-brand-dark transition-colors"
                  title="Informasjon om artiklar"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setArticleFilter('all')} className={`text-[10px] md:text-xs font-semibold tracking-widest px-3 py-1.5 uppercase transition-colors ${articleFilter === 'all' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-brand-dark hover:bg-gray-200'}`}>Alle</button>
                <button onClick={() => setArticleFilter('no')} className={`text-[10px] md:text-xs font-semibold tracking-widest px-3 py-1.5 uppercase transition-colors ${articleFilter === 'no' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-brand-dark hover:bg-gray-200'}`}>No</button>
                <button onClick={() => setArticleFilter('en')} className={`text-[10px] md:text-xs font-semibold tracking-widest px-3 py-1.5 uppercase transition-colors ${articleFilter === 'en' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-brand-dark hover:bg-gray-200'}`}>En</button>
                <button onClick={() => setArticleFilter('published')} className={`text-[10px] md:text-xs font-semibold tracking-widest px-3 py-1.5 uppercase transition-colors hidden sm:block ${articleFilter === 'published' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-brand-dark hover:bg-gray-200'}`}>Publisert</button>
                <button onClick={() => setArticleFilter('draft')} className={`text-[10px] md:text-xs font-semibold tracking-widest px-3 py-1.5 uppercase transition-colors hidden sm:block ${articleFilter === 'draft' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-brand-dark hover:bg-gray-200'}`}>Utkast</button>
              </div>
            </div>
            <button 
              onClick={() => {
                navigate('/admin?compose=true');
              }}
              className="flex items-center text-xs font-semibold tracking-widest bg-brand-dark text-white px-5 py-2.5 hover:bg-black transition-colors shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" /> NY ARTIKKEL
            </button>
          </div>

          <div className="bg-white border border-gray-100 shadow-sm rounded-sm overflow-hidden hidden md:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-widest text-brand-muted font-semibold">
                  <th className="p-4 font-semibold">Tittel</th>
                  <th className="p-4 font-semibold w-20">Språk</th>
                  <th className="p-4 font-semibold w-24">Status</th>
                  <th className="p-4 font-semibold w-32 text-right">Handlingar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredArticles.map(article => (
                  <tr key={article.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="font-medium text-brand-dark truncate max-w-[200px] lg:max-w-[300px] xl:max-w-[400px]">
                        {article.title}
                        {article.imageUrl && <span className="text-[10px] text-brand-muted ml-2 bg-gray-100 px-1.5 py-0.5 rounded tracking-wider relative -top-[1px]">BLD</span>}
                      </div>
                    </td>
                    <td className="p-4 text-[10px] tracking-widest font-semibold uppercase text-brand-accent">
                      {article.language || 'no'}
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] tracking-widest uppercase font-semibold px-2 py-1 rounded-sm ${article.published ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                        {article.published ? 'Publisert' : 'Utkast'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-4 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {!article.translationId && (
                          <button onClick={() => createTranslation(article)} className="text-brand-accent text-xs font-semibold tracking-widest hover:text-brand-dark transition-colors">OMSETT</button>
                        )}
                        <button onClick={() => editArticle(article)} className="text-brand-dark text-xs font-semibold tracking-widest hover:text-brand-accent transition-colors">ENDRE</button>
                        <button onClick={() => deleteArticle(article.id!)} className="text-red-500 text-xs font-semibold tracking-widest hover:opacity-80 transition-opacity">SLETT</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredArticles.length === 0 && (
              <div className="p-8 text-center text-brand-muted text-sm border-t border-gray-50">Ingen artiklar funne.</div>
            )}
          </div>

          {/* Mobile version of article list */}
          <div className="space-y-3 md:hidden">
            {filteredArticles.map(article => (
              <div key={article.id} className="p-4 border border-gray-100 flex flex-col gap-3 bg-white shadow-sm">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold text-[15px] leading-snug">{article.title}</h3>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[9px] tracking-widest text-brand-accent font-semibold uppercase bg-brand-sand/50 px-1.5 py-0.5">{article.language || 'no'}</span>
                    <span className={`text-[9px] tracking-widest uppercase font-semibold px-1.5 py-0.5 ${article.published ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                      {article.published ? 'Pub' : 'Utk'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                  <div className="text-[10px] text-brand-muted uppercase">
                    {article.imageUrl && '📸 Bilde inkludert'}
                  </div>
                  <div className="flex gap-4">
                    {!article.translationId && (
                      <button onClick={() => createTranslation(article)} className="text-brand-accent text-xs font-semibold tracking-widest hover:text-brand-dark transition-colors">OMSETT</button>
                    )}
                    <button onClick={() => editArticle(article)} className="text-brand-dark text-xs font-semibold tracking-widest hover:text-brand-accent transition-colors">ENDRE</button>
                    <button onClick={() => deleteArticle(article.id!)} className="text-red-500 text-xs font-semibold tracking-widest opacity-80 hover:opacity-100">SLT</button>
                  </div>
                </div>
              </div>
            ))}
            {filteredArticles.length === 0 && (
              <div className="p-8 text-center text-brand-muted text-sm border border-gray-100 bg-white">Ingen artiklar funne.</div>
            )}
          </div>
        </section>
        )}

          {/* BOOKS MANAGE */}
          {dashboardTab === 'books' && (
            <section className="flex flex-col gap-8 max-w-2xl">
              <div>
            <div className="flex items-center gap-2 border-b border-gray-200 pb-4 mb-6">
              <h2 className="text-2xl font-serif">Bøker</h2>
              <button 
                onClick={() => setInfoDialog({
                  title: 'Bøker',
                  content: <p>Bøkene du legg til her, blir viste på ei eiga oversiktsside. Her treng du berre oppgi den viktigaste grunninformasjonen: tittel, ei kort skildring og utgjevingsår.</p>
                })} 
                className="text-gray-300 hover:text-brand-dark transition-colors"
                title="Informasjon om bøker"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={addBook} className="space-y-4 mb-8 bg-white border border-gray-100 p-5 md:p-6 shadow-sm">
              {bookForm.coverImageUrl ? (
                <div className="relative w-32 h-48 bg-gray-100 mx-auto rounded overflow-hidden group">
                  <img src={bookForm.coverImageUrl} className="w-full h-full object-cover" alt="Omslag" />
                  <button type="button" onClick={() => setBookForm({...bookForm, coverImageUrl: ''})} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">Fjern</button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowBookImagePicker(true)} className="w-full py-4 border border-dashed border-gray-300 text-sm font-semibold text-brand-muted tracking-widest hover:bg-gray-50 uppercase">Legg til omslag</button>
              )}
              
              <select 
                value={bookForm.language || 'no'}
                onChange={e => setBookForm({...bookForm, language: e.target.value as any})}
                className="w-full p-3 text-sm border border-gray-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white outline-none transition-colors"
              >
                <option value="no">Norsk</option>
                <option value="en">Engelsk</option>
                <option value="both">Begge (Norsk og Engelsk)</option>
              </select>

              {(bookForm.language === 'no' || bookForm.language === 'both') && (
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-brand-muted">Norsk innhold</h3>
                  <input 
                    type="text" placeholder="Tittel (Norsk)" required
                    value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})}
                    className="w-full p-3 text-sm border border-gray-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white outline-none transition-colors" />
                  <textarea 
                    placeholder="Skildring (Norsk)" required rows={3}
                    value={bookForm.description} onChange={e => setBookForm({...bookForm, description: e.target.value})}
                    className="w-full p-3 text-sm border border-gray-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white outline-none transition-colors resize-y min-h-[80px]"></textarea>
                  <input 
                    type="url" placeholder="Kjøpslenkje (Norsk - valfritt)"
                    value={bookForm.buyLink || ''} onChange={e => setBookForm({...bookForm, buyLink: e.target.value})}
                    className="w-full p-3 text-sm border border-gray-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white outline-none transition-colors" />
                </div>
              )}

              {bookForm.language === 'en' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-brand-muted">English content</h3>
                  <input 
                    type="text" placeholder="Title (English)" required
                    value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})}
                    className="w-full p-3 text-sm border border-gray-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white outline-none transition-colors" />
                  <textarea 
                    placeholder="Description (English)" required rows={3}
                    value={bookForm.description} onChange={e => setBookForm({...bookForm, description: e.target.value})}
                    className="w-full p-3 text-sm border border-gray-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white outline-none transition-colors resize-y min-h-[80px]"></textarea>
                  <input 
                    type="url" placeholder="Buy link (English - optional)"
                    value={bookForm.buyLink || ''} onChange={e => setBookForm({...bookForm, buyLink: e.target.value})}
                    className="w-full p-3 text-sm border border-gray-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white outline-none transition-colors" />
                </div>
              )}

              {bookForm.language === 'both' && (
                <div className="space-y-4 pt-4 border-t border-gray-100 mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-brand-muted">Engelsk innhold</h3>
                  <input 
                    type="text" placeholder="Tittel (Engelsk)" required
                    value={bookForm.titleEn || ''} onChange={e => setBookForm({...bookForm, titleEn: e.target.value})}
                    className="w-full p-3 text-sm border border-gray-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white outline-none transition-colors" />
                  <textarea 
                    placeholder="Skildring (Engelsk)" required rows={3}
                    value={bookForm.descriptionEn || ''} onChange={e => setBookForm({...bookForm, descriptionEn: e.target.value})}
                    className="w-full p-3 text-sm border border-gray-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white outline-none transition-colors resize-y min-h-[80px]"></textarea>
                  <input 
                    type="url" placeholder="Kjøpslenkje (Engelsk - valfritt)"
                    value={bookForm.buyLinkEn || ''} onChange={e => setBookForm({...bookForm, buyLinkEn: e.target.value})}
                    className="w-full p-3 text-sm border border-gray-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white outline-none transition-colors" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                <input 
                  type="number" placeholder="Utgjevingsår" required
                  value={bookForm.publishedYear || ''} onChange={e => setBookForm({...bookForm, publishedYear: parseInt(e.target.value) || 0})}
                  className="w-full p-3 text-sm border border-gray-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white outline-none transition-colors" />
                <input 
                  type="number" placeholder="Sidetal (valfritt)"
                  value={bookForm.pageCount || ''} onChange={e => setBookForm({...bookForm, pageCount: parseInt(e.target.value) || 0})}
                  className="w-full p-3 text-sm border border-gray-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white outline-none transition-colors" />
              </div>
              <input 
                type="text" placeholder="ISBN (valfritt)"
                value={bookForm.isbn || ''} onChange={e => setBookForm({...bookForm, isbn: e.target.value})}
                className="w-full p-3 text-sm border border-gray-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white outline-none transition-colors" />
              <button type="submit" className="w-full py-3 bg-brand-dark text-white uppercase tracking-widest font-semibold text-xs mt-2 hover:bg-black transition-colors">LEGG TIL BOK</button>
            </form>

            <div className="space-y-3">
              {books.map(book => (
                <div key={book.id} className="p-4 border border-gray-100 flex justify-between items-center bg-white shadow-sm group">
                  <div className="pr-4">
                    <h3 className="font-semibold text-sm">{book.title}</h3>
                    <span className="text-[11px] text-gray-500">{book.publishedYear}</span>
                  </div>
                  <button onClick={() => deleteBook(book.id!)} className="text-red-500 text-[10px] font-semibold md:opacity-0 group-hover:opacity-100 transition-opacity tracking-widest shrink-0">SLETT</button>
                </div>
              ))}
              {books.length === 0 && (
                <div className="text-sm text-brand-muted p-4 border border-gray-100 text-center">Ingen bøker lagt til enno.</div>
              )}
            </div>
            </div>
          </section>
          )}

          {/* DIARY MANAGE */}
          {dashboardTab === 'diary' && (
          <section className="lg:col-span-9 xl:col-span-10">
            <div className="max-w-4xl pt-4 lg:pt-8 pr-4 md:pr-8">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end border-b border-gray-200 pb-4 mb-6 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-3 md:mb-4">
                    <h2 className="text-2xl font-serif text-brand-dark mb-0">Dagbok</h2>
                    <button 
                      onClick={() => setInfoDialog({
                        title: 'Dagbok',
                        content: <p>Ei dagbok for kortare form-frie tankar. Visest i si eiga tidsline i grensesnittet. Du kan velje om eit oppslag skal vere på norsk, engelsk, eller synast i begge språkversjonar (Begge).</p>
                      })} 
                      className="text-gray-300 hover:text-brand-dark transition-colors"
                      title="Informasjon om dagbok"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    navigate('/admin?compose_diary=true');
                  }}
                  className="flex items-center text-xs font-semibold tracking-widest bg-brand-dark text-white px-5 py-2.5 hover:bg-black transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4 mr-2" /> NYTT OPPSLAG
                </button>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-sm overflow-hidden hidden md:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-widest text-brand-muted font-semibold">
                      <th className="p-4 font-semibold">Tittel</th>
                      <th className="p-4 font-semibold w-24">Språk</th>
                      <th className="p-4 font-semibold w-32 text-right">Handlingar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diaries.map(entry => (
                      <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                        <td className="p-4">
                          <div className="font-semibold text-sm mb-1">{entry.title || 'Uten tittel'}</div>
                          <div className="text-xs text-gray-400 line-clamp-1" dangerouslySetInnerHTML={{ __html: entry.content.replace(/<img[^>]*>|<figure[^>]*>.*?<\/figure>|<figcaption[^>]*>.*?<\/figcaption>/ig, '') }} />
                        </td>
                        <td className="p-4">
                          <span className="text-[10px] font-semibold text-brand-accent bg-brand-accent/10 px-2 py-1 rounded-sm uppercase tracking-widest">
                            {entry.language === 'both' ? 'Begge' : entry.language === 'en' ? 'Engelsk' : 'Norsk'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-3">
                          {!entry.translationId && entry.language !== 'both' && (
                            <button onClick={() => createDiaryTranslation(entry)} className="text-brand-accent text-xs font-semibold tracking-widest opacity-80 hover:opacity-100 transition-opacity">OMSETT</button>
                          )}
                          <button onClick={() => navigate(`/admin?edit_diary=${entry.id}`)} className="text-brand-dark text-xs font-semibold tracking-widest opacity-80 hover:opacity-100 transition-opacity">REDIGER</button>
                          <button onClick={() => deleteDiary(entry.id!)} className="text-red-500 text-xs font-semibold tracking-widest opacity-80 hover:opacity-100 transition-opacity">SLETT</button>
                        </td>
                      </tr>
                    ))}
                    {diaries.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-sm text-brand-muted">Ingen dagbokoppslag lagt til enno.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden space-y-3">
                {diaries.map(entry => (
                  <div key={entry.id} className="p-4 border border-gray-100 flex justify-between items-start bg-white shadow-sm group">
                    <div className="pr-4 flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-sm uppercase tracking-widest">
                          {entry.language === 'both' ? 'Begge' : entry.language === 'en' ? 'Engelsk' : 'Norsk'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm">{entry.title || 'Uten tittel'}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: entry.content.replace(/<img[^>]*>|<figure[^>]*>.*?<\/figure>|<figcaption[^>]*>.*?<\/figcaption>/ig, '') }} />
                    </div>
                    <div className="flex flex-col gap-2 shrink-0 items-end">
                      {!entry.translationId && entry.language !== 'both' && (
                        <button onClick={() => createDiaryTranslation(entry)} className="text-brand-accent text-[10px] font-semibold md:opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">OMSETT</button>
                      )}
                      <button onClick={() => navigate(`/admin?edit_diary=${entry.id}`)} className="text-brand-dark text-[10px] font-semibold md:opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">REDIGER</button>
                      <button onClick={() => deleteDiary(entry.id!)} className="text-red-500 text-[10px] font-semibold md:opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">SLETT</button>
                    </div>
                  </div>
                ))}
                {diaries.length === 0 && (
                  <div className="text-sm text-brand-muted p-4 border border-gray-100 text-center">Ingen dagbokoppslag lagt til enno.</div>
                )}
              </div>
            </div>
          </section>
          )}

          {/* FILES MANAGE */}
          {dashboardTab === 'files' && (
          <div className="pt-4 lg:pt-8 bg-white md:bg-transparent max-w-5xl">
            {/* The FileManager component already handles its own layout, but we can contain it */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-4 mb-6">
              <h2 className="text-2xl font-serif">Filer</h2>
              <button 
                onClick={() => setInfoDialog({
                  title: 'Filer og bildebehandling',
                  content: <p>Filhandsamaren lèt deg laste opp dine eigne bilete eller søke direkte på Unsplash. Alle bilete opplasta her er tilgjengelege anten som omslagsbilete på artiklar eller inne i sjølve teksten ved hjelp av bilde-knappen i redigeringsverktøyet.</p>
                })} 
                className="text-gray-300 hover:text-brand-dark transition-colors"
                title="Informasjon om filhandsaming"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            <FileManager />
          </div>
          )}

          {showBookImagePicker && (
            <ImagePickerModal 
              onClose={() => setShowBookImagePicker(false)} 
              onSelect={(url) => {
                setBookForm({...bookForm, coverImageUrl: url});
                setShowBookImagePicker(false);
              }}
            />
          )}

          {confirmDialog && (
            <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
              <div className="bg-brand-surface w-full max-w-sm rounded-sm p-8 relative shadow-2xl">
                <h3 className="text-xl font-serif mb-4 text-brand-dark">{confirmDialog.title}</h3>
                <p className="text-sm text-brand-muted mb-8 line-clamp-3">
                  {confirmDialog.message}
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={confirmDialog.onConfirm}
                    className="flex-1 py-3 bg-red-600 text-white text-xs font-semibold tracking-widest uppercase hover:bg-red-700 transition-colors"
                  >
                    Slett
                  </button>
                  <button 
                    onClick={() => setConfirmDialog(null)}
                    className="flex-1 py-3 border border-gray-200 text-brand-muted text-xs font-semibold tracking-widest uppercase hover:bg-gray-50 transition-colors"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
