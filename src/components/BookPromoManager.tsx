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
  Layers,
  ArrowRight,
  CreditCard
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
  onEditInBooksTab?: (book: Book) => void;
}

export default function BookPromoManager({ 
  books, 
  onDataChanged, 
  targetBookId,
  onClearTargetBookId,
  onEditInBooksTab
}: BookPromoManagerProps) {
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states for the book being configured for promotion
  const [formSlug, setFormSlug] = useState('');
  const [formActive, setFormActive] = useState(false);
  const [formCover, setFormCover] = useState('');
  const [formHeadline, setFormHeadline] = useState('');
  const [formBadge, setFormBadge] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formPrice, setFormPrice] = useState<number>(299);
  const [formSpecialPrice, setFormSpecialPrice] = useState<number | undefined>(undefined);
  const [formShippingText, setFormShippingText] = useState('Fri frakt rett heim i postkassa di');
  const [formBuyLink, setFormBuyLink] = useState('');
  const [formDirectSale, setFormDirectSale] = useState(true);
  const [formQuotes, setFormQuotes] = useState<BookQuote[]>([]);
  const [formHighlights, setFormHighlights] = useState<string[]>([]);

  // Automatically start editing when a target book ID is requested from Bøker-tab
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

  // Keep editingBook synchronized with fresh books data from Firestore
  useEffect(() => {
    if (editingBook && books.length > 0) {
      const fresh = books.find(b => b.id === editingBook.id);
      if (fresh) {
        setEditingBook(fresh);
      }
    }
  }, [books]);

  const handleStartEdit = (b: Book) => {
    setEditingBook(b);
    setSaveSuccess(false);
    
    // Default slug is either existing promoSlug or slugified title
    const defaultSlug = b.promoSlug || slugify(b.title) || 'bok';
    setFormSlug(defaultSlug);
    setFormActive(b.promoActive !== undefined ? b.promoActive : true);
    setFormCover(b.coverImageUrl || '');
    setFormHeadline(b.promoHeadline || 'Ein gripande roman om menneske, val og framtid');
    setFormBadge(b.promoBadge && b.promoBadge !== 'Signert utgåve frå forfattaren' ? b.promoBadge : 'Moglegheit for signert utgåve utan ekstra kostnad');
    setFormDescription(b.promoDescription || b.description || '');
    setFormExcerpt(b.promoExcerpt || '');
    setFormPrice(b.price || 299);
    setFormSpecialPrice(b.promoSpecialPrice);
    setFormShippingText(b.promoShippingText || 'Fri frakt rett heim i postkassa di');
    setFormBuyLink(b.buyLink || '');
    setFormDirectSale(b.promoDirectSale !== undefined ? b.promoDirectSale : true);
    
    setFormQuotes(b.promoQuotes && b.promoQuotes.length > 0 ? [...b.promoQuotes] : [
      { quote: 'Bøker som opnar dører til refleksjon og djupare meining.', author: 'Lesar', source: 'Omtale' }
    ]);

    setFormHighlights(b.promoHighlights && b.promoHighlights.length > 0 ? [...b.promoHighlights] : [
      'Moglegheit for signert utgåve med personleg helsing – utan ekstra kostnad',
      'Innbunden kvalitetsbok med vakkert omslag',
      'Sendast rett til di postkasse utan ekstra fraktkostnad'
    ]);
  };

  const handleCopyLink = (b: Book) => {
    const slug = b.promoSlug || slugify(b.title);
    const origin = window.location.origin;
    const url = `${origin}/salg/${slug}`;
    
    navigator.clipboard.writeText(url);
    setCopiedId(b.id || 'current');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook || !editingBook.id) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const cleanSlug = slugify(formSlug || editingBook.title);

      const updateData: Partial<Book> = {
        promoSlug: cleanSlug,
        promoActive: formActive,
        coverImageUrl: formCover || editingBook.coverImageUrl || '',
        promoHeadline: formHeadline.trim(),
        promoBadge: formBadge.trim(),
        promoDescription: formDescription.trim(),
        promoExcerpt: formExcerpt.trim(),
        price: Number(formPrice) || 299,
        promoSpecialPrice: formSpecialPrice ? Number(formSpecialPrice) : undefined,
        promoShippingText: formShippingText.trim(),
        buyLink: formBuyLink.trim(),
        promoDirectSale: formDirectSale,
        promoQuotes: formQuotes.filter(q => q.quote.trim() !== ''),
        promoHighlights: formHighlights.filter(h => h.trim() !== ''),
      };

      await updateDoc(doc(db, 'books', editingBook.id), {
        ...updateData,
        updatedAt: serverTimestamp()
      });

      invalidateCache();
      onDataChanged();
      setSaveSuccess(true);
      setTimeout(() => {
        setEditingBook(null);
      }, 1000);
    } catch (err) {
      console.error('Feil ved lagring av bokpromosjon:', err);
      alert('Kunne ikkje lagre bokpromosjonen. Sjekk at du har rettigheiter i Firebase.');
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
      {/* SECTION INTRO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-serif text-brand-dark">Bokpromosjon & Salgssider</h2>
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-sm text-brand-muted">
            Opprett og tilpass konverterande landingssider for kvar bok på adressa <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-brand-dark">/salg/navnet-pa-boken</code>.
          </p>
        </div>
      </div>

      {/* BOOKS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {books.map((b) => {
          const slug = b.promoSlug || slugify(b.title);
          const fullPath = `/salg/${slug}`;
          const isCopied = copiedId === b.id;
          const isActive = b.promoActive !== false;

          return (
            <div
              key={b.id}
              className="bg-white border border-gray-200 rounded-sm p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start gap-4 mb-4">
                  {b.coverImageUrl ? (
                    <div className="w-16 h-24 bg-stone-100 rounded-sm overflow-hidden shrink-0 border border-stone-200 shadow-sm">
                      <img src={b.coverImageUrl} alt={b.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-24 bg-stone-100 rounded-sm flex items-center justify-center shrink-0 border border-stone-200 text-stone-400">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  )}

                  <div className="min-w-0 flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {isActive ? 'Aktiv Salgsside' : 'Ikkje aktivert'}
                      </span>
                      <span className="text-[11px] text-brand-muted font-mono">{b.publishedYear}</span>
                    </div>

                    <h3 className="font-serif font-bold text-lg text-brand-dark leading-snug line-clamp-2">
                      {b.title}
                    </h3>
                    <p className="text-xs text-brand-muted mt-1">
                      Pris: kr {b.promoSpecialPrice || b.price || 299},-
                    </p>

                    {/* STRIPE / AMAZON / BUY LINK STATUS BADGE */}
                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                      <CreditCard className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      {(() => {
                        const linkType = getBuyLinkType(b.buyLink);
                        if (linkType === 'amazon') {
                          return (
                            <span className="text-amber-800 bg-amber-50 border border-amber-300/70 px-2 py-0.5 rounded text-[11px] font-mono truncate max-w-[210px]" title={b.buyLink}>
                              Amazon: {b.buyLink?.replace(/^https?:\/\//, '')}
                            </span>
                          );
                        }
                        if (linkType === 'stripe') {
                          return (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded text-[11px] font-mono truncate max-w-[210px]" title={b.buyLink}>
                              Stripe: {b.buyLink?.replace(/^https?:\/\//, '')}
                            </span>
                          );
                        }
                        if (b.buyLink) {
                          return (
                            <span className="text-stone-700 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded text-[11px] font-mono truncate max-w-[210px]" title={b.buyLink}>
                              Lenkje: {b.buyLink.replace(/^https?:\/\//, '')}
                            </span>
                          );
                        }
                        return (
                          <span className="text-stone-400 italic text-[11px]">
                            Ingen kjøpslenkje lagt inn
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* DIRECT URL DISPLAY */}
                <div className="bg-stone-50 border border-stone-200/80 rounded p-2.5 mb-4 flex items-center justify-between gap-2">
                  <div className="font-mono text-xs text-stone-700 truncate select-all">
                    {fullPath}
                  </div>
                  <button
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
                  onClick={() => handleStartEdit(b)}
                  className="flex-1 py-2.5 px-3 bg-brand-dark hover:bg-black text-white text-xs font-semibold tracking-wider uppercase transition-colors rounded-sm flex items-center justify-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Rediger kampanje
                </button>

                {onEditInBooksTab && (
                  <button
                    type="button"
                    onClick={() => onEditInBooksTab(b)}
                    className="py-2.5 px-3 border border-stone-300 hover:bg-stone-100 text-brand-dark text-[11px] font-semibold tracking-wider uppercase transition-colors rounded-sm"
                    title="Gå til fanen Bøker for å redigere boka"
                  >
                    Bøker
                  </button>
                )}

                <a
                  href={fullPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 border border-gray-300 hover:bg-gray-50 text-brand-dark text-xs font-semibold tracking-wider uppercase transition-colors rounded-sm flex items-center gap-1"
                  title="Sjå sida i ny fane"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Sjå side
                </a>
              </div>
            </div>
          );
        })}

        {books.length === 0 && (
          <div className="col-span-2 text-center py-12 bg-white border border-gray-100 p-8">
            <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h4 className="text-lg font-serif text-brand-dark mb-1">Ingen bøker registrert enno</h4>
            <p className="text-xs text-brand-muted">
              Gå til fana «Bøker» for å legge til ei bok først, så vil ho dukke opp her for å lage salgsside.
            </p>
          </div>
        )}
      </div>

      {/* EDIT PROMOTION MODAL / DRAWER */}
      {editingBook && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-sm w-full max-w-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            
            {/* MODAL HEADER */}
            <div className="p-6 bg-stone-50 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-sans uppercase tracking-widest text-brand-accent font-semibold block mb-1">
                  Rediger Salgsside & Kampanje
                </span>
                <h3 className="text-xl font-serif text-brand-dark">{editingBook.title}</h3>
              </div>
              <div className="flex items-center gap-3">
                {onEditInBooksTab && (
                  <button
                    type="button"
                    onClick={() => {
                      onEditInBooksTab(editingBook);
                      setEditingBook(null);
                    }}
                    className="text-[11px] font-semibold text-brand-dark hover:text-brand-accent uppercase tracking-wider underline flex items-center gap-1"
                    title="Gå til Bøker-fana for å redigere grunndata (tittel, utgjevingsår, isbn)"
                  >
                    Rediger grunndata i «Bøker» &rarr;
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="text-stone-400 hover:text-brand-dark p-1.5 rounded-full hover:bg-stone-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* MODAL FORM */}
            <form onSubmit={handleSavePromo} className="p-6 space-y-6 overflow-y-auto flex-grow text-xs">
              
              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Kampanjen vart lagra! Sida er oppdatert.</span>
                </div>
              )}

              {/* URL SLUG & ACTIVE */}
              <div className="bg-stone-50 border border-stone-200/80 p-4 rounded space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-brand-dark uppercase tracking-wider text-[11px]">
                    Nettsideadresse (URL)
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="rounded text-brand-dark focus:ring-0"
                    />
                    <span className="font-semibold text-brand-dark">Aktiver denne salgssida</span>
                  </label>
                </div>

                <div>
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
                      onClick={() => setFormSlug(slugify(editingBook.title))}
                      className="px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 font-sans text-[10px] uppercase tracking-wider font-semibold rounded shrink-0 transition-colors"
                      title="Generer slug automatisk frå tittelen på boka"
                    >
                      Bruk tittel
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-1">
                    Gjestar som besøker f.eks. <code className="font-mono">oivindsolheim.no/salg/{slugify(formSlug || 'boka')}</code> kjem direkte til denne sida.
                  </p>
                </div>
              </div>

              {/* COVER IMAGE */}
              <div className="space-y-2">
                <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px]">
                  Frontcover (Omslag)
                </label>
                <div className="flex items-center gap-4">
                  {formCover ? (
                    <div className="w-16 h-24 bg-stone-100 border border-stone-300 overflow-hidden shrink-0 rounded">
                      <img src={formCover} alt="Cover" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-24 bg-stone-100 border border-dashed border-stone-300 flex items-center justify-center shrink-0 rounded text-stone-400">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-grow space-y-2">
                    <input
                      type="url"
                      placeholder="https://... eller vel frå filarkiv"
                      value={formCover}
                      onChange={(e) => setFormCover(e.target.value)}
                      className="w-full p-2 border border-stone-300 focus:border-brand-dark outline-none text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowImagePicker(true)}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 uppercase tracking-wider text-[10px] font-semibold transition-colors"
                      >
                        Vel frå filarkiv
                      </button>
                      {formCover && (
                        <button
                          type="button"
                          onClick={() => setFormCover('')}
                          className="px-3 py-1.5 text-red-600 hover:text-red-800 uppercase tracking-wider text-[10px] font-semibold transition-colors"
                        >
                          Fjern omslag
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* HEADLINE & BADGE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                    Merke (Badge i Hero)
                  </label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="F.eks. «Moglegheit for signert utgåve utan ekstra kostnad»"
                    className="w-full p-2.5 border border-stone-300 focus:border-brand-dark outline-none"
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
                    className="w-full p-2.5 border border-stone-300 focus:border-brand-dark outline-none"
                  />
                </div>
              </div>

              {/* PRICING & SHIPPING */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-stone-50 border border-stone-200 rounded">
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
                    value={formSpecialPrice || ''}
                    onChange={(e) => setFormSpecialPrice(e.target.value ? parseInt(e.target.value) : undefined)}
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
                    placeholder="F.eks. «Fri frakt rett heim»"
                    className="w-full p-2 border border-stone-300 focus:border-brand-dark outline-none bg-white"
                  />
                </div>
              </div>

              {/* STRIPE OR AMAZON PAYMENT / PURCHASE LINK */}
              <div className="p-4 bg-amber-50 border border-amber-200/80 rounded space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-700" />
                    <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px]">
                      Kjøpslenkje (Stripe eller Amazon)
                    </label>
                  </div>
                  {formBuyLink && (
                    <a
                      href={formBuyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-brand-dark hover:text-brand-accent flex items-center gap-1"
                    >
                      Test lenkje <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  value={formBuyLink}
                  onChange={(e) => setFormBuyLink(e.target.value)}
                  placeholder="https://buy.stripe.com/... eller https://amazon.com/..."
                  className="w-full p-2.5 border border-stone-300 focus:border-brand-dark outline-none bg-white text-xs font-mono"
                />

                {/* DYNAMIC LINK TYPE DETECTION BADGE */}
                {(() => {
                  const detectedType = getBuyLinkType(formBuyLink);
                  if (detectedType === 'amazon') {
                    return (
                      <div className="flex items-center gap-1.5 text-xs text-amber-900 bg-amber-100/90 border border-amber-300/80 px-2.5 py-1.5 rounded">
                        <span className="font-bold">🛒 Amazon-lenkje oppdaga:</span>
                        <span>Salgssida viser automatisk «Kjøp frå Amazon».</span>
                      </div>
                    );
                  }
                  if (detectedType === 'stripe') {
                    return (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-900 bg-emerald-100/90 border border-emerald-300/80 px-2.5 py-1.5 rounded">
                        <span className="font-bold">💳 Stripe-lenkje oppdaga:</span>
                        <span>Salgssida viser automatisk «Trygg betaling med Stripe».</span>
                      </div>
                    );
                  }
                  if (formBuyLink.trim()) {
                    return (
                      <div className="flex items-center gap-1.5 text-xs text-stone-700 bg-stone-100 border border-stone-200 px-2.5 py-1.5 rounded">
                        <span className="font-semibold">🌐 Ekstern kjøpslenkje oppdaga.</span>
                      </div>
                    );
                  }
                  return null;
                })()}

                <span className="text-[11px] text-stone-600 block leading-normal">
                  Når kunden klikkar på «Kjøp boka», blir dei sendt direkte til denne eksterne lenkja (di Stripe Checkout eller Amazon-bokside).
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-stone-600 bg-white/80 p-2 rounded border border-amber-200/60 mt-1">
                  <span className="font-semibold text-amber-800 shrink-0">⚡ 100% Synkronisert:</span>
                  <span>Endrar du lenkja her, oppdaterast ho automatisk under fanen «Bøker» og i alle bokvisningar (/boker) og motsett.</span>
                </div>
              </div>

              {/* STORY DESCRIPTION (TEKST LENGER NED) */}
              <div>
                <label className="block font-semibold uppercase tracking-wider text-brand-dark text-[11px] mb-1">
                  Om boka (Tekst lenger ned på sida)
                </label>
                <textarea
                  rows={5}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Skriv ei engasjerande skildring om handlinga, tematikken, stemninga og kva lesaren kan forvente..."
                  className="w-full p-3 border border-stone-300 focus:border-brand-dark outline-none font-serif text-sm leading-relaxed resize-y"
                />
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
                  className="w-full p-3 border border-stone-300 focus:border-brand-dark outline-none font-serif text-sm leading-relaxed resize-y"
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
                      className="flex-grow p-2 border border-stone-300 focus:border-brand-dark outline-none"
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
                        className="flex-grow p-2 border border-stone-300 focus:border-brand-dark outline-none text-xs font-serif"
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
                        placeholder="Person / Namn (f.eks. Anna, lesar)"
                        className="p-1.5 border border-stone-300 focus:border-brand-dark outline-none text-xs"
                      />
                      <input
                        type="text"
                        value={q.source || ''}
                        onChange={(e) => updateQuote(i, 'source', e.target.value)}
                        placeholder="Kjelde (f.eks. Goodreads / Melding)"
                        className="p-1.5 border border-stone-300 focus:border-brand-dark outline-none text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* SAVE BUTTON */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
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
                      <span>Lagre bokpromosjon</span>
                    </>
                  )}
                </button>
              </div>

            </form>
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
