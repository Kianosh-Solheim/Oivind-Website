import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink, 
  Edit3, 
  BookOpen, 
  ShoppingBag, 
  Star, 
  Plus, 
  Trash2, 
  X, 
  Save, 
  Info,
  CreditCard,
  Truck,
  Eye,
  AlertCircle
} from 'lucide-react';
import { doc, updateDoc, addDoc, deleteDoc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { invalidateCache } from '../lib/dbCache';
import { slugify, getBuyLinkType } from '../lib/utils';
import { Book, BookQuote } from '../types';
import ImagePickerModal from './ImagePickerModal';

interface BookPromoManagerProps {
  books: Book[];
  onDataChanged: () => void;
  targetBookId?: string | null;
  onClearTargetBookId?: () => void;
}

export default function BookPromoManager({ 
  books, 
  onDataChanged, 
  targetBookId,
  onClearTargetBookId
}: BookPromoManagerProps) {
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formPublishedYear, setFormPublishedYear] = useState<number>(new Date().getFullYear());
  const [formPageCount, setFormPageCount] = useState<number | ''>('');
  const [formIsbn, setFormIsbn] = useState('');
  const [formLanguage, setFormLanguage] = useState<'no' | 'en' | 'both'>('no');
  const [formTitleEn, setFormTitleEn] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDescriptionEn, setFormDescriptionEn] = useState('');
  const [formBuyLink, setFormBuyLink] = useState('');
  const [formBuyLinkEn, setFormBuyLinkEn] = useState('');
  const [formCover, setFormCover] = useState('');
  const [formPrice, setFormPrice] = useState<number>(299);
  const [formSpecialPrice, setFormSpecialPrice] = useState<number | ''>('');
  const [formShippingText, setFormShippingText] = useState('Fri frakt rett heim i postkassa di');
  
  // Hero focus state
  const [formIsHeroFocus, setFormIsHeroFocus] = useState(false);

  // Promo / Sales landing page states
  const [formActive, setFormActive] = useState(true);
  const [formSlug, setFormSlug] = useState('');
  const [formHeadline, setFormHeadline] = useState('');
  const [formBadge, setFormBadge] = useState('');
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formDirectSale, setFormDirectSale] = useState(true);
  const [formQuotes, setFormQuotes] = useState<BookQuote[]>([]);
  const [formHighlights, setFormHighlights] = useState<string[]>([]);
  const [formAuthorNote, setFormAuthorNote] = useState('');

  // Target book editing trigger
  useEffect(() => {
    if (targetBookId && books.length > 0) {
      const found = books.find(b => b.id === targetBookId);
      if (found) {
        handleStartEdit(found);
        if (onClearTargetBookId) {
          onClearTargetBookId();
        }
      }
    }
  }, [targetBookId, books]);

  // Keep editingBook synchronized with fresh data
  useEffect(() => {
    if (editingBook && books.length > 0) {
      const fresh = books.find(b => b.id === editingBook.id);
      if (fresh) {
        setEditingBook(fresh);
      }
    }
  }, [books]);

  const currentHeroBook = books.find(b => b.isHeroFocus);

  const handleStartCreate = () => {
    setEditingBook(null);
    setIsCreating(true);
    setSaveSuccess(false);

    setFormTitle('');
    setFormPublishedYear(new Date().getFullYear());
    setFormPageCount('');
    setFormIsbn('');
    setFormLanguage('no');
    setFormTitleEn('');
    setFormDescription('');
    setFormDescriptionEn('');
    setFormBuyLink('');
    setFormBuyLinkEn('');
    setFormPrice(299);
    setFormSpecialPrice('');
    setFormShippingText('Fri frakt rett heim i postkassa di');
    setFormCover('');
    setFormIsHeroFocus(false);

    setFormActive(true);
    setFormSlug('');
    setFormHeadline('Ein gripande roman om menneske, val og framtid');
    setFormBadge('Aktuell roman');
    setFormExcerpt('');
    setFormDirectSale(true);
    setFormQuotes([
      { quote: 'Bøker som opnar dører til refleksjon og djupare meining.', author: 'Lesar', source: 'Omtale' }
    ]);
    setFormHighlights([
      'Innbunden kvalitetsbok med vakkert omslag',
      'Moglegheit for signert utgåve med personleg helsing',
      'Rask levering rett til di postkasse'
    ]);
    setFormAuthorNote('');
  };

  const handleStartEdit = (b: Book) => {
    setIsCreating(false);
    setEditingBook(b);
    setSaveSuccess(false);

    const isAmazonBook = getBuyLinkType(b.buyLink || '') === 'amazon';

    setFormTitle(b.title || '');
    setFormPublishedYear(b.publishedYear || new Date().getFullYear());
    setFormPageCount(b.pageCount || '');
    setFormIsbn(b.isbn || '');
    setFormLanguage(b.language || 'no');
    setFormTitleEn(b.titleEn || '');
    setFormDescription(b.promoDescription || b.description || '');
    setFormDescriptionEn(b.descriptionEn || '');
    setFormBuyLink(b.buyLink || '');
    setFormBuyLinkEn(b.buyLinkEn || '');
    setFormPrice(b.price || 299);
    setFormSpecialPrice(b.promoSpecialPrice || '');
    setFormCover(b.coverImageUrl || '');
    setFormIsHeroFocus(!!b.isHeroFocus);

    setFormActive(b.promoActive !== false);
    setFormSlug(b.promoSlug || slugify(b.title) || 'bok');
    setFormHeadline(b.promoHeadline || 'Ein gripande roman om menneske, val og framtid');
    setFormBadge(
      b.promoBadge && (!isAmazonBook || !b.promoBadge.toLowerCase().includes('signert'))
        ? b.promoBadge
        : (isAmazonBook ? 'Tilgjengeleg på Amazon' : 'Signert utgåve frå forfattaren')
    );
    setFormShippingText(b.promoShippingText || (isAmazonBook ? 'Levering frå Amazon' : 'Fri frakt rett heim i postkassa di'));
    setFormExcerpt(b.promoExcerpt || '');
    setFormDirectSale(b.promoDirectSale !== false);
    setFormQuotes(b.promoQuotes && b.promoQuotes.length > 0 ? [...b.promoQuotes] : [
      { quote: 'Bøker som opnar dører til refleksjon og djupare meining.', author: 'Lesar', source: 'Omtale' }
    ]);
    setFormHighlights(b.promoHighlights && b.promoHighlights.length > 0 ? [...b.promoHighlights] : [
      isAmazonBook ? 'Levering direkte frå Amazon' : 'Moglegheit for signert utgåve med personleg helsing – utan ekstra kostnad',
      'Innbunden kvalitetsbok med vakkert omslag',
      isAmazonBook ? 'Trygg handel via Amazon' : 'Sendast rett til di postkasse utan ekstra fraktkostnad'
    ]);
    setFormAuthorNote(b.authorNote || '');
  };

  const handleCopyLink = (b: Book) => {
    const slug = b.promoSlug || slugify(b.title);
    const origin = window.location.origin;
    const url = `${origin}/salg/${slug}`;
    
    navigator.clipboard.writeText(url);
    setCopiedId(b.id || 'current');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleToggleHeroFocus = async (targetBook: Book, makeFocus: boolean) => {
    if (!targetBook.id) return;
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      if (makeFocus) {
        // Unset all other books
        books.forEach((b) => {
          if (b.id && b.id !== targetBook.id && b.isHeroFocus) {
            batch.update(doc(db, 'books', b.id), { isHeroFocus: false, updatedAt: serverTimestamp() });
          }
        });
        batch.update(doc(db, 'books', targetBook.id), { isHeroFocus: true, updatedAt: serverTimestamp() });
      } else {
        batch.update(doc(db, 'books', targetBook.id), { isHeroFocus: false, updatedAt: serverTimestamp() });
      }
      await batch.commit();
      invalidateCache();
      onDataChanged();
    } catch (err) {
      console.error('Feil ved endring av hovudfokus:', err);
      alert('Kunne ikkje oppdatere hovudfokus i Firebase.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Boka må ha ein tittel.');
      return;
    }
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const cleanSlug = slugify(formSlug || formTitle);
      const bookPayload: any = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        publishedYear: Number(formPublishedYear) || new Date().getFullYear(),
        pageCount: formPageCount ? Number(formPageCount) : 0,
        isbn: formIsbn.trim(),
        language: formLanguage,
        titleEn: formTitleEn.trim(),
        descriptionEn: formDescriptionEn.trim(),
        buyLink: formBuyLink.trim(),
        buyLinkEn: formBuyLinkEn.trim(),
        coverImageUrl: formCover || '',
        price: Number(formPrice) || 0,
        isHeroFocus: formIsHeroFocus,
        promoActive: formActive,
        promoSlug: cleanSlug,
        promoHeadline: formHeadline.trim(),
        promoBadge: formBadge.trim(),
        promoDescription: formDescription.trim(),
        promoExcerpt: formExcerpt.trim(),
        promoSpecialPrice: formSpecialPrice ? Number(formSpecialPrice) : null,
        promoShippingText: formShippingText.trim(),
        promoDirectSale: formDirectSale,
        promoQuotes: formQuotes.filter(q => q.quote.trim() !== ''),
        promoHighlights: formHighlights.filter(h => h.trim() !== ''),
        authorNote: formAuthorNote.trim(),
        updatedAt: serverTimestamp(),
      };

      if (isCreating) {
        const docRef = await addDoc(collection(db, 'books'), {
          ...bookPayload,
          createdAt: serverTimestamp(),
        });
        if (formIsHeroFocus) {
          const batch = writeBatch(db);
          books.forEach((b) => {
            if (b.id && b.id !== docRef.id && b.isHeroFocus) {
              batch.update(doc(db, 'books', b.id), { isHeroFocus: false, updatedAt: serverTimestamp() });
            }
          });
          await batch.commit();
        }
      } else if (editingBook && editingBook.id) {
        const batch = writeBatch(db);
        if (formIsHeroFocus) {
          books.forEach((b) => {
            if (b.id && b.id !== editingBook.id && b.isHeroFocus) {
              batch.update(doc(db, 'books', b.id), { isHeroFocus: false, updatedAt: serverTimestamp() });
            }
          });
        }
        batch.update(doc(db, 'books', editingBook.id), bookPayload);
        await batch.commit();
      }

      invalidateCache();
      onDataChanged();
      setSaveSuccess(true);
      setTimeout(() => {
        setEditingBook(null);
        setIsCreating(false);
      }, 700);
    } catch (err) {
      console.error('Feil ved lagring av bok:', err);
      alert('Kunne ikkje lagre boka. Sjekk at du er innlogga med administratortilgang.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBook = async (bookToDelete: Book) => {
    if (!bookToDelete.id) return;
    setIsSaving(true);
    try {
      await deleteDoc(doc(db, 'books', bookToDelete.id));
      invalidateCache();
      onDataChanged();
      setDeletingBook(null);
    } catch (err) {
      console.error('Feil ved sletting av bok:', err);
      alert('Kunne ikkje slette boka.');
    } finally {
      setIsSaving(false);
    }
  };

  const addQuote = () => {
    setFormQuotes([...formQuotes, { quote: '', author: '', source: '' }]);
  };

  const removeQuote = (index: number) => {
    setFormQuotes(formQuotes.filter((_, i) => i !== index));
  };

  const updateQuote = (index: number, field: keyof BookQuote, value: string) => {
    const next = [...formQuotes];
    next[index] = { ...next[index], [field]: value };
    setFormQuotes(next);
  };

  const addHighlight = () => {
    setFormHighlights([...formHighlights, '']);
  };

  const removeHighlight = (index: number) => {
    setFormHighlights(formHighlights.filter((_, i) => i !== index));
  };

  const updateHighlight = (index: number, value: string) => {
    const next = [...formHighlights];
    next[index] = value;
    setFormHighlights(next);
  };

  return (
    <div className="space-y-8">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-serif text-brand-dark">Bøker & Salgsadministrasjon</h2>
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-sm text-brand-muted">
            Administrer bøkene dine, salgssider, kjøpslenkjer og vel kva bok som skal vere hovudfokus på framsida.
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-dark hover:bg-black text-white text-xs font-semibold tracking-wider uppercase transition-colors shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Legg til ny bok
        </button>
      </div>

      {/* HERO FOCUS STATUS BANNER */}
      <div className={`p-4 border rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-3 ${
        currentHeroBook ? 'bg-amber-50/90 border-amber-300/80 text-amber-950' : 'bg-stone-50 border-stone-200 text-stone-700'
      }`}>
        <div className="flex items-start md:items-center gap-3">
          {currentHeroBook ? (
            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Star className="w-4 h-4 fill-white" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
          )}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider">
              {currentHeroBook ? '🌟 Aktivt hovudfokus på framsida' : 'Vanleg hero-seksjon aktiv på framsida'}
            </div>
            <div className="text-sm font-medium mt-0.5">
              {currentHeroBook ? (
                <>
                  Boka <span className="font-bold font-serif underline decoration-amber-400 decoration-2">«{currentHeroBook.title}»</span> erstattar no den vanlege heroen på framsida med direkte kjøpsknapp og «Les meir».
                </>
              ) : (
                'Inga bok er sett til hovudfokus. Den vanlege forfattar-heroen visast på forsida.'
              )}
            </div>
          </div>
        </div>

        {currentHeroBook && (
          <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-amber-200">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 hover:text-black underline px-2 py-1"
            >
              <Eye className="w-3.5 h-3.5" /> Sjå på framsida
            </a>
            <button
              type="button"
              onClick={() => handleToggleHeroFocus(currentHeroBook, false)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-sm transition-colors"
            >
              Slå av fokus
            </button>
          </div>
        )}
      </div>

      {/* BOOKS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {books.map((b) => {
          const slug = b.promoSlug || slugify(b.title);
          const fullPath = `/salg/${slug}`;
          const isCopied = copiedId === b.id;
          const isActive = b.promoActive !== false;
          const isHero = !!b.isHeroFocus;
          const linkType = getBuyLinkType(b.buyLink);

          return (
            <div
              key={b.id}
              className={`bg-white border rounded-sm p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative ${
                isHero ? 'border-amber-400 ring-2 ring-amber-300/60' : 'border-gray-200'
              }`}
            >
              <div>
                {/* TOP FOCUS BADGE */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  {isHero ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-sm">
                      <Star className="w-3.5 h-3.5 fill-white" /> Hovudfokus på framsida
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleHeroFocus(b, true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border border-stone-300 text-stone-600 bg-stone-50 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 transition-colors"
                      title="Gjer denne boka til hovudfokus på framsida (erstattar vanleg hero)"
                    >
                      <Star className="w-3 h-3 text-stone-400" /> Sett som hovudfokus
                    </button>
                  )}

                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {isActive ? 'Aktiv Salgsside' : 'Ikkje aktivert'}
                  </span>
                </div>

                <div className="flex items-start gap-4 mb-4">
                  {b.coverImageUrl ? (
                    <div className="w-20 h-28 bg-stone-100 rounded-sm overflow-hidden shrink-0 border border-stone-200 shadow-sm relative group">
                      <img src={b.coverImageUrl} alt={b.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-20 h-28 bg-stone-100 rounded-sm flex items-center justify-center shrink-0 border border-stone-200 text-stone-400">
                      <BookOpen className="w-8 h-8" />
                    </div>
                  )}

                  <div className="min-w-0 flex-grow">
                    <div className="flex items-center gap-2 mb-1 text-xs text-brand-muted">
                      <span className="font-mono">{b.publishedYear}</span>
                      <span>•</span>
                      <span className="uppercase font-semibold text-[10px] text-brand-accent">{b.language || 'no'}</span>
                      {b.pageCount ? <span>• {b.pageCount} s.</span> : null}
                    </div>

                    <h3 className="font-serif font-bold text-lg text-brand-dark leading-snug line-clamp-2">
                      {b.title}
                    </h3>
                    
                    {b.promoHeadline && (
                      <p className="text-xs text-stone-600 italic line-clamp-1 mt-0.5">
                        «{b.promoHeadline}»
                      </p>
                    )}

                    <div className="text-xs text-brand-muted mt-1.5 flex items-center gap-2">
                      <span className="font-semibold text-brand-dark">
                        Pris: kr {b.promoSpecialPrice || b.price || 0},-
                      </span>
                      {b.promoSpecialPrice && b.price && (
                        <span className="line-through text-stone-400 text-[11px]">
                          kr {b.price},-
                        </span>
                      )}
                    </div>

                    {/* BUY LINK TYPE STATUS */}
                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                      <CreditCard className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      {linkType === 'amazon' && (
                        <span className="text-amber-800 bg-amber-50 border border-amber-300/70 px-2 py-0.5 rounded text-[11px] font-mono truncate max-w-[210px]" title={b.buyLink}>
                          Amazon: {b.buyLink?.replace(/^https?:\/\//, '')}
                        </span>
                      )}
                      {linkType === 'stripe' && (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded text-[11px] font-mono truncate max-w-[210px]" title={b.buyLink}>
                          Stripe: {b.buyLink?.replace(/^https?:\/\//, '')}
                        </span>
                      )}
                      {linkType === 'other' && b.buyLink && (
                        <span className="text-stone-700 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded text-[11px] font-mono truncate max-w-[210px]" title={b.buyLink}>
                          Lenkje: {b.buyLink.replace(/^https?:\/\//, '')}
                        </span>
                      )}
                      {!b.buyLink && (
                        <span className="text-stone-400 italic text-[11px]">
                          Ingen kjøpslenkje lagt inn
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* DIRECT URL DISPLAY */}
                <div className="bg-stone-50 border border-stone-200/80 rounded p-2.5 mb-4 flex items-center justify-between gap-2">
                  <div className="font-mono text-xs text-stone-700 truncate select-all">
                    {fullPath}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(b)}
                    className="shrink-0 p-1.5 hover:bg-stone-200 text-stone-600 rounded transition-colors"
                    title="Kopier full lenke"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => handleStartEdit(b)}
                  className="flex-1 py-2.5 px-3 bg-brand-dark hover:bg-black text-white text-xs font-semibold tracking-wider uppercase transition-colors rounded-sm flex items-center justify-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Rediger bok
                </button>

                <a
                  href={fullPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 border border-gray-300 hover:bg-gray-50 text-brand-dark text-xs font-semibold tracking-wider uppercase transition-colors rounded-sm flex items-center gap-1"
                  title="Sjå sida i ny fane"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Sjå side
                </a>

                <button
                  type="button"
                  onClick={() => setDeletingBook(b)}
                  className="py-2.5 px-3 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold tracking-wider uppercase transition-colors rounded-sm"
                  title="Slett denne boka"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {books.length === 0 && (
          <div className="col-span-1 md:col-span-2 text-center py-16 bg-white border border-gray-100 p-8 rounded-sm">
            <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h4 className="text-lg font-serif text-brand-dark mb-1">Ingen bøker registrert enno</h4>
            <p className="text-xs text-brand-muted mb-6">
              Klikk på knappen under for å opprette di første bok med full salgsside og forside-fokus.
            </p>
            <button
              type="button"
              onClick={handleStartCreate}
              className="inline-flex items-center gap-2 px-5 py-3 bg-brand-dark hover:bg-black text-white text-xs font-semibold tracking-wider uppercase transition-colors"
            >
              <Plus className="w-4 h-4" /> Legg til di første bok
            </button>
          </div>
        )}
      </div>

      {/* EDIT / CREATE BOOK MODAL */}
      {(editingBook || isCreating) && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-sm w-full max-w-4xl shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
            
            {/* MODAL HEADER */}
            <div className="p-5 md:p-6 bg-stone-50 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-sans uppercase tracking-widest text-brand-accent font-semibold block mb-1">
                  {isCreating ? 'Opprett ny bok' : 'Rediger bok & salgsside'}
                </span>
                <h3 className="text-xl md:text-2xl font-serif text-brand-dark">
                  {isCreating ? 'Ny bok' : (formTitle || editingBook?.title || 'Rediger bok')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingBook(null);
                  setIsCreating(false);
                }}
                className="text-stone-400 hover:text-brand-dark p-2 rounded-full hover:bg-stone-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MODAL FORM */}
            <form onSubmit={handleSaveBook} className="p-6 space-y-6 overflow-y-auto flex-grow text-xs">
              
              {saveSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">Boka vart lagra! Sida og framsida er oppdatert.</span>
                </div>
              )}

              {/* SECTION: HOVUDFOKUS PÅ FRAMSIDA */}
              <div className={`p-4 rounded border transition-colors ${
                formIsHeroFocus 
                  ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-300/40' 
                  : 'bg-stone-50 border-stone-200'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Star className={`w-4 h-4 ${formIsHeroFocus ? 'text-amber-500 fill-amber-500' : 'text-stone-400'}`} />
                      <label htmlFor="heroFocusToggle" className="font-serif font-bold text-sm text-brand-dark cursor-pointer">
                        Gjer denne boka til hovudfokus på framsida
                      </label>
                    </div>
                    <p className="text-stone-600 text-xs leading-relaxed max-w-2xl">
                      Dersom denne toggelen er slått på, erstattast den vanlege hero-seksjonen på forsida av denne boka. Forsida får då ein direkte kjøpsknapp til Stripe/Amazon-lenkja og ein knapp med «Les meir». Berre éi bok om gongen kan vere hovudfokus.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      id="heroFocusToggle"
                      type="checkbox"
                      checked={formIsHeroFocus}
                      onChange={(e) => setFormIsHeroFocus(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>

              {/* SECTION: OMSLAG OG SPRÅK */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-4 bg-stone-50/70 border border-stone-200 rounded">
                <div className="md:col-span-4">
                  <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-2">
                    Bokomslag (Cover)
                  </label>
                  <div className="flex flex-col items-center gap-3">
                    {formCover ? (
                      <div className="w-28 h-40 bg-stone-100 border border-stone-300 overflow-hidden rounded shadow-sm relative group">
                        <img src={formCover} alt="Cover" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormCover('')}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold"
                        >
                          Fjern bilete
                        </button>
                      </div>
                    ) : (
                      <div className="w-28 h-40 bg-stone-100 border-2 border-dashed border-stone-300 flex flex-col items-center justify-center rounded text-stone-400 p-2 text-center">
                        <BookOpen className="w-8 h-8 mb-1" />
                        <span className="text-[10px]">Ingen omslag</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowImagePicker(true)}
                      className="w-full py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-[11px] font-semibold uppercase tracking-wider rounded transition-colors"
                    >
                      Vel frå filarkiv
                    </button>
                  </div>
                </div>

                <div className="md:col-span-8 space-y-4">
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                      Omslagsadresse (URL)
                    </label>
                    <input
                      type="url"
                      placeholder="https://... eller vel frå filarkivet"
                      value={formCover}
                      onChange={(e) => setFormCover(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 focus:border-brand-dark outline-none bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                      Språkutgåve
                    </label>
                    <select
                      value={formLanguage}
                      onChange={(e) => setFormLanguage(e.target.value as any)}
                      className="w-full p-2.5 border border-stone-300 focus:border-brand-dark outline-none bg-white text-xs"
                    >
                      <option value="no">Norsk utgåve</option>
                      <option value="en">Engelsk utgåve (English)</option>
                      <option value="both">Begge språk (Norsk og Engelsk)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                        Utgjevingsår *
                      </label>
                      <input
                        type="number"
                        required
                        value={formPublishedYear}
                        onChange={(e) => setFormPublishedYear(parseInt(e.target.value) || new Date().getFullYear())}
                        className="w-full p-2 border border-stone-300 focus:border-brand-dark outline-none bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                        Sidetal
                      </label>
                      <input
                        type="number"
                        value={formPageCount}
                        onChange={(e) => setFormPageCount(e.target.value ? parseInt(e.target.value) : '')}
                        placeholder="F.eks. 280"
                        className="w-full p-2 border border-stone-300 focus:border-brand-dark outline-none bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                        ISBN (valfritt)
                      </label>
                      <input
                        type="text"
                        value={formIsbn}
                        onChange={(e) => setFormIsbn(e.target.value)}
                        placeholder="978-..."
                        className="w-full p-2 border border-stone-300 focus:border-brand-dark outline-none bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: GRUNNDATA (NORSK) */}
              <div className="space-y-4">
                <div className="border-b border-stone-200 pb-1">
                  <h4 className="font-serif font-bold text-sm text-brand-dark">Bokdetaljar & Tekst (Norsk)</h4>
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                    Boktittel (Norsk) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => {
                      setFormTitle(e.target.value);
                      if (!formSlug || isCreating) {
                        setFormSlug(slugify(e.target.value));
                      }
                    }}
                    placeholder="Tittel på boka"
                    className="w-full p-3 border border-stone-300 focus:border-brand-dark outline-none font-serif text-base"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                    Skildring / Om boka *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Skriv ei engasjerande skildring om handlinga, tematikken og kva boka handlar om..."
                    className="w-full p-3 border border-stone-300 focus:border-brand-dark outline-none font-serif text-sm leading-relaxed resize-y"
                  />
                </div>
              </div>

              {/* SECTION: ENGELSK INNHOLD (dersom 'en' eller 'both') */}
              {(formLanguage === 'en' || formLanguage === 'both') && (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded space-y-4">
                  <div className="border-b border-stone-200 pb-1">
                    <h4 className="font-serif font-bold text-sm text-brand-dark">Engelsk innhald (English version)</h4>
                  </div>
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                      Title (English)
                    </label>
                    <input
                      type="text"
                      value={formTitleEn}
                      onChange={(e) => setFormTitleEn(e.target.value)}
                      placeholder="Book title in English"
                      className="w-full p-2.5 border border-stone-300 focus:border-brand-dark outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                      Description (English)
                    </label>
                    <textarea
                      rows={3}
                      value={formDescriptionEn}
                      onChange={(e) => setFormDescriptionEn(e.target.value)}
                      placeholder="English description or synopsis..."
                      className="w-full p-2.5 border border-stone-300 focus:border-brand-dark outline-none bg-white font-serif"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                      English Buy / Amazon link (Optional)
                    </label>
                    <input
                      type="url"
                      value={formBuyLinkEn}
                      onChange={(e) => setFormBuyLinkEn(e.target.value)}
                      placeholder="https://amazon.com/... (optional English buy link)"
                      className="w-full p-2.5 border border-stone-300 focus:border-brand-dark outline-none bg-white font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {/* SECTION: PRIS OG KJØPSLENKJE (STRIPE / AMAZON) */}
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded space-y-4">
                <div className="border-b border-amber-200/80 pb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-800" />
                    <h4 className="font-serif font-bold text-sm text-amber-950">Pris & Kjøpslenkje (Stripe eller Amazon)</h4>
                  </div>
                  {formBuyLink && (
                    <a
                      href={formBuyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-amber-900 hover:text-black flex items-center gap-1 underline"
                    >
                      Test kjøpslenkje <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                      Pris (NOK)
                    </label>
                    <input
                      type="number"
                      value={formPrice}
                      onChange={(e) => setFormPrice(parseInt(e.target.value) || 0)}
                      placeholder="299"
                      className="w-full p-2 border border-stone-300 focus:border-brand-dark outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                      Valfri kampanjepris (NOK)
                    </label>
                    <input
                      type="number"
                      value={formSpecialPrice}
                      onChange={(e) => setFormSpecialPrice(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="La stå tomt om vanleg pris"
                      className="w-full p-2 border border-stone-300 focus:border-brand-dark outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                      Frakt-tekst
                    </label>
                    <input
                      type="text"
                      value={formShippingText}
                      onChange={(e) => setFormShippingText(e.target.value)}
                      placeholder="F.eks. «Levering frå Amazon»"
                      className="w-full p-2 border border-stone-300 focus:border-brand-dark outline-none bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                    Direkte kjøpslenkje (Stripe Checkout eller Amazon-adresse)
                  </label>
                  <input
                    type="url"
                    value={formBuyLink}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormBuyLink(val);
                      const isAmazon = getBuyLinkType(val) === 'amazon';
                      if (isAmazon && formShippingText === 'Fri frakt rett heim i postkassa di') {
                        setFormShippingText('Levering frå Amazon');
                      }
                    }}
                    placeholder="https://buy.stripe.com/... eller https://amazon.com/..."
                    className="w-full p-2.5 border border-stone-300 focus:border-brand-dark outline-none bg-white text-xs font-mono"
                  />

                  {/* DYNAMIC LINK DETECTION BADGE */}
                  {(() => {
                    const detectedType = getBuyLinkType(formBuyLink);
                    if (detectedType === 'amazon') {
                      return (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-900 bg-amber-100/90 border border-amber-300/80 px-2.5 py-1.5 rounded">
                          <span className="font-bold">🛒 Amazon-lenkje oppdaga:</span>
                          <span>Kjøpsknappen på framsida og salgssida vil ta kunden direkte til Amazon.</span>
                        </div>
                      );
                    }
                    if (detectedType === 'stripe') {
                      return (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-900 bg-emerald-100/90 border border-emerald-300/80 px-2.5 py-1.5 rounded">
                          <span className="font-bold">💳 Stripe-lenkje oppdaga:</span>
                          <span>Kjøpsknappen på framsida og salgssida vil ta kunden direkte til trygg betaling med Stripe.</span>
                        </div>
                      );
                    }
                    if (formBuyLink.trim()) {
                      return (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-stone-700 bg-stone-100 border border-stone-200 px-2.5 py-1.5 rounded">
                          <span className="font-semibold">🌐 Ekstern kjøpslenkje:</span>
                          <span>Kjøpsknappen på framsida sender lesaren direkte til denne lenkja.</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* SECTION: SALGSSIDE & KAMPANJE */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-stone-200 pb-1 flex items-center justify-between">
                  <h4 className="font-serif font-bold text-sm text-brand-dark">Salgsside & Marknadsføring (/salg/[slug])</h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="rounded text-brand-dark focus:ring-0"
                    />
                    <span className="font-semibold text-brand-dark">Aktiver landingsside for denne boka</span>
                  </label>
                </div>

                {/* URL SLUG */}
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                    Nettsideadresse (URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-stone-500 font-mono text-xs">/salg/</span>
                    <input
                      type="text"
                      required
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                      placeholder="navnet-pa-boken"
                      className="flex-grow p-2 text-xs font-mono border border-stone-300 focus:border-brand-dark outline-none bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setFormSlug(slugify(formTitle || 'bok'))}
                      className="px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 font-sans text-[10px] uppercase tracking-wider font-semibold rounded shrink-0 transition-colors"
                      title="Generer slug automatisk frå tittelen på boka"
                    >
                      Bruk tittel
                    </button>
                  </div>
                </div>

                {/* HEADLINE & BADGE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                      Merke / Badge
                    </label>
                    <input
                      type="text"
                      value={formBadge}
                      onChange={(e) => setFormBadge(e.target.value)}
                      placeholder="F.eks. «Tilgjengeleg på Amazon» eller «Signert utgåve»"
                      className="w-full p-2.5 border border-stone-300 focus:border-brand-dark outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                      Slagord / Hero-ingress
                    </label>
                    <input
                      type="text"
                      value={formHeadline}
                      onChange={(e) => setFormHeadline(e.target.value)}
                      placeholder="F.eks. «Ein intens og rørande roman...»"
                      className="w-full p-2.5 border border-stone-300 focus:border-brand-dark outline-none bg-white"
                    />
                  </div>
                </div>

                {/* EXCERPT / UTDRAG */}
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                    Utdrag / Smakebit frå boka (valfritt)
                  </label>
                  <textarea
                    rows={3}
                    value={formExcerpt}
                    onChange={(e) => setFormExcerpt(e.target.value)}
                    placeholder="Eit utdrag frå kapittel 1 som gjer lesaren nysgjerrig..."
                    className="w-full p-3 border border-stone-300 focus:border-brand-dark outline-none font-serif text-sm leading-relaxed resize-y bg-white"
                  />
                </div>

                {/* HIGHLIGHTS */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold uppercase tracking-wider text-brand-dark text-[11px]">
                      Kulepunkt (Kvifor lese boka)
                    </label>
                    <button
                      type="button"
                      onClick={addHighlight}
                      className="text-[11px] font-semibold text-brand-accent hover:text-brand-dark flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Legg til kulepunkt
                    </button>
                  </div>
                  {formHighlights.map((hl, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={hl}
                        onChange={(e) => updateHighlight(i, e.target.value)}
                        placeholder="F.eks. «Gripande skildring frå kysten»"
                        className="flex-grow p-2 border border-stone-300 focus:border-brand-dark outline-none bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeHighlight(i)}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* QUOTES & REVIEWS */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold uppercase tracking-wider text-brand-dark text-[11px]">
                      Sitat & Omtaler
                    </label>
                    <button
                      type="button"
                      onClick={addQuote}
                      className="text-[11px] font-semibold text-brand-accent hover:text-brand-dark flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Legg til sitat
                    </button>
                  </div>
                  {formQuotes.map((q, i) => (
                    <div key={i} className="p-3 bg-stone-50 border border-stone-200 rounded space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <textarea
                          rows={2}
                          value={q.quote}
                          onChange={(e) => updateQuote(i, 'quote', e.target.value)}
                          placeholder="«Ei bok som sit i lenge etterpå...»"
                          className="flex-grow p-2 border border-stone-300 focus:border-brand-dark outline-none text-xs font-serif bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => removeQuote(i)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={q.author || ''}
                          onChange={(e) => updateQuote(i, 'author', e.target.value)}
                          placeholder="Namn (f.eks. Anna, lesar)"
                          className="p-1.5 border border-stone-300 focus:border-brand-dark outline-none text-xs bg-white"
                        />
                        <input
                          type="text"
                          value={q.source || ''}
                          onChange={(e) => updateQuote(i, 'source', e.target.value)}
                          placeholder="Kjelde (f.eks. Goodreads / Omtale)"
                          className="p-1.5 border border-stone-300 focus:border-brand-dark outline-none text-xs bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* AUTHOR NOTE */}
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                    Personleg helsing frå forfattaren (valfritt)
                  </label>
                  <textarea
                    rows={2}
                    value={formAuthorNote}
                    onChange={(e) => setFormAuthorNote(e.target.value)}
                    placeholder="Ein personleg kommentar frå forfattaren til lesaren..."
                    className="w-full p-2.5 border border-stone-300 focus:border-brand-dark outline-none bg-white font-serif"
                  />
                </div>
              </div>

              {/* SAVE / SUBMIT ACTIONS */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingBook(null);
                    setIsCreating(false);
                  }}
                  className="px-4 py-2.5 border border-stone-300 text-stone-600 hover:bg-stone-50 text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-brand-dark hover:bg-black text-white text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Lagrar...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{isCreating ? 'Opprett bok' : 'Lagre endringar'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingBook && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm max-w-md w-full p-6 border border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-serif font-bold text-lg text-brand-dark">Slett bok</h3>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              Er du sikker på at du vil slette boka <span className="font-semibold text-brand-dark">«{deletingBook.title}»</span>? Dette vil fjerne boka og hennar salgsside permanent frå databasen.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingBook(null)}
                className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold uppercase tracking-wider"
              >
                Avbryt
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleDeleteBook(deletingBook)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                {isSaving ? 'Slettar...' : 'Ja, slett boka'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE PICKER MODAL */}
      {showImagePicker && (
        <ImagePickerModal
          onClose={() => setShowImagePicker(false)}
          onSelect={(url) => {
            setFormCover(url);
            setShowImagePicker(false);
          }}
        />
      )}
    </div>
  );
}
