import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy, updateDoc, getDoc, getDocFromCache } from 'firebase/firestore';
import { invalidateCache, getCachedDocs, subscribeToStats, stats } from '../lib/dbCache';
import TextareaAutosize from 'react-textarea-autosize';
import RichTextEditor from '../components/RichTextEditor';
import { ArrowLeft, Plus, Info, Save, Sparkles, ExternalLink, CreditCard, Music, Upload, Volume2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

import FileManager from '../components/FileManager';
import ImagePickerModal from '../components/ImagePickerModal';
import BackupManager from '../components/BackupManager';
import BookPromoManager from '../components/BookPromoManager';
import ChangeRequestManager from '../components/ChangeRequestManager';
import { getBuyLinkType, slugify } from '../lib/utils';
import { Song } from '../types';
import {
  fetchAllSongs,
  fetchSongBySlugOrId,
  saveSongDocument,
  deleteSongDocument,
  uploadSongAudio,
  resolvePlayableAudioUrl,
  formatDuration,
  detectAudioFormat
} from '../lib/songService';

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
  price?: number;
  promoActive?: boolean;
  promoSlug?: string;
  promoHeadline?: string;
  promoBadge?: string;
  promoDescription?: string;
  promoExcerpt?: string;
  promoHighlights?: string[];
  promoQuotes?: { quote: string; author?: string; source?: string }[];
  promoDirectSale?: boolean;
  promoSpecialPrice?: number;
  promoShippingText?: string;
}

interface Order {
  id?: string;
  bookId: string;
  bookTitle: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: string;
  createdAt: any;
}

interface AboutSettings {
  bioNo: string;
  bioEn: string;
  shortBioNo: string;
  shortBioEn: string;
  imageUrl: string;
}

interface DiaryEntry {
  id?: string;
  title: string;
  content: string;
  published?: boolean;
  language: 'no' | 'en' | 'both';
  translationId?: string;
  slug?: string;
  imageUrl?: string;
  imageCaption?: string;
}

interface GalleryPhoto {
  id?: string;
  src: string;
  alt: string;
  className?: string;
  createdAt?: any;
}

const DEFAULT_SONG_FORM: Omit<Song, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  slug: '',
  lyrics: '',
  description: '',
  genre: 'Viser',
  releaseYear: new Date().getFullYear(),
  coverImageUrl: '',
  coverImageCaption: '',
  audioUrl: '',
  audioFormat: 'mp3',
  audioFileName: '',
  durationSeconds: 0,
  allowDownload: false,
  published: true,
  language: 'no',
  translationId: ''
};

export default function Admin() {
  const { user, isAdmin, signInWithGoogle, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [visitors, setVisitors] = useState<number>(0);
  const [pageStats, setPageStats] = useState<any[]>([]);
  
  const [isComposing, setIsComposing] = useState(false);
  const [isComposingDiary, setIsComposingDiary] = useState(false);
  const [isComposingSong, setIsComposingSong] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showBookImagePicker, setShowBookImagePicker] = useState(false);
  const [showGalleryImagePicker, setShowGalleryImagePicker] = useState(false);
  const [showSongImagePicker, setShowSongImagePicker] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [originalArticle, setOriginalArticle] = useState<Article | null>(null);
  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null);
  const [originalDiary, setOriginalDiary] = useState<DiaryEntry | null>(null);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [originalSong, setOriginalSong] = useState<Song | null>(null);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [photoForm, setPhotoForm] = useState({ src: '', alt: '' });
  const [articleFilter, setArticleFilter] = useState('all');
  const [diaryFilter, setDiaryFilter] = useState('all');
  const [songFilter, setSongFilter] = useState('all');
  const [articleForm, setArticleForm] = useState({ title: '', content: '', published: true, language: 'no', slug: '', imageUrl: '', imageCaption: '', translationId: '' });
  const [songForm, setSongForm] = useState<Omit<Song, 'id' | 'createdAt' | 'updatedAt'>>(DEFAULT_SONG_FORM);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [audioUploadProgress, setAudioUploadProgress] = useState<number>(0);
  const [audioUploadStatus, setAudioUploadStatus] = useState<string>('');
  const [audioUploadError, setAudioUploadError] = useState<string | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string>('');
  const [infoDialog, setInfoDialog] = useState<{title: string, content: React.ReactNode} | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'articles' | 'books' | 'promo' | 'diary' | 'music' | 'files' | 'about' | 'photos' | 'orders' | 'backup' | 'requests'>('overview');
  const [promoTargetBookId, setPromoTargetBookId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [bookForm, setBookForm] = useState<Book>({ title: '', description: '', publishedYear: new Date().getFullYear(), coverImageUrl: '', isbn: '', buyLink: '', pageCount: 0, language: 'no', titleEn: '', descriptionEn: '', buyLinkEn: '', price: 0 });

  const [diaryForm, setDiaryForm] = useState<DiaryEntry>({ title: '', content: '', published: true, language: 'both', slug: '', imageUrl: '', imageCaption: '' });
  const [aboutForm, setAboutForm] = useState<AboutSettings>({ bioNo: '', bioEn: '', shortBioNo: '', shortBioEn: '', imageUrl: '' });
  const [currentStats, setCurrentStats] = useState(stats);

  useEffect(() => {
    const unsubscribe = subscribeToStats(() => {
      setCurrentStats({ ...stats });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (songForm.audioUrl) {
      resolvePlayableAudioUrl(songForm.audioUrl)
        .then((url) => setPreviewAudioUrl(url))
        .catch(() => setPreviewAudioUrl(''));
    } else {
      setPreviewAudioUrl('');
    }
  }, [songForm.audioUrl]);

  useEffect(() => {
    if (user) {
      const params = new URLSearchParams(location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'books' || tabParam === 'promo' || tabParam === 'files' || tabParam === 'articles' || tabParam === 'diary' || tabParam === 'music' || tabParam === 'about' || tabParam === 'photos' || tabParam === 'orders' || tabParam === 'backup' || tabParam === 'requests') {
        setDashboardTab(tabParam as any);
      }

      const targetBookParam = params.get('targetBook');
      if (targetBookParam) {
        setDashboardTab('books');
        setPromoTargetBookId(targetBookParam);
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
        setDiaryForm({ title: '', content: '', published: true, language: 'both', translationId: '', slug: '', imageUrl: '', imageCaption: '' });
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
              published: data.published ?? true,
              language: data.language || 'both',
              translationId: data.translationId || '',
              slug: data.slug || '',
              imageUrl: data.imageUrl || '',
              imageCaption: data.imageCaption || ''
            });
            setIsComposingDiary(true);
          }
        });
      } else if (params.get('compose_song') === 'true') {
        const lang = params.get('lang') || 'no';
        setEditingSongId(null);
        setOriginalSong(null);
        setAudioUploadError(null);
        setSongForm({ ...DEFAULT_SONG_FORM, language: lang });
        setIsComposingSong(true);
      } else if (params.get('edit_song')) {
        const editId = params.get('edit_song')!;
        fetchSongBySlugOrId(editId, true).then((found) => {
          if (found) {
            setEditingSongId(found.id || editId);
            setAudioUploadError(null);
            setSongForm({
              title: found.title || '',
              slug: found.slug || '',
              lyrics: found.lyrics || '',
              description: found.description || '',
              genre: found.genre || 'Viser',
              releaseYear: found.releaseYear || new Date().getFullYear(),
              coverImageUrl: found.coverImageUrl || '',
              coverImageCaption: found.coverImageCaption || '',
              audioUrl: found.audioUrl || '',
              audioFormat: found.audioFormat || 'mp3',
              audioFileName: found.audioFileName || '',
              durationSeconds: found.durationSeconds || 0,
              allowDownload: Boolean(found.allowDownload),
              published: found.published ?? true,
              language: found.language || 'no',
              translationId: found.translationId || ''
            });
            setIsComposingSong(true);
          }
        });
      }
    }
  }, [user, location.search, navigate]);

  const loadData = async () => {
    try {
      try {
        const articlesSnap = await getCachedDocs(query(collection(db, 'articles'), orderBy('createdAt', 'desc')), "articles_all");
        setArticles(articlesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Article)));
      } catch (e) {
        console.warn("Could not load articles:", e);
      }

      try {
        const booksSnap = await getCachedDocs(query(collection(db, 'books'), orderBy('createdAt', 'desc')), "books_all");
        setBooks(booksSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Book)));
      } catch (e) {
        console.warn("Could not load books:", e);
      }

      try {
        const diariesSnap = await getCachedDocs(query(collection(db, 'diary'), orderBy('createdAt', 'desc')), "diary_all");
        setDiaries(diariesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as DiaryEntry)));
      } catch (e) {
        console.warn("Could not load diaries:", e);
      }

      try {
        const loadedSongs = await fetchAllSongs(true);
        setSongs(loadedSongs);
      } catch (e) {
        console.warn("Could not load songs:", e);
      }
      
      try {
        const gallerySnap = await getCachedDocs(query(collection(db, 'gallery'), orderBy('createdAt', 'desc')), "gallery_all");
        setGalleryPhotos(gallerySnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as GalleryPhoto)));
      } catch (e) {
        console.warn("Could not load gallery:", e);
      }
      
      try {
        const ordersSnap = await getCachedDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), "orders_all");
        setOrders(ordersSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Order)));
      } catch (e) {
        console.warn("Could not load orders:", e);
      }
      
      try {
        let aboutDoc: any = null;
        try {
          aboutDoc = await getDoc(doc(db, 'settings', 'about'));
        } catch (err) {
          aboutDoc = await getDocFromCache(doc(db, 'settings', 'about'));
        }
        if (aboutDoc && aboutDoc.exists()) {
          setAboutForm(aboutDoc.data() as AboutSettings);
        }
      } catch (e) {
        console.warn("Could not load about settings:", e);
      }

      try {
        let statsDoc: any = null;
        try {
          statsDoc = await getDoc(doc(db, 'stats', 'visitors'));
        } catch (err) {
          statsDoc = await getDocFromCache(doc(db, 'stats', 'visitors'));
        }
        if (statsDoc && statsDoc.exists()) {
          setVisitors(statsDoc.data().count || 0);
        }
      } catch (e) {
        console.warn("Could not load stats:", e);
      }

      try {
        const pageStatsSnap = await getCachedDocs(query(collection(db, 'pageStats')), "pageStats_all");
        setPageStats(pageStatsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
      } catch (e) {
        console.warn("Could not load pageStats:", e);
      }
    } catch (e) {
      console.error("Failed to load data", e);
    }
  };

  const saveAboutSettings = async () => {
    if (!user || isSaving) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'settings', 'about'), {
        ...aboutForm
      }).catch(async (e) => {
        // if doesn't exist, set it
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'settings', 'about'), { ...aboutForm });
      });
      setInfoDialog({
        title: "Lagret",
        content: <p>Om-meg informasjonen er lagret.</p>
      });
    } catch (e) {
      console.error("Feil ved lagring av innstillinger:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const saveGalleryPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoForm.src.trim() || !user || isSaving) return;
    setIsSaving(true);
    try {
      const { serverTimestamp } = await import('firebase/firestore');
      if (editingPhotoId) {
        await updateDoc(doc(db, 'gallery', editingPhotoId), {
          src: photoForm.src,
          alt: photoForm.alt || 'Galleribilde'
        });
        setEditingPhotoId(null);
        setPhotoForm({ src: '', alt: '' });
        setInfoDialog({
          title: "Bilde oppdatert",
          content: <p>Bildet har blitt oppdatert.</p>
        });
      } else {
        await addDoc(collection(db, 'gallery'), {
          src: photoForm.src,
          alt: photoForm.alt || 'Galleribilde',
          createdAt: serverTimestamp()
        });
        setPhotoForm({ src: '', alt: '' });
        setInfoDialog({
          title: "Bilde lagt til",
          content: <p>Bildet er lagt til i Foto & Natur-galleriet.</p>
        });
      }
      invalidateCache(); loadData();
    } catch (err) {
      console.error("Klarte ikkje å lagre bilde", err);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteGalleryPhoto = async (id: string) => {
    if (!user) return;
    setConfirmDialog({
      title: 'Slett bilde',
      message: 'Er du sikker på at du vil slette dette bildet frå galleriet?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'gallery', id));
          setConfirmDialog(null);
          invalidateCache(); loadData();
        } catch (err) {
          console.error("Klarte ikkje å slette bilde", err);
        }
      }
    });
  };

  const saveArticle = async () => {
    if (!user || isSaving) return;
    setIsSaving(true);
    if (!articleForm.title || !articleForm.content) {
      console.error("Please provide a title and meaningful content.");
      setIsSaving(false);
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
          translationId: newArticleId,
          updatedAt: serverTimestamp()
        });
      }

      setArticleForm({ title: '', content: '', published: true, language: 'no', slug: '', imageUrl: '', imageCaption: '', translationId: '' });
      setEditingArticleId(null);
      setOriginalArticle(null);
      setIsComposing(false);
      navigate('/admin');
      invalidateCache(); loadData();
    } catch (e) {
      console.error("Feil ved lagring av artikkel. Er du sikker på at du er administrator? Error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const editArticle = (article: Article) => {
    navigate(`/admin?edit=${article.id}`);
  };

  const editBook = (book: Book) => {
    setBookForm({
      title: book.title || '',
      description: book.description || '',
      publishedYear: book.publishedYear || new Date().getFullYear(),
      coverImageUrl: book.coverImageUrl || '',
      isbn: book.isbn || '',
      buyLink: book.buyLink || '',
      pageCount: book.pageCount || 0,
      language: book.language || 'no',
      titleEn: book.titleEn || '',
      descriptionEn: book.descriptionEn || '',
      buyLinkEn: book.buyLinkEn || '',
      price: book.price || 0
    });
    setEditingBookId(book.id || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;
    setIsSaving(true);
    try {
      const bookData = {
        ...bookForm,
        publishedYear: Number(bookForm.publishedYear),
        price: Number(bookForm.price || 0),
        buyLink: (bookForm.buyLink || '').trim(),
        buyLinkEn: (bookForm.buyLinkEn || '').trim(),
        updatedAt: serverTimestamp()
      };

      if (editingBookId) {
        await updateDoc(doc(db, 'books', editingBookId), bookData);
      } else {
        await addDoc(collection(db, 'books'), {
          ...bookData,
          authorId: user.uid,
          createdAt: serverTimestamp(),
        });
      }
      setBookForm({ title: '', description: '', publishedYear: new Date().getFullYear(), coverImageUrl: '', isbn: '', buyLink: '', pageCount: 0, language: 'no', titleEn: '', descriptionEn: '', buyLinkEn: '', price: 0 });
      setEditingBookId(null);
      invalidateCache(); loadData();
    } catch (e) {
      console.error("Feil ved lagring av bok. Er du sikker på at du er administrator? Error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const createTranslation = (article: Article) => {
    const targetLang = (article.language || 'no') === 'no' ? 'en' : 'no';
    
    let translatedCaption = article.imageCaption || '';
    if (translatedCaption) {
      if (targetLang === 'en') {
        translatedCaption = translatedCaption.replace('Bilde av', 'Photo by').replace(' på ', ' on ').replace(' frå ', ' from ');
      } else {
        translatedCaption = translatedCaption.replace('Photo by', 'Bilde av').replace(' on ', ' på ').replace(' from ', ' frå ');
      }
    }
    
    setEditingArticleId(null);
    setArticleForm({
      title: `${article.title} (${targetLang.toUpperCase()})`,
      content: '', // Let them translate the content manually or could prefill
      published: false,
      language: targetLang,
      slug: '',
      imageUrl: article.imageUrl || '',
      imageCaption: translatedCaption,
      translationId: article.id
    });
    setOriginalArticle(article);
    setIsComposing(true);
  };

  const deleteArticle = async (id: string) => {
    setConfirmDialog({
      title: 'Slett artikkel',
      message: 'Er du sikker på at du vil slette denne artikkelen?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'articles', id));
          invalidateCache(); loadData();
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
          invalidateCache(); loadData();
        } catch (e) {
          console.error(e);
        }
        setConfirmDialog(null);
      }
    });
  };

  const saveDiary = async () => {
    if (!user || isSaving) return;
    setIsSaving(true);
    try {
      const diaryData: any = {
        title: diaryForm.title,
        content: diaryForm.content,
        published: diaryForm.published ?? true,
        language: diaryForm.language,
        slug: diaryForm.slug || diaryForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        imageUrl: diaryForm.imageUrl || '',
        imageCaption: diaryForm.imageCaption || '',
        translationId: diaryForm.translationId || '',
        updatedAt: serverTimestamp()
      };

      let newDiaryId = editingDiaryId;
      if (editingDiaryId) {
         await updateDoc(doc(db, 'diary', editingDiaryId), diaryData);
      } else {
         const docRef = await addDoc(collection(db, 'diary'), {
           ...diaryData,
           authorId: user.uid,
           createdAt: serverTimestamp(),
         });
         newDiaryId = docRef.id;
      }
      
      if (diaryForm.translationId && newDiaryId) {
        await updateDoc(doc(db, 'diary', diaryForm.translationId), {
          translationId: newDiaryId,
          updatedAt: serverTimestamp()
        });
      }

      setDiaryForm({ title: '', content: '', published: true, language: 'both', slug: '', imageUrl: '', imageCaption: '' });
      setEditingDiaryId(null);
      setOriginalDiary(null);
      setIsComposingDiary(false);
      navigate('/admin?tab=diary');
      invalidateCache(); loadData();
    } catch (e) {
      console.error("Feil ved lagring av dagbok. Er du sikker på at du er administrator? Error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const createDiaryTranslation = (diary: DiaryEntry) => {
    const targetLang = (diary.language || 'no') === 'no' ? 'en' : 'no';
    setEditingDiaryId(null);
    setDiaryForm({
      title: `${diary.title ? diary.title + ' ' : ''}(${targetLang.toUpperCase()})`,
      content: '', // manual translation
      published: false,
      language: targetLang,
      translationId: diary.id,
      slug: '',
      imageUrl: diary.imageUrl || '',
      imageCaption: diary.imageCaption || ''
    });
    setOriginalDiary(diary);
    setIsComposingDiary(true);
  };

  const deleteDiary = async (id: string) => {
    setConfirmDialog({
      title: 'Slett dagbokoppslag',
      message: 'Er du sikker på at du vil slette dette oppslaget?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'diary', id));
          invalidateCache(); loadData();
        } catch (e) {
          console.error("Feil ved sletting av oppslag. Mangler rettigheter. Error:", e);
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioUploadError(null);
    setIsUploadingAudio(true);
    setAudioUploadProgress(5);
    setAudioUploadStatus('Førebur lydopplasting...');

    try {
      const result = await uploadSongAudio(file, (pct, statusText) => {
        setAudioUploadProgress(pct);
        setAudioUploadStatus(statusText);
      });

      setSongForm((prev) => ({
        ...prev,
        audioUrl: result.audioUrl,
        audioFormat: result.audioFormat,
        audioFileName: result.audioFileName,
        durationSeconds: result.durationSeconds || prev.durationSeconds || 0,
        title: prev.title || file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ')
      }));
    } catch (err: any) {
      console.error('Feil ved opplasting av lydfil:', err);
      setAudioUploadError(err?.message || 'Klarte ikkje å laste opp lydfila.');
    } finally {
      setIsUploadingAudio(false);
      e.target.value = '';
    }
  };

  const saveSong = async () => {
    if (!user || isSaving) return;
    if (!songForm.title.trim()) {
      setInfoDialog({
        title: 'Mangler songtittel',
        content: <p>Skriv inn ein tittel på songen før du lagrar.</p>
      });
      return;
    }

    setIsSaving(true);
    try {
      const computedSlug = songForm.slug?.trim()
        ? slugify(songForm.slug.trim())
        : slugify(songForm.title.trim());

      const savedId = await saveSongDocument(
        {
          ...songForm,
          slug: computedSlug,
          audioFormat: songForm.audioUrl
            ? detectAudioFormat(songForm.audioFileName || songForm.audioUrl)
            : songForm.audioFormat || 'mp3'
        },
        editingSongId
      );

      if (songForm.translationId && savedId) {
        const transSong = songs.find((s) => s.id === songForm.translationId);
        if (transSong) {
          await saveSongDocument(
            {
              ...transSong,
              translationId: savedId
            },
            transSong.id
          );
        }
      }

      setSongForm(DEFAULT_SONG_FORM);
      setEditingSongId(null);
      setOriginalSong(null);
      setIsComposingSong(false);
      navigate('/admin?tab=music');
      await loadData();
    } catch (err: any) {
      console.error('Feil ved lagring av song:', err);
      setInfoDialog({
        title: 'Feil ved lagring',
        content: <p>Kunne ikkje lagre songen: {err?.message || 'Ukjend feil'}</p>
      });
    } finally {
      setIsSaving(false);
    }
  };

  const createSongTranslation = (song: Song) => {
    const targetLang = (song.language || 'no') === 'no' ? 'en' : 'no';
    setEditingSongId(null);
    setAudioUploadError(null);
    setSongForm({
      title: `${song.title} (${targetLang.toUpperCase()})`,
      slug: '',
      lyrics: '',
      description: song.description || '',
      genre: song.genre || 'Viser',
      releaseYear: song.releaseYear || new Date().getFullYear(),
      coverImageUrl: song.coverImageUrl || '',
      coverImageCaption: song.coverImageCaption || '',
      audioUrl: song.audioUrl || '',
      audioFormat: song.audioFormat || 'mp3',
      audioFileName: song.audioFileName || '',
      durationSeconds: song.durationSeconds || 0,
      allowDownload: Boolean(song.allowDownload),
      published: false,
      language: targetLang,
      translationId: song.id || ''
    });
    setOriginalSong(song);
    setIsComposingSong(true);
  };

  const deleteSong = async (id: string) => {
    setConfirmDialog({
      title: 'Slett song',
      message: 'Er du sikker på at du vil slette denne songen og tilhøyrande songtekst?',
      onConfirm: async () => {
        try {
          await deleteSongDocument(id);
          await loadData();
        } catch (err) {
          console.error('Feil ved sletting av song:', err);
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen py-32 px-6 flex flex-col items-center justify-center text-center max-w-md mx-auto">
        <h1 className="text-3xl font-serif mb-4">Ingen tilgang</h1>
        <p className="text-sm text-brand-dark/70 font-sans mb-3">
          Kontoen din har ikkje administratorrettigheiter for dette nettstaden.
        </p>
        <p className="text-xs text-brand-muted font-mono bg-gray-50 py-1.5 px-3 rounded mb-6 break-all">
          {user.email}
        </p>
        <button onClick={logout} className="px-6 py-3 bg-brand-dark text-white text-xs tracking-widest uppercase hover:bg-black transition-colors">
          Logg ut / Byt konto
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
            
            <button onClick={saveArticle} disabled={isSaving} className={`px-6 py-2.5 text-white text-xs font-semibold tracking-widest transition-colors ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-dark hover:bg-black'}`}>
              {isSaving ? 'LAGRAR...' : (editingArticleId ? 'OPPDATER' : 'PUBLISER')}
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
                <>
                  <div className="w-full mb-8 bg-gray-50 flex items-center justify-center p-4 border border-gray-100">
                    <img src={originalArticle.imageUrl} className="w-full h-auto max-h-[400px] object-contain rounded-sm" />
                  </div>
                  {originalArticle.imageCaption && <p className="text-sm text-center text-brand-muted mb-8 italic" dangerouslySetInnerHTML={{ __html: originalArticle.imageCaption }} />}
                </>
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
                <div className="w-full h-[50vh] min-h-[400px] bg-gray-50 border border-gray-100 flex items-center justify-center p-4 relative">
                  <img loading="lazy" src={articleForm.imageUrl} alt="Cover" className="w-full h-full object-contain" />
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
            
            <div className="flex items-center gap-1 group">
              <label className="flex items-center space-x-2 text-xs font-medium tracking-widest uppercase cursor-pointer">
                <input type="checkbox" checked={diaryForm.published} onChange={e => setDiaryForm({...diaryForm, published: e.target.checked})} className="accent-brand-accent w-3 h-3" />
                <span>{diaryForm.published ? 'Publisert' : 'Utkast'}</span>
              </label>
              <button 
                onClick={() => setInfoDialog({
                  title: 'Publiseringsstatus',
                  content: <p>Dersom <strong>Utkast</strong> er valt, vil oppslaget berre vere synleg her i kontrollpanelet. Set han til <strong>Publisert</strong> for å gjere han synleg i dagboka.</p>
                })} 
                className="text-gray-300 hover:text-brand-dark transition-colors mr-3 md:mr-4"
                title="Informasjon om status"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            
            <button onClick={saveDiary} disabled={isSaving} className={`px-6 py-2.5 text-white text-xs font-semibold tracking-widest transition-colors ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-dark hover:bg-black'}`}>
              {isSaving ? 'LAGRAR...' : (editingDiaryId ? 'OPPDATER' : 'PUBLISER I DAGBOK')}
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
              {originalDiary.imageUrl && (
                <>
                  <div className="w-full mb-8 bg-gray-50 flex items-center justify-center p-4 border border-gray-100">
                    <img src={originalDiary.imageUrl} className="w-full h-auto max-h-[400px] object-contain rounded-sm" />
                  </div>
                  {originalDiary.imageCaption && <p className="text-sm text-center text-brand-muted mb-8 italic" dangerouslySetInnerHTML={{ __html: originalDiary.imageCaption }} />}
                </>
              )}
              <div className="prose prose-lg brand-prose max-w-none pb-12" dangerouslySetInnerHTML={{ __html: originalDiary.content }} />
            </div>
          )}

          <div className={originalDiary ? "w-1/2 flex flex-col min-w-0" : "flex flex-col w-full"}>
            {originalDiary && (
              <div className="text-xs font-semibold tracking-widest text-brand-dark uppercase mb-4 sticky top-0 bg-white py-2 z-10 border-b border-gray-100">
                Omsetting ({diaryForm.language === 'en' ? 'Engelsk' : diaryForm.language === 'both' ? 'Begge' : 'Norsk'})
              </div>
            )}
            <div className="flex items-center gap-2 mb-4 w-full group">
              <input 
                type="text" 
                placeholder="Eigendefinert slug (valfritt)" 
                value={diaryForm.slug || ''} 
                onChange={e => setDiaryForm({...diaryForm, slug: e.target.value})}
                className="w-full text-xs font-sans text-brand-muted placeholder:text-gray-300 border-none outline-none focus:ring-0 bg-transparent"
              />
              <button 
                onClick={() => setInfoDialog({
                  title: 'Kva er ein URL-slug for dagboka?',
                  content: (
                    <>
                      <p>Ein <strong>slug</strong> er den delen av ei nettadresse (URL) som identifiserer akkurat di side i ei leseleg form.</p>
                      <p>Når du lagar eit oppslag, blir sluggen automatisk generert basert på tittelen. Du kan endre han no for å gjere lenka kortare.</p>
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
              placeholder="Tittel (valfritt)" 
              value={diaryForm.title}
              onChange={e => setDiaryForm({...diaryForm, title: e.target.value})}
              className="w-full text-4xl md:text-5xl lg:text-6xl font-serif text-brand-dark placeholder:text-gray-200 mb-8 border-none outline-none focus:ring-0 resize-none bg-transparent leading-tight"
            />
            
            {diaryForm.imageUrl ? (
              <div className="w-full mb-12 relative group rounded-md">
                <div className="w-full h-[50vh] min-h-[400px] bg-gray-50 border border-gray-100 flex items-center justify-center p-4 relative">
                  <img loading="lazy" src={diaryForm.imageUrl} alt="Cover" className="w-full h-full object-contain" />
                  <button 
                    onClick={() => setDiaryForm({...diaryForm, imageUrl: '', imageCaption: ''})} 
                    className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1.5 text-xs font-semibold tracking-widest uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  >
                    Fjern bilde
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2 w-full max-w-lg mx-auto group relative">
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={e => setDiaryForm({...diaryForm, imageCaption: e.currentTarget.innerHTML})}
                    className="w-full text-sm text-center text-brand-muted bg-transparent border-none outline-none focus:ring-0 placeholder:text-gray-300 italic pr-8 empty:before:content-['Bilettekst_(valfritt)'] empty:before:text-gray-300 focus:empty:before:content-['']"
                    dangerouslySetInnerHTML={{ __html: diaryForm.imageCaption || '' }}
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
              <RichTextEditor content={diaryForm.content} onChange={c => setDiaryForm({...diaryForm, content: c})} />
            </div>

            {showImagePicker && (
              <ImagePickerModal 
                language={diaryForm.language}
                onClose={() => setShowImagePicker(false)} 
                onSelect={(url, caption) => {
                  setDiaryForm({...diaryForm, imageUrl: url, imageCaption: caption || diaryForm.imageCaption});
                }}
              />
            )}
          </div>
        </main>
      </div>
    );
  }

  // --- FULL-SCREEN SONG COMPOSER MODE ---
  if (isComposingSong) {
    const genrePresets = ['Viser', 'Ballade', 'Pop/Rock', 'Folk', 'Instrumentalt', 'Salme'];

    return (
      <div className="min-h-screen bg-white flex flex-col font-sans">
        <header className="border-b border-gray-100 py-4 px-4 md:px-6 flex flex-wrap justify-between items-center gap-4 sticky top-0 bg-white/95 backdrop-blur z-50">
          <button
            onClick={() => {
              setIsComposingSong(false);
              setOriginalSong(null);
              navigate('/admin?tab=music');
            }}
            className="flex items-center text-xs font-semibold tracking-widest text-brand-muted hover:text-brand-dark uppercase transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Avbryt
          </button>

          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <div className="flex items-center gap-1">
              <select
                value={songForm.language || 'no'}
                onChange={(e) => setSongForm({ ...songForm, language: e.target.value as any })}
                className="text-xs font-semibold tracking-widest uppercase border border-gray-200 px-3 py-2 bg-gray-50 outline-none focus:border-brand-accent"
              >
                <option value="no">Norsk</option>
                <option value="en">Engelsk</option>
                <option value="both">Begge språk</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <select
                value={songForm.translationId || ''}
                onChange={(e) => setSongForm({ ...songForm, translationId: e.target.value })}
                className="text-xs font-semibold tracking-widest border border-gray-200 px-3 py-2 bg-gray-50 outline-none focus:border-brand-accent max-w-[180px]"
              >
                <option value="">Ingen omsetjing lenka</option>
                {songs
                  .filter(
                    (s) =>
                      s.language !== songForm.language &&
                      s.id !== editingSongId &&
                      s.language !== 'both'
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      Lenke til: {s.title || 'Utan tittel'}
                    </option>
                  ))}
              </select>
            </div>

            <label className="flex items-center space-x-2 text-xs font-medium tracking-widest uppercase cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(songForm.allowDownload)}
                onChange={(e) => setSongForm({ ...songForm, allowDownload: e.target.checked })}
                className="accent-brand-accent w-3.5 h-3.5"
              />
              <span>Tillat nedlasting</span>
            </label>

            <label className="flex items-center space-x-2 text-xs font-medium tracking-widest uppercase cursor-pointer">
              <input
                type="checkbox"
                checked={songForm.published}
                onChange={(e) => setSongForm({ ...songForm, published: e.target.checked })}
                className="accent-brand-accent w-3.5 h-3.5"
              />
              <span>{songForm.published ? 'Publisert' : 'Utkast'}</span>
            </label>

            <button
              onClick={saveSong}
              disabled={isSaving || isUploadingAudio}
              className={`px-6 py-2.5 text-white text-xs font-semibold tracking-widest uppercase transition-colors ${
                isSaving || isUploadingAudio
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-brand-dark hover:bg-black'
              }`}
            >
              {isSaving ? 'LAGRAR...' : editingSongId ? 'OPPDATER SONG' : 'PUBLISER SONG'}
            </button>
          </div>
        </header>

        <main
          className={`flex-grow w-full py-12 relative flex ${
            originalSong ? 'max-w-[1600px] px-8 mx-auto gap-12' : 'max-w-3xl px-6 mx-auto flex-col'
          }`}
        >
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

          {originalSong && (
            <div className="w-1/2 flex flex-col border-r border-gray-200 pr-12 overflow-y-auto max-h-[calc(100vh-140px)] sticky top-[88px] opacity-75 hover:opacity-100 transition-opacity">
              <div className="text-xs font-semibold tracking-widest text-brand-accent uppercase mb-4 sticky top-0 bg-white py-2 z-10 border-b border-gray-100">
                Originalversjon ({originalSong.language === 'en' ? 'Engelsk' : 'Norsk'})
              </div>
              <h1 className="w-full text-4xl md:text-5xl font-serif text-brand-dark mb-6 leading-tight">
                {originalSong.title}
              </h1>
              {originalSong.description && (
                <p className="text-sm text-brand-muted italic mb-6">{originalSong.description}</p>
              )}
              <div
                className="prose prose-lg brand-prose max-w-none pb-12 font-serif"
                dangerouslySetInnerHTML={{ __html: originalSong.lyrics }}
              />
            </div>
          )}

          <div className={originalSong ? 'w-1/2 flex flex-col min-w-0' : 'flex flex-col w-full'}>
            {originalSong && (
              <div className="text-xs font-semibold tracking-widest text-brand-dark uppercase mb-4 sticky top-0 bg-white py-2 z-10 border-b border-gray-100">
                Omsetjing ({songForm.language === 'en' ? 'Engelsk' : 'Norsk'})
              </div>
            )}

            {/* URL Slug */}
            <div className="flex items-center gap-2 mb-3 w-full">
              <input
                type="text"
                placeholder="Eigendefinert URL-slug (valfritt, t.d. 'stille-morgon')"
                value={songForm.slug || ''}
                onChange={(e) => setSongForm({ ...songForm, slug: e.target.value })}
                className="w-full text-xs font-sans text-brand-muted placeholder:text-gray-300 border-none outline-none focus:ring-0 bg-transparent"
              />
            </div>

            {/* Song Title */}
            <TextareaAutosize
              placeholder="Songtittel..."
              value={songForm.title}
              onChange={(e) => setSongForm({ ...songForm, title: e.target.value })}
              className="w-full text-4xl md:text-5xl lg:text-6xl font-serif text-brand-dark placeholder:text-gray-200 mb-6 border-none outline-none focus:ring-0 resize-none bg-transparent leading-tight"
            />

            {/* Genre, Release Year & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-5 bg-brand-surface border border-brand-sand">
              <div className="sm:col-span-2 space-y-2">
                <label className="block text-[11px] font-sans font-semibold tracking-widest uppercase text-brand-dark">
                  Sjanger / Kategori
                </label>
                <input
                  type="text"
                  value={songForm.genre || ''}
                  onChange={(e) => setSongForm({ ...songForm, genre: e.target.value })}
                  placeholder="F.eks. Viser, Ballade, Pop/Rock..."
                  className="w-full bg-white border border-gray-200 px-3.5 py-2.5 text-sm text-brand-dark focus:outline-none focus:border-brand-dark"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {genrePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSongForm({ ...songForm, genre: preset })}
                      className={`text-[10px] font-sans font-semibold tracking-wider uppercase px-2.5 py-1 border transition-colors ${
                        songForm.genre === preset
                          ? 'bg-brand-dark text-white border-brand-dark'
                          : 'bg-white text-brand-muted border-gray-200 hover:border-brand-dark hover:text-brand-dark'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-sans font-semibold tracking-widest uppercase text-brand-dark">
                  Utgjevingsår
                </label>
                <input
                  type="number"
                  value={songForm.releaseYear || ''}
                  onChange={(e) =>
                    setSongForm({
                      ...songForm,
                      releaseYear: Number(e.target.value) || new Date().getFullYear()
                    })
                  }
                  placeholder="2026"
                  className="w-full bg-white border border-gray-200 px-3.5 py-2.5 text-sm font-mono text-brand-dark focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div className="sm:col-span-3 space-y-2 pt-2">
                <label className="block text-[11px] font-sans font-semibold tracking-widest uppercase text-brand-dark">
                  Kort omtale / bakgrunnshistorie (valfritt – visest øvst på songsida og i rutenettet)
                </label>
                <TextareaAutosize
                  minRows={2}
                  value={songForm.description || ''}
                  onChange={(e) => setSongForm({ ...songForm, description: e.target.value })}
                  placeholder="Skriv gjerne eit par setningar om bakgrunnen for songen, melodien eller stemninga..."
                  className="w-full bg-white border border-gray-200 p-3.5 text-sm font-sans text-brand-dark focus:outline-none focus:border-brand-dark resize-none"
                />
              </div>
            </div>

            {/* Cover Image & Audio Upload Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-10">
              {/* Cover Image Box */}
              <div className="md:col-span-5 bg-white border border-gray-200 p-5 flex flex-col justify-between">
                <div>
                  <label className="block text-[11px] font-sans font-semibold tracking-widest uppercase text-brand-dark mb-3">
                    Coverbilete (Kvadratisk 1:1)
                  </label>
                  {songForm.coverImageUrl ? (
                    <div className="space-y-3">
                      <div className="aspect-square w-full max-w-[240px] mx-auto bg-gray-100 border border-gray-200 overflow-hidden relative group">
                        <img
                          src={songForm.coverImageUrl}
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setSongForm({ ...songForm, coverImageUrl: '', coverImageCaption: '' })
                          }
                          className="absolute top-2 right-2 bg-black/75 text-white px-2.5 py-1 text-[10px] font-semibold tracking-widest uppercase hover:bg-black"
                        >
                          Fjern
                        </button>
                      </div>
                      <input
                        type="text"
                        value={songForm.coverImageCaption || ''}
                        onChange={(e) =>
                          setSongForm({ ...songForm, coverImageCaption: e.target.value })
                        }
                        placeholder="Bilettekst / fotokreditering (valfritt)"
                        className="w-full border border-gray-200 px-3 py-2 text-xs text-brand-muted focus:outline-none focus:border-brand-dark"
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => setShowSongImagePicker(true)}
                      className="aspect-square w-full max-w-[240px] mx-auto border border-dashed border-gray-300 hover:border-brand-dark flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <Music className="w-8 h-8 text-brand-muted mb-2" />
                      <span className="text-xs font-semibold tracking-widest uppercase text-brand-dark">
                        Vel coverbilete
                      </span>
                      <span className="text-[11px] text-brand-muted mt-1">
                        Mine bilde, Unsplash eller Wikimedia
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowSongImagePicker(true)}
                  className="mt-4 w-full py-2.5 border border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white text-xs font-semibold tracking-widest uppercase transition-colors"
                >
                  {songForm.coverImageUrl ? 'Byt coverbilete' : 'Opne bildeveljar'}
                </button>
              </div>

              {/* Audio File Upload & Player Box */}
              <div className="md:col-span-7 bg-white border border-gray-200 p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-sans font-semibold tracking-widest uppercase text-brand-dark">
                      Lydfil & Avspeling
                    </label>
                    {songForm.durationSeconds ? (
                      <span className="text-xs font-mono tabular-nums text-brand-accent font-semibold">
                        Varigheit: {formatDuration(songForm.durationSeconds)}
                      </span>
                    ) : null}
                  </div>

                  {/* Upload Button */}
                  <div className="border-2 border-dashed border-gray-200 hover:border-brand-dark/50 bg-brand-surface/50 p-5 text-center transition-colors">
                    <input
                      type="file"
                      id="song-audio-upload-input"
                      accept=".mp3,.m4a,.aac,.opus,.ogg,.wav,audio/*"
                      onChange={handleAudioFileUpload}
                      disabled={isUploadingAudio}
                      className="hidden"
                    />
                    <label
                      htmlFor="song-audio-upload-input"
                      className={`cursor-pointer flex flex-col items-center justify-center gap-2 ${
                        isUploadingAudio ? 'opacity-60 pointer-events-none' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center">
                        <Upload className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold tracking-widest uppercase text-brand-dark">
                        {isUploadingAudio
                          ? 'Lastar opp lydfil...'
                          : songForm.audioUrl
                          ? 'Last opp ny lydfil (erstatt)'
                          : 'Vel lydfil frå maskina (.MP3, .M4A, .OPUS, .WAV)'}
                      </span>
                      <span className="text-[11px] text-brand-muted max-w-md leading-relaxed">
                        <strong>Tilrådd lydformat:</strong> MP3 er det tryggaste standardvalet for brei kompatibilitet på tvers av nettlesarar og einingar. Opus og AAC (.m4a) gjev mindre filer med svært god lydkvalitet.
                      </span>
                    </label>
                  </div>

                  {/* Upload Progress */}
                  {isUploadingAudio && (
                    <div className="p-3 bg-brand-dark text-white text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span>{audioUploadStatus || 'Lastar opp...'}</span>
                        <span className="font-mono tabular-nums">{audioUploadProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/20 overflow-hidden">
                        <div
                          className="h-full bg-brand-accent transition-all duration-150"
                          style={{ width: `${audioUploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {audioUploadError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{audioUploadError}</span>
                    </div>
                  )}

                  {/* Direct URL input / status */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-sans font-semibold tracking-widest uppercase text-brand-muted">
                      Eller lim inn direkte lyd-URL (valfritt)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={songForm.audioUrl || ''}
                        onChange={(e) =>
                          setSongForm({
                            ...songForm,
                            audioUrl: e.target.value,
                            audioFormat: detectAudioFormat(e.target.value)
                          })
                        }
                        placeholder="https://... (.mp3 / .m4a / .opus)"
                        className="flex-1 border border-gray-200 px-3 py-2 text-xs font-mono text-brand-dark focus:outline-none focus:border-brand-dark"
                      />
                      {songForm.audioUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setSongForm({
                              ...songForm,
                              audioUrl: '',
                              audioFileName: '',
                              durationSeconds: 0
                            })
                          }
                          className="px-3 py-2 border border-gray-200 text-red-600 hover:bg-red-50 text-xs font-semibold uppercase tracking-wider"
                          title="Fjern lydfil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audio Preview Player */}
                {previewAudioUrl && (
                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2">
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate font-medium">
                          {songForm.audioFileName || 'Lydfil klar til avspeling'} (
                          {(songForm.audioFormat || 'mp3').toUpperCase()})
                        </span>
                      </div>
                    </div>
                    <audio
                      controls
                      src={previewAudioUrl}
                      onLoadedMetadata={(e) => {
                        const dur = e.currentTarget.duration;
                        if (isFinite(dur) && dur > 0 && !songForm.durationSeconds) {
                          setSongForm((prev) => ({
                            ...prev,
                            durationSeconds: Math.round(dur)
                          }));
                        }
                      }}
                      className="w-full h-10"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Song Lyrics Editor */}
            <div className="mb-3 flex items-center justify-between">
              <label className="text-xs font-sans font-semibold tracking-widest uppercase text-brand-dark">
                Songtekst
              </label>
              <span className="text-xs text-brand-muted">
                Tips: Bruk Shift+Enter for linjeskift inne i eit vers, og Enter for nytt vers/strofe.
              </span>
            </div>
            <div className="flex-grow w-full">
              <RichTextEditor
                content={songForm.lyrics}
                onChange={(c) => setSongForm({ ...songForm, lyrics: c })}
              />
            </div>

            {showSongImagePicker && (
              <ImagePickerModal
                language={songForm.language as any}
                onClose={() => setShowSongImagePicker(false)}
                onSelect={(url, caption) => {
                  setSongForm({
                    ...songForm,
                    coverImageUrl: url,
                    coverImageCaption: caption || songForm.coverImageCaption
                  });
                }}
              />
            )}
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

  const filteredDiaries = diaries.filter(d => {
    if (diaryFilter === 'no') return d.language !== 'en';
    if (diaryFilter === 'en') return d.language === 'en';
    if (diaryFilter === 'draft') return !d.published;
    if (diaryFilter === 'published') return d.published;
    return true;
  });

  const filteredSongs = songs.filter(s => {
    if (songFilter === 'no') return s.language !== 'en';
    if (songFilter === 'en') return s.language === 'en';
    if (songFilter === 'draft') return !s.published;
    if (songFilter === 'published') return s.published;
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
              onClick={() => setDashboardTab('overview')} 
              className={`text-left px-4 py-3 text-xs tracking-widest uppercase font-semibold transition-colors shrink-0 ${dashboardTab === 'overview' ? 'bg-brand-dark text-white' : 'text-brand-muted hover:text-brand-dark hover:bg-gray-50'}`}
            >
              Oversikt
            </button>
            <button 
              onClick={() => setDashboardTab('articles')} 
              className={`text-left px-4 py-3 text-xs tracking-widest uppercase font-semibold transition-colors shrink-0 ${dashboardTab === 'articles' ? 'bg-brand-dark text-white' : 'text-brand-muted hover:text-brand-dark hover:bg-gray-50'}`}
            >
              Artiklar
            </button>
            <button 
              onClick={() => setDashboardTab('books')} 
              className={`text-left px-4 py-3 text-xs tracking-widest uppercase font-semibold transition-colors shrink-0 flex items-center justify-between gap-1.5 ${(dashboardTab === 'books' || dashboardTab === 'promo') ? 'bg-brand-dark text-white' : 'text-brand-muted hover:text-brand-dark hover:bg-gray-50'}`}
            >
              <span>Bøker & Salg</span>
              <Sparkles className={`w-3.5 h-3.5 ${(dashboardTab === 'books' || dashboardTab === 'promo') ? 'text-amber-300' : 'text-amber-500'}`} />
            </button>
            <button 
              onClick={() => setDashboardTab('diary')} 
              className={`text-left px-4 py-3 text-xs tracking-widest uppercase font-semibold transition-colors shrink-0 ${dashboardTab === 'diary' ? 'bg-brand-dark text-white' : 'text-brand-muted hover:text-brand-dark hover:bg-gray-50'}`}
            >
              Dagbok
            </button>
            <button 
              onClick={() => setDashboardTab('music')} 
              className={`text-left px-4 py-3 text-xs tracking-widest uppercase font-semibold transition-colors shrink-0 flex items-center justify-between gap-1.5 ${dashboardTab === 'music' ? 'bg-brand-dark text-white' : 'text-brand-muted hover:text-brand-dark hover:bg-gray-50'}`}
            >
              <span>Musikk</span>
              <Music className={`w-3.5 h-3.5 ${dashboardTab === 'music' ? 'text-amber-300' : 'text-brand-accent'}`} />
            </button>
            <button 
              onClick={() => setDashboardTab('files')} 
              className={`text-left px-4 py-3 text-xs tracking-widest uppercase font-semibold transition-colors shrink-0 ${dashboardTab === 'files' ? 'bg-brand-dark text-white' : 'text-brand-muted hover:text-brand-dark hover:bg-gray-50'}`}
            >
              Filer
            </button>
            <button 
              onClick={() => setDashboardTab('about')} 
              className={`text-left px-4 py-3 text-xs tracking-widest uppercase font-semibold transition-colors shrink-0 ${dashboardTab === 'about' ? 'bg-brand-dark text-white' : 'text-brand-muted hover:text-brand-dark hover:bg-gray-50'}`}
            >
              Om meg
            </button>
            <button 
              onClick={() => setDashboardTab('photos')} 
              className={`text-left px-4 py-3 text-xs tracking-widest uppercase font-semibold transition-colors shrink-0 ${dashboardTab === 'photos' ? 'bg-brand-dark text-white' : 'text-brand-muted hover:text-brand-dark hover:bg-gray-50'}`}
            >
              Foto & Natur
            </button>
            <button 
              onClick={() => setDashboardTab('orders')} 
              className={`text-left px-4 py-3 text-xs tracking-widest uppercase font-semibold transition-colors shrink-0 ${dashboardTab === 'orders' ? 'bg-brand-dark text-white' : 'text-brand-muted hover:text-brand-dark hover:bg-gray-50'}`}
            >
              Bestillingar
            </button>
            <button 
              onClick={() => setDashboardTab('backup')} 
              className={`text-left px-4 py-3 text-xs tracking-widest uppercase font-semibold transition-colors shrink-0 ${dashboardTab === 'backup' ? 'bg-brand-dark text-white' : 'text-brand-muted hover:text-brand-dark hover:bg-gray-50'}`}
            >
              Sikkerheitskopi
            </button>
            <button 
              onClick={() => setDashboardTab('requests')} 
              className={`text-left px-4 py-3 text-xs tracking-widest uppercase font-semibold transition-colors shrink-0 flex items-center justify-between gap-1.5 ${dashboardTab === 'requests' ? 'bg-amber-600 text-white' : 'text-amber-800 bg-amber-50/70 hover:bg-amber-100 hover:text-amber-950 font-bold border-l-2 border-amber-500'}`}
            >
              <span>Be om endring / Ny funksjon</span>
              <Sparkles className={`w-3.5 h-3.5 ${dashboardTab === 'requests' ? 'text-white' : 'text-amber-600'}`} />
            </button>
          </nav>
          
          <div className="mt-8 p-4 border border-brand-sand bg-gray-50 flex flex-col gap-3">
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Kvote-tracker (minne)</h4>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-brand-dark">Henta frå server:</span>
              <span className="text-xs font-mono font-bold text-red-600">{currentStats.serverReads}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-brand-dark">Spart (Lokalt minne):</span>
              <span className="text-xs font-mono font-bold text-green-600">{currentStats.cacheHits}</span>
            </div>
            
            <p className="text-[9px] text-brand-muted leading-tight mt-2">
              Viser estimert tal på dokument-lesingar i denne økta (sidan du opna fana).
            </p>
          </div>
        </aside>
        {/* MAIN CONTENT AREA */}
        <main className="lg:col-span-9 xl:col-span-10">
          {dashboardTab === 'overview' && (
            <section className="mb-12">
              <h2 className="text-2xl font-serif text-brand-dark mb-6 border-b border-gray-200 pb-4">Oversikt</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 border border-gray-100 p-6 flex flex-col items-center justify-center">
                  <span className="text-3xl font-serif text-brand-dark mb-2">{visitors}</span>
                  <span className="text-[10px] uppercase tracking-widest text-brand-muted font-semibold">Besøkande</span>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-6 flex flex-col items-center justify-center">
                  <span className="text-3xl font-serif text-brand-dark mb-2">{articles.length}</span>
                  <span className="text-[10px] uppercase tracking-widest text-brand-muted font-semibold">Artiklar</span>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-6 flex flex-col items-center justify-center">
                  <span className="text-3xl font-serif text-brand-dark mb-2">{diaries.length}</span>
                  <span className="text-[10px] uppercase tracking-widest text-brand-muted font-semibold">Dagbokinnlegg</span>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-6 flex flex-col items-center justify-center">
                  <span className="text-3xl font-serif text-brand-dark mb-2">{songs.length}</span>
                  <span className="text-[10px] uppercase tracking-widest text-brand-muted font-semibold">Songar</span>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-6 flex flex-col items-center justify-center">
                  <span className="text-3xl font-serif text-brand-dark mb-2">{books.length}</span>
                  <span className="text-[10px] uppercase tracking-widest text-brand-muted font-semibold">Bøker</span>
                </div>
              </div>

              <div className="mt-12 bg-white border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-widest text-brand-muted font-semibold">
                        <th className="p-4 font-semibold">Side</th>
                        <th className="p-4 font-semibold w-32 text-right">Visningar</th>
                        <th className="p-4 font-semibold w-48 text-right">Tid brukt (totalt)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageStats.sort((a, b) => (b.views || 0) - (a.views || 0)).map(stat => (
                        <tr key={stat.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 font-mono text-xs text-brand-dark">{stat.path || '/'}</td>
                          <td className="p-4 text-sm text-right">{stat.views || 0}</td>
                          <td className="p-4 text-sm text-right text-brand-muted">
                            {stat.totalDurationSeconds > 60 
                              ? `${Math.floor(stat.totalDurationSeconds / 60)}m ${stat.totalDurationSeconds % 60}s` 
                              : `${stat.totalDurationSeconds || 0}s`}
                          </td>
                        </tr>
                      ))}
                      {pageStats.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-sm text-brand-muted">Ingen visningsdata enno.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SIKKERHEITSKOPI BANNER */}
              <div className="mt-8 bg-brand-sand/15 border border-brand-sand/50 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-serif text-lg text-brand-dark">Sikkerheitskopi & Prosjekt-bytte</h3>
                  <p className="text-xs text-brand-muted mt-1 max-w-xl">
                    Ta vare på innhaldet ditt eller overfør alt til eit nytt Firebase-prosjekt. Last ned komplett JSON-sikkerheitskopi eller gjenopprett data med eitt klikk.
                  </p>
                </div>
                <button
                  onClick={() => setDashboardTab('backup')}
                  className="px-5 py-2.5 bg-brand-dark text-white text-xs font-semibold tracking-widest uppercase hover:bg-brand-dark/90 transition-colors shrink-0"
                >
                  Gå til Sikkerheitskopi
                </button>
              </div>
            </section>
          )}

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

          {/* BOOKS & SALES MANAGEMENT (MERGED) */}
          {(dashboardTab === 'books' || dashboardTab === 'promo') && (
          <section className="lg:col-span-9 xl:col-span-10">
            <div className="max-w-5xl pt-2 lg:pt-6 pr-0 md:pr-4">
              <BookPromoManager 
                books={books} 
                onDataChanged={loadData}
                targetBookId={promoTargetBookId}
                onClearTargetBookId={() => setPromoTargetBookId(null)}
                pageStats={pageStats.reduce((acc, stat) => {
                  if (stat.path && stat.views) {
                    acc[stat.path] = stat.views;
                  }
                  return acc;
                }, {} as Record<string, number>)}
              />
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
                  <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                    <button onClick={() => setDiaryFilter('all')} className={`text-[10px] md:text-xs font-semibold tracking-widest px-3 py-1.5 uppercase transition-colors ${diaryFilter === 'all' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-brand-dark hover:bg-gray-200'}`}>Alle</button>
                    <button onClick={() => setDiaryFilter('no')} className={`text-[10px] md:text-xs font-semibold tracking-widest px-3 py-1.5 uppercase transition-colors ${diaryFilter === 'no' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-brand-dark hover:bg-gray-200'}`}>No</button>
                    <button onClick={() => setDiaryFilter('en')} className={`text-[10px] md:text-xs font-semibold tracking-widest px-3 py-1.5 uppercase transition-colors ${diaryFilter === 'en' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-brand-dark hover:bg-gray-200'}`}>En</button>
                    <button onClick={() => setDiaryFilter('published')} className={`text-[10px] md:text-xs font-semibold tracking-widest px-3 py-1.5 uppercase transition-colors hidden sm:block ${diaryFilter === 'published' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-brand-dark hover:bg-gray-200'}`}>Publisert</button>
                    <button onClick={() => setDiaryFilter('draft')} className={`text-[10px] md:text-xs font-semibold tracking-widest px-3 py-1.5 uppercase transition-colors hidden sm:block ${diaryFilter === 'draft' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-brand-dark hover:bg-gray-200'}`}>Utkast</button>
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
                      <th className="p-4 font-semibold w-24">Status</th>
                      <th className="p-4 font-semibold w-32 text-right">Handlingar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDiaries.map(entry => (
                      <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                        <td className="p-4">
                          <div className="font-semibold text-sm mb-1">
                            {entry.title || 'Uten tittel'}
                            {entry.imageUrl && <span className="text-[10px] text-brand-muted ml-2 bg-gray-100 px-1.5 py-0.5 rounded tracking-wider relative -top-[1px]">BLD</span>}
                          </div>
                          <div className="text-xs text-gray-400 line-clamp-1" dangerouslySetInnerHTML={{ __html: entry.content.replace(/<img[^>]*>|<figure[^>]*>.*?<\/figure>|<figcaption[^>]*>.*?<\/figcaption>/ig, '') }} />
                        </td>
                        <td className="p-4">
                          <span className="text-[10px] font-semibold text-brand-accent bg-brand-accent/10 px-2 py-1 rounded-sm uppercase tracking-widest">
                            {entry.language === 'both' ? 'Begge' : entry.language === 'en' ? 'Engelsk' : 'Norsk'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-[10px] uppercase tracking-widest font-semibold rounded-sm inline-flex items-center gap-1 ${entry.published !== false ? 'bg-brand-dark text-white' : 'bg-amber-100 text-amber-800'}`}>
                            {entry.published !== false ? 'Publisert' : 'Utkast'}
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
                    {filteredDiaries.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-sm text-brand-muted">Ingen dagbokoppslag lagt til enno.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden space-y-3">
                {filteredDiaries.map(entry => (
                  <div key={entry.id} className="p-4 border border-gray-100 flex justify-between items-start bg-white shadow-sm group">
                    <div className="pr-4 flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-sm uppercase tracking-widest">
                          {entry.language === 'both' ? 'Begge' : entry.language === 'en' ? 'Engelsk' : 'Norsk'}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm uppercase tracking-widest ${entry.published !== false ? 'bg-brand-dark text-white' : 'bg-amber-100 text-amber-800'}`}>
                          {entry.published !== false ? 'PUB' : 'UTKAST'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm">
                        {entry.title || 'Uten tittel'}
                        {entry.imageUrl && <span className="text-[10px] text-brand-muted ml-2 bg-gray-100 px-1.5 py-0.5 rounded tracking-wider relative -top-[1px] inline-block">BLD</span>}
                      </h3>
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

          {/* MUSIC & SONGS MANAGE */}
          {dashboardTab === 'music' && (
          <section className="lg:col-span-9 xl:col-span-10">
            <div className="max-w-5xl pt-4 lg:pt-8 pr-4 md:pr-8">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end border-b border-gray-200 pb-4 mb-6 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-3 md:mb-4">
                    <h2 className="text-2xl font-serif text-brand-dark mb-0">Musikk & Songtekstar</h2>
                    <button
                      onClick={() =>
                        setInfoDialog({
                          title: 'Musikk & Songtekstar',
                          content: (
                            <p>
                              Her kan du publisere songar med coverbilete, songtekst og lydfil (MP3, M4A/AAC, Opus eller WAV). Kvar song får eit kort i rutenettet på <strong>/musikk</strong> og si eiga songside med innebygd musikkspelar.
                            </p>
                          )
                        })
                      }
                      className="text-gray-300 hover:text-brand-dark transition-colors"
                      title="Informasjon om musikk"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                    <button
                      onClick={() => setSongFilter('all')}
                      className={`text-[10px] md:text-xs font-semibold tracking-widest px-3 py-1.5 uppercase transition-colors ${
                        songFilter === 'all' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-brand-dark hover:bg-gray-200'
                      }`}
                    >
                      Alle
                    </button>
                    <button
                      onClick={() => setSongFilter('no')}
                      className={`text-[10px] md:text-xs font-semibold tracking-widest px-3 py-1.5 uppercase transition-colors ${
                        songFilter === 'no' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-brand-dark hover:bg-gray-200'
                      }`}
                    >
                      No
                    </button>
                    <button
                      onClick={() => setSongFilter('en')}
                      className={`text-[10px] md:text-xs font-semibold tracking-widest px-3 py-1.5 uppercase transition-colors ${
                        songFilter === 'en' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-brand-dark hover:bg-gray-200'
                      }`}
                    >
                      En
                    </button>
                    <button
                      onClick={() => setSongFilter('published')}
                      className={`text-[10px] md:text-xs font-semibold tracking-widest px-3 py-1.5 uppercase transition-colors hidden sm:block ${
                        songFilter === 'published' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-brand-dark hover:bg-gray-200'
                      }`}
                    >
                      Publisert
                    </button>
                    <button
                      onClick={() => setSongFilter('draft')}
                      className={`text-[10px] md:text-xs font-semibold tracking-widest px-3 py-1.5 uppercase transition-colors hidden sm:block ${
                        songFilter === 'draft' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-brand-dark hover:bg-gray-200'
                      }`}
                    >
                      Utkast
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    to="/musikk"
                    className="flex items-center text-xs font-semibold tracking-widest border border-gray-200 text-brand-dark px-4 py-2.5 hover:bg-gray-50 transition-colors shrink-0"
                  >
                    SJÅ MUSIKKSIDA
                  </Link>
                  <button
                    onClick={() => navigate('/admin?compose_song=true')}
                    className="flex items-center text-xs font-semibold tracking-widest bg-brand-dark text-white px-5 py-2.5 hover:bg-black transition-colors shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-2" /> NY SONG
                  </button>
                </div>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-sm overflow-hidden hidden md:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-widest text-brand-muted font-semibold">
                      <th className="p-4 font-semibold">Song</th>
                      <th className="p-4 font-semibold w-28">Sjanger</th>
                      <th className="p-4 font-semibold w-24">Lyd</th>
                      <th className="p-4 font-semibold w-20">Språk</th>
                      <th className="p-4 font-semibold w-24">Status</th>
                      <th className="p-4 font-semibold w-44 text-right">Handlingar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSongs.map((song) => (
                      <tr key={song.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-stone-900 border border-gray-200 shrink-0 overflow-hidden flex items-center justify-center">
                              {song.coverImageUrl ? (
                                <img src={song.coverImageUrl} alt={song.title} className="w-full h-full object-cover" />
                              ) : (
                                <Music className="w-4 h-4 text-brand-accent" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm text-brand-dark truncate">
                                {song.title || 'Utan tittel'}
                              </div>
                              <div className="text-xs text-gray-400 truncate">
                                /musikk/{song.slug || song.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-xs text-brand-muted">
                          {song.genre || '–'}
                        </td>
                        <td className="p-4">
                          {song.audioUrl ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5">
                              <Volume2 className="w-3 h-3" />
                              {song.durationSeconds ? formatDuration(song.durationSeconds) : (song.audioFormat || 'MP3')}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Kun tekst</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-[10px] font-semibold text-brand-accent uppercase tracking-widest">
                            {song.language === 'both' ? 'Begge' : song.language === 'en' ? 'EN' : 'NO'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 text-[10px] uppercase tracking-widest font-semibold rounded-sm inline-flex items-center gap-1 ${
                              song.published !== false ? 'bg-brand-dark text-white' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {song.published !== false ? 'Publisert' : 'Utkast'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-3">
                          <Link
                            to={`/musikk/${song.slug || song.id}`}
                            className="text-brand-muted hover:text-brand-dark text-xs font-semibold tracking-widest transition-colors"
                          >
                            VIS
                          </Link>
                          {!song.translationId && song.language !== 'both' && (
                            <button
                              onClick={() => createSongTranslation(song)}
                              className="text-brand-accent text-xs font-semibold tracking-widest opacity-80 hover:opacity-100 transition-opacity"
                            >
                              OMSETT
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/admin?edit_song=${song.id}`)}
                            className="text-brand-dark text-xs font-semibold tracking-widest opacity-80 hover:opacity-100 transition-opacity"
                          >
                            REDIGER
                          </button>
                          <button
                            onClick={() => deleteSong(song.id!)}
                            className="text-red-500 text-xs font-semibold tracking-widest opacity-80 hover:opacity-100 transition-opacity"
                          >
                            SLETT
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredSongs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-sm text-brand-muted">
                          Ingen songar lagt til enno. Trykk «NY SONG» for å publisere songtekst og lydfil.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden space-y-3">
                {filteredSongs.map((song) => (
                  <div key={song.id} className="p-4 border border-gray-100 flex justify-between items-start bg-white shadow-sm">
                    <div className="pr-4 flex-grow min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold text-brand-accent uppercase tracking-widest">
                          {song.language === 'both' ? 'Begge' : song.language === 'en' ? 'Engelsk' : 'Norsk'}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm uppercase tracking-widest ${
                            song.published !== false ? 'bg-brand-dark text-white' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {song.published !== false ? 'PUB' : 'UTKAST'}
                        </span>
                        {song.audioUrl && (
                          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5">
                            LYD
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm truncate">{song.title || 'Utan tittel'}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{song.genre || 'Song'}</p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0 items-end">
                      {!song.translationId && song.language !== 'both' && (
                        <button
                          onClick={() => createSongTranslation(song)}
                          className="text-brand-accent text-[10px] font-semibold tracking-widest"
                        >
                          OMSETT
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/admin?edit_song=${song.id}`)}
                        className="text-brand-dark text-[10px] font-semibold tracking-widest"
                      >
                        REDIGER
                      </button>
                      <button
                        onClick={() => deleteSong(song.id!)}
                        className="text-red-500 text-[10px] font-semibold tracking-widest"
                      >
                        SLETT
                      </button>
                    </div>
                  </div>
                ))}
                {filteredSongs.length === 0 && (
                  <div className="text-sm text-brand-muted p-4 border border-gray-100 text-center">
                    Ingen songar lagt til enno.
                  </div>
                )}
              </div>
            </div>
          </section>
          )}

          {/* FILES MANAGE */}
          {dashboardTab === 'files' && (
          <div className="pt-4 lg:pt-8 bg-white md:bg-transparent max-w-5xl h-[80vh] min-h-[600px] flex flex-col">
            {/* The FileManager component already handles its own layout, but we can contain it */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-4 mb-6 shrink-0">
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
            <div className="flex-grow min-h-0">
              <FileManager />
            </div>
          </div>
          )}

          {/* ABOUT ME TAB */}
          {dashboardTab === 'about' && (
            <section className="pt-4 lg:pt-8 max-w-5xl">
              <div className="mb-8">
                <h2 className="text-2xl font-serif mb-2">Om Meg Innstillinger</h2>
                <p className="text-sm text-gray-500 font-sans">Rediger profilinformasjonen for 'Om meg'-siden og Footer.</p>
              </div>

              <div className="space-y-8 bg-white p-6 md:p-10 border border-gray-100">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="block text-xs tracking-widest text-brand-dark font-sans font-semibold uppercase">Lang Bio (Norsk)</label>
                    <textarea 
                      value={aboutForm.bioNo} 
                      onChange={e => setAboutForm(prev => ({ ...prev, bioNo: e.target.value }))}
                      className="w-full border border-gray-200 p-4 font-serif text-brand-dark min-h-[300px] focus:outline-none focus:border-brand-dark transition-colors bg-brand-light/30"
                      placeholder="Hovedtekst for Om Meg siden (Støtter Markdown)"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-xs tracking-widest text-brand-dark font-sans font-semibold uppercase">Lang Bio (Engelsk)</label>
                    <textarea 
                      value={aboutForm.bioEn} 
                      onChange={e => setAboutForm(prev => ({ ...prev, bioEn: e.target.value }))}
                      className="w-full border border-gray-200 p-4 font-serif text-brand-dark min-h-[300px] focus:outline-none focus:border-brand-dark transition-colors bg-brand-light/30"
                      placeholder="Main text for About page (Supports Markdown)"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="block text-xs tracking-widest text-brand-dark font-sans font-semibold uppercase">Kort Bio Footer (Norsk)</label>
                    <textarea 
                      value={aboutForm.shortBioNo} 
                      onChange={e => setAboutForm(prev => ({ ...prev, shortBioNo: e.target.value }))}
                      className="w-full border border-gray-200 p-4 font-serif text-brand-dark min-h-[150px] focus:outline-none focus:border-brand-dark transition-colors bg-brand-light/30"
                      placeholder="Kort tekst som vises i footeren..."
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-xs tracking-widest text-brand-dark font-sans font-semibold uppercase">Kort Bio Footer (Engelsk)</label>
                    <textarea 
                      value={aboutForm.shortBioEn} 
                      onChange={e => setAboutForm(prev => ({ ...prev, shortBioEn: e.target.value }))}
                      className="w-full border border-gray-200 p-4 font-serif text-brand-dark min-h-[150px] focus:outline-none focus:border-brand-dark transition-colors bg-brand-light/30"
                      placeholder="Short text shown in the footer..."
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex justify-end">
                  <button 
                    onClick={saveAboutSettings}
                    disabled={isSaving}
                    className="px-8 py-4 bg-brand-dark text-white text-xs tracking-widest uppercase font-semibold hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[200px]"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                       <>LAGRE INNSTILLINGER <Save className="ml-2 w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            </section>
          )}

          {dashboardTab === 'photos' && (
            <section className="mb-12">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end border-b border-gray-200 pb-4 mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-serif text-brand-dark mb-2">Foto & Natur Galleri</h2>
                  <p className="text-sm text-brand-muted">
                    Her kan du legge inn og redigere bilder som vises i Foto & Natur-galleriet på nettstaden.
                  </p>
                </div>
              </div>

              {/* ADD/EDIT PHOTO FORM */}
              <form onSubmit={saveGalleryPhoto} className="space-y-8 bg-white p-6 md:p-10 border border-gray-100 shadow-sm mb-12">
                <h3 className="text-lg font-serif text-brand-dark border-b border-gray-100 pb-3">
                  {editingPhotoId ? 'Rediger bildebeskrivelse' : 'Legg til nytt bilde'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="block text-xs tracking-widest text-brand-dark font-sans font-semibold uppercase">Bilde URL</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        required
                        value={photoForm.src} 
                        onChange={e => setPhotoForm(prev => ({ ...prev, src: e.target.value }))}
                        className="flex-1 border border-gray-200 p-4 font-sans text-brand-dark focus:outline-none focus:border-brand-dark transition-colors bg-brand-light/30 text-sm"
                        placeholder="Velg frå filer eller lim inn URL" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowGalleryImagePicker(true)}
                        className="px-4 bg-brand-dark text-white text-xs tracking-widest uppercase font-semibold hover:bg-black transition-colors"
                      >
                        Velg bilde
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs tracking-widest text-brand-dark font-sans font-semibold uppercase">Bildebeskrivelse / Alt-tekst</label>
                    <input 
                      type="text" 
                      required
                      value={photoForm.alt} 
                      onChange={e => setPhotoForm(prev => ({ ...prev, alt: e.target.value }))}
                      className="w-full border border-gray-200 p-4 font-sans text-brand-dark focus:outline-none focus:border-brand-dark transition-colors bg-brand-light/30 text-sm"
                      placeholder="F.eks. Fjord i solnedgang" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {photoForm.src && (
                    <div className="space-y-2">
                      <label className="block text-xs tracking-widest text-brand-dark font-sans font-semibold uppercase">Forhandsvising</label>
                      <div className="w-full max-w-[200px] aspect-[4/3] bg-gray-100 border border-gray-200 p-1">
                        <img src={photoForm.src} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
                  {editingPhotoId && (
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingPhotoId(null);
                        setPhotoForm({ src: '', alt: '' });
                      }}
                      className="px-6 py-4 border border-gray-200 text-brand-muted text-xs tracking-widest uppercase font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Avbryt redigering
                    </button>
                  )}
                  <button 
                    type="submit"
                    disabled={isSaving || !photoForm.src}
                    className="px-8 py-4 bg-brand-dark text-white text-xs tracking-widest uppercase font-semibold hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[200px]"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>{editingPhotoId ? 'OPPDATER BILDE' : 'LEGG TIL I GALLERI'} {editingPhotoId ? <Save className="ml-2 w-4 h-4" /> : <Plus className="ml-2 w-4 h-4" />}</>
                    )}
                  </button>
                </div>
              </form>

              {/* LIST OF PHOTOS */}
              <div className="bg-white p-6 md:p-10 border border-gray-100 shadow-sm">
                <h3 className="text-lg font-serif text-brand-dark border-b border-gray-100 pb-3 mb-6">Bilde i galleriet ({galleryPhotos.length})</h3>
                
                {galleryPhotos.length === 0 ? (
                  <p className="text-sm text-brand-muted py-8 text-center bg-gray-50/50">
                    Ingen bilete er lagt til enno. Galleriet viser førebels standardbilete.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {galleryPhotos.map(photo => (
                      <div key={photo.id} className="border border-gray-200 p-3 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="space-y-3">
                          <div className="aspect-[4/3] bg-gray-50 overflow-hidden relative">
                            <img src={photo.src} className="w-full h-full object-cover" alt={photo.alt} referrerPolicy="no-referrer" />
                          </div>
                          <div>
                            <p className="text-sm font-sans font-semibold text-brand-dark truncate">{photo.alt}</p>
                          </div>
                        </div>
                        <div className="pt-4 mt-4 border-t border-gray-100 flex justify-between items-center">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPhotoId(photo.id!);
                              setPhotoForm({ src: photo.src, alt: photo.alt });
                              window.scrollTo({ top: 100, behavior: 'smooth' });
                            }}
                            className="text-xs text-brand-dark hover:text-black font-semibold tracking-wider flex items-center gap-1"
                          >
                            REDIGER
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteGalleryPhoto(photo.id!)}
                            className="text-xs text-red-600 hover:text-red-800 font-semibold tracking-wider flex items-center gap-1"
                          >
                            SLETT
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ORDERS MANAGE */}
          {dashboardTab === 'orders' && (
            <section className="mb-12">
              <h2 className="text-2xl font-serif text-brand-dark mb-6 border-b border-gray-200 pb-4">Bestillingar</h2>
              
              <div className="bg-white border border-gray-100 shadow-sm p-12 text-center">
                <div className="mb-8">
                  <div className="w-16 h-16 mx-auto bg-[#635BFF]/10 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-[#635BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  </div>
                  <h3 className="text-2xl font-serif text-brand-dark mb-3">Ordrar vert handterte av Stripe</h3>
                  <p className="text-sm text-brand-muted max-w-md mx-auto leading-relaxed">
                    Sidan nettsida di køyrer statisk (t.d. på GitHub Pages), vert all kundeinformasjon, adresser og betalingar lagra direkte hjå Stripe.
                  </p>
                </div>
                <a 
                  href="https://dashboard.stripe.com/payments" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-[#635BFF] hover:bg-[#4B45D6] text-white px-8 py-4 text-xs font-semibold tracking-widest uppercase transition-colors"
                >
                  Opne Stripe Dashbord
                </a>
              </div>
            </section>
          )}

          {/* BACKUP & MIGRATION */}
          {dashboardTab === 'backup' && (
            <BackupManager 
              user={user}
              onDataChanged={loadData}
              currentCounts={{
                articles: articles.length,
                books: books.length,
                diaries: diaries.length,
                songs: songs.length,
                gallery: galleryPhotos.length
              }}
              loadedData={{
                articles,
                books,
                diaries,
                songs,
                galleryPhotos,
                orders,
                aboutForm,
                pageStats,
              }}
            />
          )}

          {/* ENDRINGSYNSKJER OG NYE FUNKSJONAR */}
          {dashboardTab === 'requests' && (
            <ChangeRequestManager />
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

          {showGalleryImagePicker && (
            <ImagePickerModal 
              onClose={() => setShowGalleryImagePicker(false)} 
              onSelect={(url) => {
                setPhotoForm({...photoForm, src: url});
                setShowGalleryImagePicker(false);
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
