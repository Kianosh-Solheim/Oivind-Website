import { useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  getDocsFromCache,
  getDocFromCache,
  setDoc, 
  Timestamp 
} from 'firebase/firestore';
import { 
  Download, 
  Upload, 
  Database, 
  FileJson, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  HelpCircle, 
  FileText, 
  BookOpen, 
  BookMarked, 
  Image, 
  Check, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { invalidateCache } from '../lib/dbCache';

interface BackupSummary {
  articles: number;
  books: number;
  diary: number;
  gallery: number;
  images: number;
  comments: number;
  settings: number;
  orders: number;
}

interface BackupFile {
  version: number;
  appName: string;
  exportedAt: string;
  projectDatabaseId?: string;
  summary: BackupSummary;
  data: {
    articles?: any[];
    books?: any[];
    diary?: any[];
    gallery?: any[];
    images?: any[];
    comments?: any[];
    settings?: any[];
    orders?: any[];
  };
}

interface BackupManagerProps {
  user: any;
  onDataChanged: () => void;
  currentCounts?: {
    articles: number;
    books: number;
    diaries: number;
    gallery: number;
  };
  loadedData?: {
    articles?: any[];
    books?: any[];
    diaries?: any[];
    galleryPhotos?: any[];
    orders?: any[];
    aboutForm?: any;
    pageStats?: any[];
  };
}

export default function BackupManager({ user, onDataChanged, currentCounts, loadedData }: BackupManagerProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const [importFile, setImportFile] = useState<BackupFile | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<{ message: string; current: number; total: number } | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Selected categories for import
  const [selectedCategories, setSelectedCategories] = useState({
    articles: true,
    books: true,
    diary: true,
    gallery: true,
    images: true,
    settings: true,
    comments: true,
    orders: true,
  });

  const [skipExisting, setSkipExisting] = useState(true);
  const [failedDetails, setFailedDetails] = useState<{ type: string; id: string; error: string }[]>([]);

  const [showGuide, setShowGuide] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to serialize Firestore data cleanly
  const serializeValue = (val: any): any => {
    if (val === null || val === undefined) return val;
    if (typeof val === 'object' && typeof val.toDate === 'function') {
      return {
        _type: 'timestamp',
        seconds: val.seconds,
        nanoseconds: val.nanoseconds,
        iso: val.toDate().toISOString(),
      };
    }
    if (val instanceof Date) {
      return {
        _type: 'timestamp',
        seconds: Math.floor(val.getTime() / 1000),
        nanoseconds: (val.getTime() % 1000) * 1000000,
        iso: val.toISOString(),
      };
    }
    if (Array.isArray(val)) {
      return val.map(serializeValue);
    }
    if (typeof val === 'object') {
      const res: Record<string, any> = {};
      for (const k of Object.keys(val)) {
        res[k] = serializeValue(val[k]);
      }
      return res;
    }
    return val;
  };

  // Helper to parse timestamps on import
  const parseTimestamp = (val: any): Timestamp => {
    if (!val) return Timestamp.now();
    if (val instanceof Timestamp) return val;
    if (typeof val === 'object' && typeof val.seconds === 'number') {
      return new Timestamp(val.seconds, val.nanoseconds || 0);
    }
    if (typeof val === 'object' && typeof val._seconds === 'number') {
      return new Timestamp(val._seconds, val._nanoseconds || 0);
    }
    if (typeof val === 'string' || typeof val === 'number') {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return Timestamp.fromDate(d);
      }
    }
    return Timestamp.now();
  };

  // Resilient collection fetcher that falls back to IndexedDB or in-memory props when server quota is exhausted
  const fetchCollectionWithFallback = async (
    collectionName: string, 
    fallbackData: any[] = []
  ): Promise<{ items: any[]; fromCache: boolean }> => {
    // 1. Try server fetch first
    try {
      const snap = await getDocs(collection(db, collectionName));
      const items = snap.docs.map(d => ({ id: d.id, ...serializeValue(d.data()) }));
      if (items.length > 0) {
        return { items, fromCache: false };
      }
    } catch (serverErr: any) {
      console.warn(`Server fetch for ${collectionName} failed (quota limit or network):`, serverErr?.message);
    }

    // 2. Try IndexedDB persistent cache (no quota needed)
    try {
      const cacheSnap = await getDocsFromCache(collection(db, collectionName));
      if (cacheSnap && cacheSnap.docs.length > 0) {
        const items = cacheSnap.docs.map(d => ({ id: d.id, ...serializeValue(d.data()) }));
        return { items, fromCache: true };
      }
    } catch (cacheErr: any) {
      console.warn(`IndexedDB cache fetch for ${collectionName} failed:`, cacheErr?.message);
    }

    // 3. Fall back to already loaded memory data from props
    if (fallbackData && fallbackData.length > 0) {
      const items = fallbackData.map(item => ({ ...serializeValue(item) }));
      return { items, fromCache: true };
    }

    return { items: [], fromCache: false };
  };

  const fetchSettingsWithFallback = async (fallbackSettings?: any): Promise<{ items: any[]; fromCache: boolean }> => {
    try {
      const snap = await getDocs(collection(db, 'settings'));
      const items = snap.docs.map(d => ({ id: d.id, ...serializeValue(d.data()) }));
      if (items.length > 0) {
        return { items, fromCache: false };
      }
    } catch (serverErr) {
      console.warn('Server fetch for settings failed:', serverErr);
    }

    try {
      const cacheSnap = await getDocsFromCache(collection(db, 'settings'));
      if (cacheSnap && cacheSnap.docs.length > 0) {
        const items = cacheSnap.docs.map(d => ({ id: d.id, ...serializeValue(d.data()) }));
        return { items, fromCache: true };
      }
    } catch (cacheErr) {
      console.warn('Cache fetch for settings failed:', cacheErr);
    }

    // Try single doc 'about'
    try {
      const docSnap = await getDocFromCache(doc(db, 'settings', 'about'));
      if (docSnap.exists()) {
        return { items: [{ id: 'about', ...serializeValue(docSnap.data()) }], fromCache: true };
      }
    } catch (e) {}

    if (fallbackSettings && (fallbackSettings.bioNo || fallbackSettings.bioEn || fallbackSettings.title)) {
      return { items: [{ id: 'about', ...serializeValue(fallbackSettings) }], fromCache: true };
    }

    return { items: [], fromCache: false };
  };

  // Handle Export
  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      let anyFromCache = false;

      // 1. Articles
      const articlesRes = await fetchCollectionWithFallback('articles', loadedData?.articles);
      if (articlesRes.fromCache) anyFromCache = true;
      const articles = articlesRes.items;

      // 2. Books
      const booksRes = await fetchCollectionWithFallback('books', loadedData?.books);
      if (booksRes.fromCache) anyFromCache = true;
      const books = booksRes.items;

      // 3. Diary
      const diaryRes = await fetchCollectionWithFallback('diary', loadedData?.diaries);
      if (diaryRes.fromCache) anyFromCache = true;
      const diary = diaryRes.items;

      // 4. Gallery
      const galleryRes = await fetchCollectionWithFallback('gallery', loadedData?.galleryPhotos);
      if (galleryRes.fromCache) anyFromCache = true;
      const gallery = galleryRes.items;

      // 5. Images
      const imagesRes = await fetchCollectionWithFallback('images');
      if (imagesRes.fromCache) anyFromCache = true;
      const images = imagesRes.items;

      // 6. Settings
      const settingsRes = await fetchSettingsWithFallback(loadedData?.aboutForm);
      if (settingsRes.fromCache) anyFromCache = true;
      const settings = settingsRes.items;

      // 7. Comments
      const commentsRes = await fetchCollectionWithFallback('comments');
      if (commentsRes.fromCache) anyFromCache = true;
      const comments = commentsRes.items;

      // 8. Orders
      const ordersRes = await fetchCollectionWithFallback('orders', loadedData?.orders);
      if (ordersRes.fromCache) anyFromCache = true;
      const orders = ordersRes.items;

      const totalItems = articles.length + books.length + diary.length + gallery.length + images.length + settings.length + comments.length + orders.length;

      if (totalItems === 0) {
        throw new Error('Fann ingen element i databasen eller i lokal hurtigbuffer. Viss Firebase-kvoten for dagen er oppbrukt på dette prosjektet, kan du gjere eit forsøk etter at sida har vore opna slik at cachen vert fylt.');
      }

      const backup: BackupFile = {
        version: 1,
        appName: 'Øivind H. Solheim Nettside',
        exportedAt: new Date().toISOString(),
        summary: {
          articles: articles.length,
          books: books.length,
          diary: diary.length,
          gallery: gallery.length,
          images: images.length,
          settings: settings.length,
          comments: comments.length,
          orders: orders.length,
        },
        data: {
          articles,
          books,
          diary,
          gallery,
          images,
          settings,
          comments,
          orders,
        },
      };

      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `solheim-nettside-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (anyFromCache) {
        setExportSuccess(`Sikkerheitskopien vart lasta ned! Totalt ${totalItems} element (artiklar: ${articles.length}, bøker: ${books.length}, dagbok: ${diary.length}, galleri: ${gallery.length}). Data vart trygt henta frå lokal hurtigbuffer/minne fordi Firebase-serverkvoten er oppbrukt for dagen på dette prosjektet.`);
      } else {
        setExportSuccess(`Sikkerheitskopien vart lasta ned! Totalt ${totalItems} element (artiklar: ${articles.length}, bøker: ${books.length}, dagbok: ${diary.length}, galleri: ${gallery.length}).`);
      }
    } catch (err: any) {
      console.error('Feil ved eksport:', err);
      if (err?.message?.includes('Quota') || err?.code === 'resource-exhausted') {
        setExportError('Kvoten for Firestore er for augneblinken brukt opp. Prøv igjen etter at kvoten er nullstilt, eller kobl til eit prosjekt med betaling.');
      } else {
        setExportError(`Kunne ikkje fullføre eksporten: ${err?.message || 'Ukjend feil'}`);
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file select for import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);
    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || !parsed.data) {
          throw new Error('Ugyldig filformat. Fila må vere ei gyldig JSON-sikkerheitskopi frå denne nettsida.');
        }
        setImportFile(parsed);
      } catch (err: any) {
        console.error('Feil ved lesing av backup-fil:', err);
        setImportError(`Klarte ikkje å lese JSON-fila: ${err.message}`);
        setImportFile(null);
      }
    };
    reader.readAsText(file);
  };

  // Perform Import
  const handleImport = async () => {
    if (!user) {
      setImportError('Du må vere innlogga som administrator for å importere data til databasen.');
      return;
    }

    if (!importFile || !importFile.data) {
      setImportError('Vel ei gyldig JSON-sikkerheitskopifil først.');
      return;
    }

    setImportError(null);
    setImportSuccess(null);

    const data = importFile.data;
    const tasks: { type: string; id: string; docData: any }[] = [];

    // 1. Articles
    if (selectedCategories.articles && data.articles && Array.isArray(data.articles)) {
      for (const item of data.articles) {
        const id = item.id || doc(collection(db, 'articles')).id;
        const cleaned: any = {
          title: item.title || 'Utan tittel',
          content: item.content || '',
          published: item.published ?? true,
          createdAt: parseTimestamp(item.createdAt),
          updatedAt: parseTimestamp(item.updatedAt || item.createdAt),
        };
        if (item.authorId) cleaned.authorId = String(item.authorId);
        if (item.language) cleaned.language = String(item.language);
        if (item.imageUrl) cleaned.imageUrl = String(item.imageUrl);
        if (item.imageCaption) cleaned.imageCaption = String(item.imageCaption);
        if (item.translationId) cleaned.translationId = String(item.translationId);
        if (item.slug) cleaned.slug = String(item.slug);

        tasks.push({ type: 'articles', id, docData: cleaned });
      }
    }

    // 2. Books
    if (selectedCategories.books && data.books && Array.isArray(data.books)) {
      for (const item of data.books) {
        const id = item.id || doc(collection(db, 'books')).id;
        const cleaned: any = {
          title: item.title || 'Utan tittel',
          description: item.description || '',
          publishedYear: Number(item.publishedYear) || new Date().getFullYear(),
          createdAt: parseTimestamp(item.createdAt),
          updatedAt: parseTimestamp(item.updatedAt || item.createdAt),
        };
        if (item.authorId) cleaned.authorId = String(item.authorId);
        if (item.coverImageUrl) cleaned.coverImageUrl = String(item.coverImageUrl);
        if (item.isbn) cleaned.isbn = String(item.isbn);
        if (item.buyLink) cleaned.buyLink = String(item.buyLink);
        if (typeof item.pageCount === 'number') cleaned.pageCount = item.pageCount;
        if (item.language) cleaned.language = item.language;
        if (item.titleEn) cleaned.titleEn = String(item.titleEn);
        if (item.descriptionEn) cleaned.descriptionEn = String(item.descriptionEn);
        if (item.buyLinkEn) cleaned.buyLinkEn = String(item.buyLinkEn);
        if (typeof item.price === 'number') cleaned.price = item.price;

        tasks.push({ type: 'books', id, docData: cleaned });
      }
    }

    // 3. Diary
    if (selectedCategories.diary && data.diary && Array.isArray(data.diary)) {
      for (const item of data.diary) {
        const id = item.id || doc(collection(db, 'diary')).id;
        const cleaned: any = {
          title: item.title || 'Utan tittel',
          content: item.content || '',
          createdAt: parseTimestamp(item.createdAt),
          updatedAt: parseTimestamp(item.updatedAt || item.createdAt),
        };
        if (item.authorId) cleaned.authorId = String(item.authorId);
        if (item.language) cleaned.language = item.language;
        if (item.published !== undefined) cleaned.published = Boolean(item.published);
        if (item.imageUrl) cleaned.imageUrl = String(item.imageUrl);
        if (item.imageCaption) cleaned.imageCaption = String(item.imageCaption);
        if (item.translationId) cleaned.translationId = String(item.translationId);
        if (item.slug) cleaned.slug = String(item.slug);

        tasks.push({ type: 'diary', id, docData: cleaned });
      }
    }

    // 4. Gallery
    if (selectedCategories.gallery && data.gallery && Array.isArray(data.gallery)) {
      for (const item of data.gallery) {
        const id = item.id || doc(collection(db, 'gallery')).id;
        const cleaned: any = {
          src: item.src || '',
          alt: item.alt || '',
          createdAt: parseTimestamp(item.createdAt),
        };
        if (item.className) cleaned.className = String(item.className);

        tasks.push({ type: 'gallery', id, docData: cleaned });
      }
    }

    // 5. Images (File manager assets)
    if (selectedCategories.images && data.images && Array.isArray(data.images)) {
      for (const item of data.images) {
        const id = item.id || doc(collection(db, 'images')).id;
        const cleaned: any = {
          filename: item.filename || 'bilde.jpg',
          url: item.url || '',
          authorId: item.authorId || user?.uid || 'admin',
          createdAt: parseTimestamp(item.createdAt),
        };

        tasks.push({ type: 'images', id, docData: cleaned });
      }
    }

    // 6. Settings (Om meg osv)
    if (selectedCategories.settings && data.settings && Array.isArray(data.settings)) {
      for (const item of data.settings) {
        const id = item.id || 'about';
        const docData = { ...item };
        delete docData.id;
        tasks.push({ type: 'settings', id, docData });
      }
    }

    // 7. Comments
    if (selectedCategories.comments && data.comments && Array.isArray(data.comments)) {
      for (const item of data.comments) {
        const id = item.id || doc(collection(db, 'comments')).id;
        const cleaned: any = {
          articleId: String(item.articleId),
          userId: String(item.userId || user?.uid),
          userName: String(item.userName || 'Lesar'),
          content: String(item.content || ''),
          createdAt: parseTimestamp(item.createdAt),
        };
        if (item.userAvatar) cleaned.userAvatar = String(item.userAvatar);
        if (item.quote !== undefined) cleaned.quote = item.quote;

        tasks.push({ type: 'comments', id, docData: cleaned });
      }
    }

    // 8. Orders (Viss inkludert i tryggingskopien)
    if (selectedCategories.orders && data.orders && Array.isArray(data.orders)) {
      for (const item of data.orders) {
        const id = item.id || doc(collection(db, 'orders')).id;
        const cleaned: any = { ...item };
        delete cleaned.id;
        if (cleaned.createdAt) cleaned.createdAt = parseTimestamp(cleaned.createdAt);
        tasks.push({ type: 'orders', id, docData: cleaned });
      }
    }

    if (tasks.length === 0) {
      setImportError('Ingen element vald for import.');
      return;
    }

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const failures: { type: string; id: string; error: string }[] = [];
    setFailedDetails([]);

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      setImportProgress({
        message: `${skipExisting ? 'Sjekkar/skriv' : 'Skriv'} ${task.type} (${i + 1} av ${tasks.length})...`,
        current: i + 1,
        total: tasks.length,
      });

      const docRef = doc(db, task.type, task.id);

      // Sjekk om dokumentet finst frå før dersom hopp over er aktivert
      if (skipExisting) {
        try {
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            skippedCount++;
            continue;
          }
        } catch (checkErr) {
          // Gå vidare til skriveforsøk dersom lesing feilar
        }
      }

      try {
        await setDoc(docRef, task.docData);
        successCount++;
      } catch (err: any) {
        console.error(`Feil ved import av ${task.type}/${task.id}:`, err);
        const errMessage = err?.message || err?.code || String(err);
        failures.push({ type: task.type, id: task.id, error: errMessage });
        errorCount++;
      }
    }

    setImportProgress(null);
    setFailedDetails(failures);
    invalidateCache();
    onDataChanged();

    if (errorCount === 0) {
      if (skippedCount > 0) {
        setImportSuccess(`Fullført! Importerte ${successCount} nye element (${skippedCount} vart hoppa over fordi dei allereie finst i databasen).`);
      } else {
        setImportSuccess(`Fullført! Importerte ${successCount} element til Firestore.`);
      }
    } else {
      const firstErr = failures[0]?.error || 'Ukjend feil';
      if (successCount === 0 && skippedCount === 0) {
        setImportError(`Ingen element vart importert (${errorCount} feila). Siste feilmelding frå Firebase: "${firstErr}".`);
      } else {
        setImportSuccess(
          `Fullført: ${successCount} vart importerte, ${skippedCount} vart hoppa over (eksisterer allereie), og ${errorCount} feila. Siste feil: "${firstErr}"`
        );
      }
    }
  };

  return (
    <section className="space-y-8" id="backup-manager-section">
      {/* HEADER */}
      <div className="border-b border-gray-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif text-brand-dark">Sikkerheitskopi & Migrering</h2>
          <p className="text-xs text-brand-muted mt-1">
            Last ned alt innhald frå nettsida som backup, eller gjenopprett data ved bytte av Firebase-prosjekt.
          </p>
        </div>

        <button
          onClick={() => setShowGuide(!showGuide)}
          className="inline-flex items-center gap-1.5 text-xs text-brand-dark hover:text-brand-muted transition-colors font-medium border border-gray-200 px-3 py-1.5 rounded-sm bg-gray-50 shrink-0"
          id="toggle-guide-btn"
        >
          <HelpCircle className="w-3.5 h-3.5 text-brand-muted" />
          <span>{showGuide ? 'Skjul rettleiing' : 'Korleis byte Firebase-prosjekt?'}</span>
          {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* STEP BY STEP GUIDE */}
      {showGuide && (
        <div className="bg-brand-sand/15 border border-brand-sand/40 p-5 text-brand-dark text-xs leading-relaxed space-y-3">
          <h3 className="font-serif font-bold text-sm text-brand-dark flex items-center gap-2">
            <Database className="w-4 h-4 text-brand-dark" />
            Slik byter du til eit nytt Firebase-prosjekt utan å miste noko:
          </h3>
          <ol className="list-decimal pl-5 space-y-2 text-brand-muted font-sans">
            <li>
              <strong className="text-brand-dark">Last ned sikkerheitskopi:</strong> Klikk på knappen «Last ned full sikkerheitskopi» nedanfor. Dette lagrar alle artiklar, bøker, dagbokinnlegg, galleribilete og innstillingar i éi JSON-fil på PC-en din.
            </li>
            <li>
              <strong className="text-brand-dark">Opprett det nye Firebase-prosjektet:</strong> Gå til <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="underline text-brand-dark">console.firebase.google.com</a>, opprett eit prosjekt (t.d. med Blaze pay-as-you-go viss du vil ha ubegrensa lesingar), og aktiver <em>Firestore Database</em> og <em>Google Authentication</em>.
            </li>
            <li>
              <strong className="text-brand-dark">Kople til den nye konfigurasjonen:</strong> Bytt ut verdiane i <code className="bg-white/80 px-1 py-0.5 border border-brand-sand/50 rounded font-mono text-[11px]">firebase-applet-config.json</code> med prosjekt-ID og nøklar frå det nye prosjektet ditt.
            </li>
            <li>
              <strong className="text-brand-dark">Gjenopprett innhaldet:</strong> Logg inn i Admin på nytt, gå hit til Sikkerheitskopi, vel JSON-fila di og trykk «Start gjenoppretting». Alt innhald, inkludert ID-ar og lenker, blir gjenoppretta nøyaktig som før!
            </li>
          </ol>
        </div>
      )}

      {/* TWO COLUMN INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLUMN 1: EXPORT */}
        <div className="bg-white border border-gray-100 shadow-sm p-6 flex flex-col justify-between" id="export-card">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-dark/5 flex items-center justify-center text-brand-dark">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-brand-dark">1. Last ned sikkerheitskopi</h3>
                <p className="text-xs text-brand-muted">Eksportér alt frå Firestore til JSON</p>
              </div>
            </div>

            <p className="text-xs text-brand-muted leading-relaxed">
              Dette lagrar ein komplett, strukturert kopi av all data på nettstaden din. Sikkerheitskopien inneheld:
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-gray-100 font-medium text-brand-dark">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-brand-muted" />
                <span>{currentCounts?.articles ?? '–'} Artiklar</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-brand-muted" />
                <span>{currentCounts?.books ?? '–'} Bøker</span>
              </div>
              <div className="flex items-center gap-2">
                <BookMarked className="w-3.5 h-3.5 text-brand-muted" />
                <span>{currentCounts?.diaries ?? '–'} Dagbokinnlegg</span>
              </div>
              <div className="flex items-center gap-2">
                <Image className="w-3.5 h-3.5 text-brand-muted" />
                <span>{currentCounts?.gallery ?? '–'} Galleribilete</span>
              </div>
            </div>

            {exportSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <span>{exportSuccess}</span>
              </div>
            )}

            {exportError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{exportError}</span>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-3 bg-brand-dark text-white text-xs uppercase tracking-widest font-semibold hover:bg-brand-dark/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              id="export-backup-btn"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Samlar saman og lagrar data...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Last ned full sikkerheitskopi (.json)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* COLUMN 2: IMPORT */}
        <div className="bg-white border border-gray-100 shadow-sm p-6 flex flex-col justify-between" id="import-card">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-dark/5 flex items-center justify-center text-brand-dark">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-brand-dark">2. Gjenopprett / Importer data</h3>
                <p className="text-xs text-brand-muted">Last opp JSON-backup til Firestore</p>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json,application/json"
              className="hidden"
              id="backup-file-input"
            />

            {/* DROPZONE / FILE SELECTOR */}
            {!importFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 hover:border-brand-dark/50 transition-colors p-8 text-center cursor-pointer bg-gray-50 flex flex-col items-center justify-center gap-2"
                id="dropzone-area"
              >
                <FileJson className="w-8 h-8 text-brand-muted" />
                <p className="text-xs font-medium text-brand-dark">
                  Klikk her for å velje ei <code className="font-mono">.json</code> sikkerheitskopi-fil
                </p>
                <p className="text-[11px] text-brand-muted">
                  Støttar filer eksportert frå dette systemet
                </p>
              </div>
            ) : (
              <div className="border border-brand-sand bg-gray-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-brand-dark" />
                    <span className="text-xs font-mono font-medium text-brand-dark truncate max-w-[200px]">
                      {importFileName}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setImportFile(null);
                      setImportFileName(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-[11px] text-brand-muted hover:text-red-600 underline"
                  >
                    Vel ei anna fil
                  </button>
                </div>

                <div className="text-xs text-brand-muted">
                  Eksportert: {importFile.exportedAt ? new Date(importFile.exportedAt).toLocaleString('nb-NO') : 'Ukjend'}
                </div>

                {/* CATEGORIES SELECTION */}
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-brand-muted block mb-2">
                    Vel kva du vil importere:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {importFile.data.articles && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCategories.articles}
                          onChange={(e) => setSelectedCategories({ ...selectedCategories, articles: e.target.checked })}
                          className="rounded text-brand-dark focus:ring-0"
                        />
                        <span>Artiklar ({importFile.data.articles.length})</span>
                      </label>
                    )}
                    {importFile.data.books && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCategories.books}
                          onChange={(e) => setSelectedCategories({ ...selectedCategories, books: e.target.checked })}
                          className="rounded text-brand-dark focus:ring-0"
                        />
                        <span>Bøker ({importFile.data.books.length})</span>
                      </label>
                    )}
                    {importFile.data.diary && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCategories.diary}
                          onChange={(e) => setSelectedCategories({ ...selectedCategories, diary: e.target.checked })}
                          className="rounded text-brand-dark focus:ring-0"
                        />
                        <span>Dagbok ({importFile.data.diary.length})</span>
                      </label>
                    )}
                    {importFile.data.gallery && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCategories.gallery}
                          onChange={(e) => setSelectedCategories({ ...selectedCategories, gallery: e.target.checked })}
                          className="rounded text-brand-dark focus:ring-0"
                        />
                        <span>Galleri ({importFile.data.gallery.length})</span>
                      </label>
                    )}
                    {importFile.data.images && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCategories.images}
                          onChange={(e) => setSelectedCategories({ ...selectedCategories, images: e.target.checked })}
                          className="rounded text-brand-dark focus:ring-0"
                        />
                        <span>Filer ({importFile.data.images.length})</span>
                      </label>
                    )}
                    {importFile.data.settings && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCategories.settings}
                          onChange={(e) => setSelectedCategories({ ...selectedCategories, settings: e.target.checked })}
                          className="rounded text-brand-dark focus:ring-0"
                        />
                        <span>Om meg ({importFile.data.settings.length})</span>
                      </label>
                    )}
                    {importFile.data.orders && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCategories.orders}
                          onChange={(e) => setSelectedCategories({ ...selectedCategories, orders: e.target.checked })}
                          className="rounded text-brand-dark focus:ring-0"
                        />
                        <span>Ordrar ({importFile.data.orders.length})</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* SKIP EXISTING OPTION */}
                <div className="pt-3 border-t border-gray-200">
                  <label className="flex items-start gap-2.5 cursor-pointer bg-white p-2.5 border border-gray-200/80 rounded-sm">
                    <input
                      type="checkbox"
                      checked={skipExisting}
                      onChange={(e) => setSkipExisting(e.target.checked)}
                      className="mt-0.5 rounded text-brand-dark focus:ring-0 cursor-pointer"
                      id="skip-existing-checkbox"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-brand-dark block">
                        Hopp over element som allereie finst i databasen (anbefalt)
                      </span>
                      <span className="text-[11px] text-brand-muted block mt-0.5 leading-normal">
                        Sjekkar kvar artikkel, bok og foto før skriving. Dersom dokumentet allereie eksisterer, blir det hoppa over utan feil eller duplisering.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* PROGRESS BAR */}
            {importProgress && (
              <div className="p-3 bg-brand-dark text-white text-xs space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span>{importProgress.message}</span>
                  <span className="font-mono">
                    {Math.round((importProgress.current / importProgress.total) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-white h-full transition-all duration-150"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {importSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <span>{importSuccess}</span>
              </div>
            )}

            {importError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            {/* FAILED DETAILS LIST */}
            {failedDetails.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="font-semibold flex items-center justify-between">
                  <span>Mislykka element ({failedDetails.length} stk):</span>
                  <span className="text-[10px] text-amber-700">Sjekk reglar for desse samlingane</span>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1 font-mono text-[11px] bg-white/70 p-2 border border-amber-200/60 rounded">
                  {failedDetails.map((f, idx) => (
                    <div key={idx} className="truncate" title={`${f.type}/${f.id}: ${f.error}`}>
                      <span className="font-bold text-brand-dark">{f.type}</span>/{f.id}: <span className="text-red-600">{f.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={handleImport}
              disabled={!importFile || !!importProgress}
              className="w-full py-3 bg-brand-dark text-white text-xs uppercase tracking-widest font-semibold hover:bg-brand-dark/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              id="start-import-btn"
            >
              {importProgress ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Skriv data til Firestore...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Start gjenoppretting / import</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
