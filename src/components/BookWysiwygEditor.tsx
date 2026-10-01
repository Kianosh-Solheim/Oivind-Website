import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Save, 
  ArrowLeft, 
  ExternalLink, 
  Star, 
  Truck, 
  Check, 
  Plus, 
  Trash2, 
  X, 
  Image as ImageIcon, 
  BookOpen, 
  ShoppingBag,
  CreditCard,
  Monitor,
  Smartphone,
  Eye,
  MessageSquare,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Edit2
} from 'lucide-react';
import { Book, BookQuote } from '../types';
import { getBuyLinkType, slugify } from '../lib/utils';
import ImagePickerModal from './ImagePickerModal';

interface BookWysiwygEditorProps {
  book: Book;
  onSave: (updatedBook: Partial<Book>) => Promise<void>;
  onClose: () => void;
  onSwitchToForm: () => void;
}

type PreviewView = 'focus' | 'landing';
type DeviceMode = 'desktop' | 'mobile';

interface InlineEditProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  as?: 'input' | 'textarea';
  rows?: number;
  label?: string;
  prefix?: string;
  suffix?: string;
}

function InlineEdit({
  value,
  onChange,
  placeholder = 'Klikk for å skrive...',
  className = '',
  as = 'input',
  rows = 3,
  label,
  prefix = '',
  suffix = ''
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState(value);

  useEffect(() => {
    setTempVal(value);
  }, [value]);

  const handleCommit = () => {
    setIsEditing(false);
    onChange(tempVal);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTempVal(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (as === 'input' && e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="relative inline-block w-full my-1 group/edit z-30">
        {label && (
          <span className="block text-[10px] font-sans uppercase font-bold tracking-widest text-amber-500 mb-1">
            Redigerer: {label}
          </span>
        )}
        <div className="relative flex items-center">
          {as === 'textarea' ? (
            <textarea
              autoFocus
              rows={rows}
              value={tempVal}
              onChange={(e) => setTempVal(e.target.value)}
              onBlur={handleCommit}
              onKeyDown={handleKeyDown}
              className={`w-full p-2 bg-stone-900/90 text-white rounded border-2 border-amber-400 shadow-xl outline-none ring-2 ring-amber-400/30 ${className}`}
              placeholder={placeholder}
            />
          ) : (
            <input
              type="text"
              autoFocus
              value={tempVal}
              onChange={(e) => setTempVal(e.target.value)}
              onBlur={handleCommit}
              onKeyDown={handleKeyDown}
              className={`w-full p-2 bg-stone-900/90 text-white rounded border-2 border-amber-400 shadow-xl outline-none ring-2 ring-amber-400/30 ${className}`}
              placeholder={placeholder}
            />
          )}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handleCommit(); }}
            className="absolute right-2 top-2 p-1 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded shadow"
            title="Bruk endring"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className="text-[10px] text-stone-400 font-sans mt-0.5 block">
          Trykk Enter eller klikk utanfor for å stadfeste (Esc for å avbryte)
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`group/field relative cursor-pointer rounded transition-all duration-150 inline-block hover:outline hover:outline-2 hover:outline-amber-400/80 hover:bg-amber-400/10 p-1 -m-1 ${className}`}
      title="Klikk for å redigere denne teksten direkte"
    >
      <span className="relative">
        {prefix}{value || <span className="opacity-40 italic">{placeholder}</span>}{suffix}
      </span>
      <span className="opacity-0 group-hover/field:opacity-100 transition-opacity absolute -top-5 left-0 bg-stone-900 text-amber-300 text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20 flex items-center gap-1 border border-amber-400/40">
        <Edit2 className="w-2.5 h-2.5" />
        <span>{label ? `Rediger ${label}` : 'Klikk for å redigere'}</span>
      </span>
    </div>
  );
}

export default function BookWysiwygEditor({
  book,
  onSave,
  onClose,
  onSwitchToForm
}: BookWysiwygEditorProps) {
  // Preview View: 'focus' (Frontpage/Books hero spotlight) or 'landing' (full sales page /salg/:slug)
  const [currentView, setCurrentView] = useState<PreviewView>(book.isHeroFocus ? 'focus' : 'landing');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');

  // Working Book State
  const [title, setTitle] = useState(book.title || '');
  const [publishedYear, setPublishedYear] = useState<number>(book.publishedYear || new Date().getFullYear());
  const [pageCount, setPageCount] = useState<number | ''>(book.pageCount || '');
  const [price, setPrice] = useState<number>(book.price || 299);
  const [specialPrice, setSpecialPrice] = useState<number | ''>(book.promoSpecialPrice || '');
  const [shippingText, setShippingText] = useState(book.promoShippingText || 'Fri frakt rett heim i postkassa di');
  const [coverUrl, setCoverUrl] = useState(book.coverImageUrl || '');
  const [isHeroFocus, setIsHeroFocus] = useState(!!book.isHeroFocus);

  // Landing page / Promo fields
  const [headline, setHeadline] = useState(book.promoHeadline || 'Ein gripande roman om menneske, val og framtid');
  const [badge, setBadge] = useState(book.promoBadge || 'Aktuell roman');
  const [description, setDescription] = useState(book.promoDescription || book.description || '');
  const [excerpt, setExcerpt] = useState(book.promoExcerpt || '');
  const [authorNote, setAuthorNote] = useState(book.authorNote || '');
  const [showReviews, setShowReviews] = useState(book.showReviews !== false && book.showPromoQuotes !== false);
  const [quotes, setQuotes] = useState<BookQuote[]>(
    book.promoQuotes && book.promoQuotes.length > 0 
      ? book.promoQuotes 
      : [{ quote: 'Bøker som opnar dører til refleksjon og djupare meining.', author: 'Lesar', source: 'Omtale' }]
  );
  const [highlights, setHighlights] = useState<string[]>(
    book.promoHighlights && book.promoHighlights.length > 0
      ? book.promoHighlights
      : [
          'Innbunden kvalitetsbok med vakkert omslag',
          'Moglegheit for signert utgåve med personleg helsing',
          'Rask levering rett til di postkasse'
        ]
  );
  const [buyLink, setBuyLink] = useState(book.buyLink || '');
  const [slug, setSlug] = useState(book.promoSlug || slugify(book.title) || 'bok');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);

  const buyLinkType = getBuyLinkType(buyLink);
  const isAmazon = buyLinkType === 'amazon';
  const effectivePrice = specialPrice || price || 299;

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await onSave({
        title: title.trim(),
        publishedYear: Number(publishedYear) || new Date().getFullYear(),
        pageCount: pageCount ? Number(pageCount) : undefined,
        price: Number(price) || 299,
        coverImageUrl: coverUrl,
        isHeroFocus: isHeroFocus,
        buyLink: buyLink.trim(),

        // Promo / landing
        promoActive: true,
        promoSlug: slug.trim() || slugify(title),
        promoHeadline: headline.trim(),
        promoBadge: badge.trim(),
        promoDescription: description.trim(),
        promoExcerpt: excerpt.trim(),
        authorNote: authorNote.trim(),
        promoSpecialPrice: specialPrice ? Number(specialPrice) : undefined,
        promoShippingText: shippingText.trim(),
        promoHighlights: highlights.filter(h => h.trim().length > 0),
        promoQuotes: quotes.filter(q => q.quote && q.quote.trim().length > 0),
        showReviews: showReviews,
        showPromoQuotes: showReviews,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Feil ved lagring i WYSIWYG:', err);
      alert('Kunne ikkje lagre endringane.');
    } finally {
      setIsSaving(false);
    }
  };

  // Quotes management
  const handleUpdateQuote = (index: number, field: keyof BookQuote, val: string) => {
    setQuotes(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleAddQuote = () => {
    setQuotes(prev => [...prev, { quote: 'Ny omtale frå ein nøgd lesar...', author: 'Lesar', source: 'Omtale' }]);
  };

  const handleRemoveQuote = (index: number) => {
    setQuotes(prev => prev.filter((_, i) => i !== index));
  };

  // Highlights management
  const handleUpdateHighlight = (index: number, val: string) => {
    setHighlights(prev => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleAddHighlight = () => {
    setHighlights(prev => [...prev, 'Nytt kulepunkt om boka']);
  };

  const handleRemoveHighlight = (index: number) => {
    setHighlights(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-stone-950 z-[1000] flex flex-col overflow-hidden text-stone-100 font-sans select-none">
      
      {/* TOP CONTROLS & NAVIGATION BAR */}
      <header className="bg-stone-900 border-b border-stone-800 px-4 sm:px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 shadow-md z-40">
        
        {/* LEFT: TITLE & VIEW SWITCHERS */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-stone-800 text-stone-400 hover:text-white rounded transition-colors flex items-center gap-1 text-xs uppercase tracking-wider"
            title="Lukk redigering"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Avbryt</span>
          </button>

          <div className="h-5 w-px bg-stone-800 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest uppercase text-amber-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                WYSIWYG Bok-redigering
              </span>
              <span className="text-[11px] text-stone-400 font-serif truncate max-w-[200px] sm:max-w-xs">
                — {title || 'Uten tittel'}
              </span>
            </div>
            
            {/* VIEW SELECTOR BUTTONS */}
            <div className="flex items-center gap-1.5 mt-1">
              <button
                type="button"
                onClick={() => setCurrentView('focus')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all flex items-center gap-1.5 ${
                  currentView === 'focus'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>Bok i fokus (Forsida)</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentView('landing')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all flex items-center gap-1.5 ${
                  currentView === 'landing'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Landingsside / Salside</span>
              </button>
            </div>
          </div>
        </div>

        {/* CENTER: DEVICE TOGGLES & HINT */}
        <div className="hidden md:flex items-center gap-3 bg-stone-950/80 px-3 py-1 rounded border border-stone-800">
          <div className="flex items-center gap-1 text-xs text-stone-400">
            <button
              type="button"
              onClick={() => setDeviceMode('desktop')}
              className={`p-1.5 rounded transition-colors ${deviceMode === 'desktop' ? 'bg-stone-800 text-amber-300' : 'hover:text-white'}`}
              title="Datamaskin / Full breidd"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode('mobile')}
              className={`p-1.5 rounded transition-colors ${deviceMode === 'mobile' ? 'bg-stone-800 text-amber-300' : 'hover:text-white'}`}
              title="Mobilvising"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <span className="text-[11px] text-amber-400/90 font-sans flex items-center gap-1 border-l border-stone-800 pl-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Klikk direkte på tekstar for å redigere
          </span>
        </div>

        {/* RIGHT: SWITCH TO FORM & SAVE BUTTON */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSwitchToForm}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium rounded transition-colors"
            title="Byt til vanleg skjemavisning"
          >
            Skjemamodus
          </button>

          {slug && (
            <a
              href={`/salg/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 rounded transition-colors"
              title="Sjå sida i ekstern fane"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Lagra!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Lagrar...' : 'Lagre endringar'}</span>
              </>
            )}
          </button>
        </div>

      </header>

      {/* QUICK FLOATING ACTION BAR FOR QUICK TOGGLES */}
      <div className="bg-stone-900/95 border-b border-stone-800/80 px-6 py-2 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4">
          {/* FOCUS TOGGLE */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={isHeroFocus}
              onChange={(e) => setIsHeroFocus(e.target.checked)}
              className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
            />
            <span className={`font-semibold transition-colors ${isHeroFocus ? 'text-amber-300' : 'text-stone-400 group-hover:text-stone-300'}`}>
              🌟 Vis som hovudfokus på framsida (Hero)
            </span>
          </label>

          {/* REVIEWS TOGGLE */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={showReviews}
              onChange={(e) => setShowReviews(e.target.checked)}
              className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
            />
            <span className={`font-semibold transition-colors ${showReviews ? 'text-emerald-400' : 'text-stone-400 group-hover:text-stone-300'}`}>
              💬 Vis omtaler & «Kva seier lesarane?»
            </span>
          </label>
        </div>

        {/* COVER IMAGE PICKER BUTTON */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowImagePicker(true)}
            className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-xs flex items-center gap-1.5 transition-colors border border-stone-700"
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Byt biletomslag</span>
          </button>

          <span className="text-stone-500">|</span>

          {/* PRICE SHORTCUT */}
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400">Pris:</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
              className="w-16 px-1.5 py-0.5 bg-stone-800 border border-stone-700 rounded text-amber-300 font-bold font-mono text-xs text-right outline-none"
            />
            <span className="text-stone-400">kr</span>
          </div>

          {/* SPECIAL PRICE SHORTCUT */}
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-stone-400">Kampanjepris:</span>
            <input
              type="number"
              value={specialPrice}
              onChange={(e) => setSpecialPrice(e.target.value ? parseInt(e.target.value) : '')}
              placeholder="Valfri"
              className="w-16 px-1.5 py-0.5 bg-stone-800 border border-stone-700 rounded text-amber-300 font-mono text-xs text-right outline-none"
            />
            <span className="text-stone-400">kr</span>
          </div>
        </div>
      </div>

      {/* PREVIEW CANVAS / SCROLLABLE VIEWPORT */}
      <div className="flex-1 overflow-y-auto bg-stone-950 p-4 md:p-8 flex justify-center items-start">
        <div 
          className={`transition-all duration-300 w-full shadow-2xl rounded-sm overflow-hidden ${
            deviceMode === 'mobile' 
              ? 'max-w-[420px] border-4 border-stone-800 bg-white min-h-[800px] text-stone-900' 
              : 'max-w-6xl'
          }`}
        >
          
          {/* ========================================================================= */}
          {/* VIEW 1: BOK I FOKUS (HERO PÅ FRAMSIDA)                                    */}
          {/* ========================================================================= */}
          {currentView === 'focus' && (
            <div className="relative min-h-[650px] w-full bg-[#141210] text-white flex items-center justify-center px-6 md:px-12 py-12 md:py-16 overflow-hidden">
              {/* Ambient Glow */}
              {coverUrl && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none bg-amber-500/40" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-transparent pointer-events-none" />

              <div className="relative z-10 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                
                {/* Book Cover with Image Selector Trigger */}
                <div className="order-1 lg:order-2 lg:col-span-5 flex flex-col items-center justify-center">
                  <div className="relative group/cover max-w-[280px] sm:max-w-[320px] w-full">
                    {coverUrl ? (
                      <div className="relative rounded shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden bg-stone-900 aspect-[2/3]">
                        <img 
                          src={coverUrl} 
                          alt={title}
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/50 via-transparent to-transparent pointer-events-none" />
                      </div>
                    ) : (
                      <div className="w-full aspect-[2/3] bg-stone-900 rounded border border-white/10 flex flex-col items-center justify-center p-6 text-center shadow-2xl">
                        <BookOpen className="w-10 h-10 text-stone-500 mb-2" />
                        <span className="font-serif text-base text-white">{title}</span>
                      </div>
                    )}

                    {/* Change Cover Hover Overlay */}
                    <button
                      type="button"
                      onClick={() => setShowImagePicker(true)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover/cover:opacity-100 transition-opacity rounded flex flex-col items-center justify-center gap-2 text-white font-medium text-xs backdrop-blur-2xs"
                    >
                      <ImageIcon className="w-6 h-6 text-amber-400" />
                      <span>Klikk for å endre omslagsbilde</span>
                    </button>
                  </div>

                  {/* Featured Quote under Cover */}
                  {quotes.length > 0 && quotes[0]?.quote && (
                    <div className="mt-4 text-center max-w-xs px-2">
                      <p className="text-xs font-serif italic text-stone-300">
                        «
                        <InlineEdit
                          value={quotes[0].quote}
                          onChange={(val) => handleUpdateQuote(0, 'quote', val)}
                          placeholder="Sitat frå omtale..."
                          label="Framheva omtale"
                          className="font-serif italic"
                        />
                        »
                      </p>
                      <p className="text-[11px] font-sans tracking-wider uppercase text-amber-400/90 mt-1">
                        — 
                        <InlineEdit
                          value={quotes[0].author || 'Lesar'}
                          onChange={(val) => handleUpdateQuote(0, 'author', val)}
                          placeholder="Kjelde/Lesar"
                          label="Omtale-forfattar"
                          className="font-sans uppercase text-[10px]"
                        />
                      </p>
                    </div>
                  )}
                </div>

                {/* Left side: Book Hero Details (All Editable) */}
                <div className="order-2 lg:order-1 lg:col-span-7 space-y-4 text-center lg:text-left flex flex-col items-center lg:items-start">
                  
                  {/* Badge & Shipping */}
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-semibold tracking-widest uppercase rounded-full">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <InlineEdit
                        value={badge}
                        onChange={setBadge}
                        placeholder="Aktuell roman / Signert utgåve"
                        label="Topp-merke (Badge)"
                        className="text-xs uppercase font-semibold tracking-wider"
                      />
                    </span>

                    <span className="inline-flex items-center gap-1.5 text-xs text-stone-300 font-sans">
                      <Truck className="w-3.5 h-3.5 text-amber-400" />
                      <InlineEdit
                        value={shippingText}
                        onChange={setShippingText}
                        placeholder="F.eks. Fri frakt rett heim i postkassa"
                        label="Fraktinformasjon"
                        className="text-xs text-stone-300"
                      />
                    </span>
                  </div>

                  {/* Title */}
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif leading-[1.15] text-white">
                    <InlineEdit
                      value={title}
                      onChange={setTitle}
                      placeholder="Boktittel her..."
                      label="Boktittel"
                      className="font-serif text-3xl sm:text-5xl lg:text-6xl"
                    />
                  </h1>

                  {/* Promo Headline */}
                  <div className="text-base sm:text-xl font-serif italic text-amber-200/95 leading-snug">
                    «
                    <InlineEdit
                      value={headline}
                      onChange={setHeadline}
                      placeholder="Ein gripande roman om..."
                      label="Slagord / Ingress"
                      className="font-serif italic text-base sm:text-xl text-amber-200"
                    />
                    »
                  </div>

                  {/* Description Snippet */}
                  <div className="text-xs sm:text-sm text-stone-300 font-sans leading-relaxed max-w-xl">
                    <InlineEdit
                      value={description}
                      onChange={setDescription}
                      as="textarea"
                      rows={4}
                      placeholder="Kort handlingsreferat eller introduksjon til boka..."
                      label="Skildring"
                      className="text-xs sm:text-sm text-stone-300"
                    />
                  </div>

                  {/* Price display & Buy Button */}
                  <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-bold font-serif text-amber-400">
                        {effectivePrice} kr
                      </span>
                      {specialPrice && specialPrice !== price && (
                        <span className="text-sm text-stone-500 line-through">
                          {price} kr
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center gap-2 shadow-lg"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>{isAmazon ? 'Kjøp på Amazon' : 'Bestill boka'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentView('landing')}
                        className="px-4 py-2.5 border border-stone-700 hover:border-stone-500 text-stone-300 text-xs font-semibold uppercase tracking-wider rounded transition-colors"
                      >
                        Sjå heile salsida →
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: SELVE LANDINGSSIDA / SALGSSIDA (/salg/:slug)                      */}
          {/* ========================================================================= */}
          {currentView === 'landing' && (
            <div className="bg-[#FDFCF7] text-brand-dark min-h-screen selection:bg-amber-500/20 font-sans">
              
              {/* TOP NAVIGATION / BREADCRUMB */}
              <nav className="border-b border-stone-200/70 bg-white/95 px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-stone-500">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Alle bøker</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                    Kampanje & Salg
                  </span>
                  <span className="px-4 py-2 bg-brand-dark text-white text-[11px] font-semibold tracking-widest uppercase rounded-sm flex items-center gap-1.5 shadow-sm">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{isAmazon ? 'Kjøp frå Amazon' : 'Kjøp boka'}</span>
                  </span>
                </div>
              </nav>

              {/* HERO SECTION */}
              <section className="pt-10 pb-16 px-6 md:px-12 max-w-5xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                  
                  {/* LEFT: 3D FRONTCOVER */}
                  <div className="lg:col-span-5 flex flex-col items-center justify-center">
                    <div className="relative group/landcover max-w-[320px] w-full bg-white p-3 rounded shadow-2xl border border-stone-200">
                      {coverUrl ? (
                        <div className="relative aspect-[1/1.5] overflow-hidden rounded bg-stone-100">
                          <img 
                            src={coverUrl} 
                            alt={title} 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-0 bottom-0 left-0 w-3 bg-gradient-to-r from-black/20 via-white/10 to-transparent pointer-events-none" />
                        </div>
                      ) : (
                        <div className="aspect-[1/1.5] bg-stone-100 flex flex-col items-center justify-center p-6 text-center">
                          <BookOpen className="w-12 h-12 text-stone-300 mb-2" />
                          <span className="font-serif text-base font-bold">{title}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowImagePicker(true)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover/landcover:opacity-100 transition-opacity rounded flex flex-col items-center justify-center gap-1.5 text-white font-medium text-xs backdrop-blur-2xs"
                      >
                        <ImageIcon className="w-5 h-5 text-amber-400" />
                        <span>Byt biletomslag</span>
                      </button>
                    </div>

                    <div className="mt-3 text-center text-[11px] text-stone-500 uppercase tracking-wider font-mono">
                      <span>Fysisk bok • </span>
                      <InlineEdit
                        value={String(pageCount || '')}
                        onChange={(val) => setPageCount(val ? parseInt(val) || '' : '')}
                        placeholder="Sideantall"
                        label="Sidetall"
                        suffix=" sider • "
                        className="text-[11px] font-mono text-stone-500"
                      />
                      <span>Utgjeve </span>
                      <InlineEdit
                        value={String(publishedYear)}
                        onChange={(val) => setPublishedYear(parseInt(val) || new Date().getFullYear())}
                        placeholder="Årstal"
                        label="Utgjevingsår"
                        className="text-[11px] font-mono text-stone-500"
                      />
                    </div>
                  </div>

                  {/* RIGHT: HEADLINE, TITLE, PRICING & HIGHLIGHTS */}
                  <div className="lg:col-span-7 flex flex-col items-start space-y-4">
                    
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-900 rounded-full text-xs font-semibold">
                      <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                      <InlineEdit
                        value={badge}
                        onChange={setBadge}
                        placeholder="Aktuell roman / Signert utgåve"
                        label="Topp-merke (Badge)"
                        className="text-xs font-semibold text-amber-900"
                      />
                    </div>

                    {/* Book Title */}
                    <h1 className="text-3xl sm:text-5xl font-serif text-brand-dark leading-tight">
                      <InlineEdit
                        value={title}
                        onChange={setTitle}
                        placeholder="Boktittel her..."
                        label="Boktittel"
                        className="font-serif text-3xl sm:text-5xl text-brand-dark"
                      />
                    </h1>

                    {/* Headline */}
                    <div className="text-lg sm:text-xl font-serif text-stone-700 italic">
                      «
                      <InlineEdit
                        value={headline}
                        onChange={setHeadline}
                        placeholder="Ein gripande roman om..."
                        label="Slagord / Ingress"
                        className="font-serif italic text-lg sm:text-xl text-stone-700"
                      />
                      »
                    </div>

                    {/* Price and Shipping Box */}
                    <div className="p-4 bg-white border border-stone-200 rounded-sm w-full space-y-3 shadow-xs">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-xs text-stone-500 uppercase tracking-wider block">Pris</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-serif font-bold text-brand-dark">
                              {effectivePrice} kr
                            </span>
                            {specialPrice && specialPrice !== price && (
                              <span className="text-sm text-stone-400 line-through">
                                {price} kr
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] text-emerald-800 font-semibold flex items-center justify-end gap-1">
                            <Truck className="w-3.5 h-3.5 text-emerald-600" />
                            <InlineEdit
                              value={shippingText}
                              onChange={setShippingText}
                              placeholder="F.eks. Fri frakt rett heim"
                              label="Frakt-tekst"
                              className="text-[11px] font-semibold text-emerald-800"
                            />
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="w-full py-3 bg-brand-dark hover:bg-black text-white text-xs font-semibold uppercase tracking-widest rounded transition-colors shadow flex items-center justify-center gap-2"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>{isAmazon ? 'Bestill via Amazon' : 'Bestill boka no'}</span>
                      </button>
                    </div>

                    {/* Highlights (Kulepunkt) */}
                    <div className="w-full space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                          Framheva punkt:
                        </span>
                        <button
                          type="button"
                          onClick={handleAddHighlight}
                          className="text-[11px] text-amber-700 hover:text-black font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Legg til punkt
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {highlights.map((hl, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 group/hl p-1 rounded hover:bg-stone-100 text-xs text-stone-700">
                            <div className="flex items-center gap-2 flex-grow min-w-0">
                              <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <InlineEdit
                                value={hl}
                                onChange={(val) => handleUpdateHighlight(idx, val)}
                                placeholder="Kulepunkt..."
                                label={`Kulepunkt ${idx + 1}`}
                                className="text-xs text-stone-700"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveHighlight(idx)}
                              className="opacity-0 group-hover/hl:opacity-100 text-stone-400 hover:text-red-600 p-1"
                              title="Fjern kulepunkt"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>
              </section>

              {/* REVIEWS SECTION (OMTALER & LESARSTEMMER) */}
              <section className="bg-white border-y border-stone-200/70 py-12 px-6 md:px-12">
                <div className="max-w-4xl mx-auto">
                  
                  {/* Reviews Section Header & Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                      <span className="text-[11px] font-sans uppercase tracking-[0.25em] text-amber-700 font-semibold block mb-1">
                        Omtaler & Lesarstemmer
                      </span>
                      <h2 className="text-2xl font-serif text-brand-dark">Kva seier lesarane?</h2>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-stone-700">
                        <input
                          type="checkbox"
                          checked={showReviews}
                          onChange={(e) => setShowReviews(e.target.checked)}
                          className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Vis omtaler på sida</span>
                      </label>

                      <button
                        type="button"
                        onClick={handleAddQuote}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Legg til omtale
                      </button>
                    </div>
                  </div>

                  {!showReviews ? (
                    <div className="p-8 text-center bg-stone-50 border border-dashed border-stone-300 rounded text-xs text-stone-500">
                      Omtaleseksjonen er for tida slått <strong>av</strong>. Lesarane på sida vil ikkje sjå denne seksjonen.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {quotes.map((q, idx) => (
                        <div key={idx} className="bg-[#FDFCF7] border border-stone-200/80 p-6 rounded relative flex flex-col justify-between group/quote">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-3xl text-amber-500/40 font-serif leading-none">“</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveQuote(idx)}
                                className="opacity-0 group-hover/quote:opacity-100 text-stone-400 hover:text-red-600 p-1"
                                title="Fjern omtale"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <p className="font-serif text-stone-800 text-base italic leading-relaxed mb-4">
                              <InlineEdit
                                value={q.quote}
                                onChange={(val) => handleUpdateQuote(idx, 'quote', val)}
                                as="textarea"
                                rows={3}
                                placeholder="Sitattekst her..."
                                label={`Omtalesitat ${idx + 1}`}
                                className="font-serif text-base italic"
                              />
                            </p>
                          </div>

                          <div className="pt-3 border-t border-stone-200/50 flex items-center justify-between text-xs">
                            <span className="font-sans font-semibold text-brand-dark uppercase tracking-wider">
                              <InlineEdit
                                value={q.author || 'Lesar'}
                                onChange={(val) => handleUpdateQuote(idx, 'author', val)}
                                placeholder="Namn på lesar/forfattar"
                                label="Forfattar"
                                className="font-sans font-semibold uppercase text-xs"
                              />
                            </span>
                            <span className="text-stone-500 italic">
                              <InlineEdit
                                value={q.source || 'Litterært blikk'}
                                onChange={(val) => handleUpdateQuote(idx, 'source', val)}
                                placeholder="Kjelde/avis"
                                label="Kjelde"
                                className="text-xs text-stone-500 italic"
                              />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </section>

              {/* BOOK DETAILS / OM BOKA & EXCERPT */}
              <section className="py-16 px-6 md:px-12 max-w-4xl mx-auto space-y-12">
                
                {/* OM BOKA */}
                <div>
                  <h3 className="text-xl font-serif text-brand-dark mb-3 border-b border-stone-200 pb-2">
                    Om boka
                  </h3>
                  <div className="text-sm text-stone-700 font-sans leading-relaxed whitespace-pre-wrap">
                    <InlineEdit
                      value={description}
                      onChange={setDescription}
                      as="textarea"
                      rows={6}
                      placeholder="Skriv fullstendig omtale og bakgrunn om boka her..."
                      label="Om boka"
                      className="text-sm text-stone-700 leading-relaxed"
                    />
                  </div>
                </div>

                {/* SMAKEBIT / UTDRIAG */}
                <div className="p-6 bg-stone-50 border border-stone-200 rounded">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-800 mb-2">
                    Smakebit frå boka
                  </h4>
                  <div className="font-serif italic text-stone-700 text-sm leading-relaxed">
                    <InlineEdit
                      value={excerpt}
                      onChange={setExcerpt}
                      as="textarea"
                      rows={4}
                      placeholder="Legg til eit kort utdrag eller stemningsbilde frå boka..."
                      label="Smakebit frå boka"
                      className="font-serif italic text-sm text-stone-700"
                    />
                  </div>
                </div>

                {/* FORFATTERHELSING */}
                <div>
                  <h3 className="text-xl font-serif text-brand-dark mb-3 border-b border-stone-200 pb-2">
                    Helsing frå forfattaren
                  </h3>
                  <div className="text-sm text-stone-700 font-sans leading-relaxed">
                    <InlineEdit
                      value={authorNote}
                      onChange={setAuthorNote}
                      as="textarea"
                      rows={4}
                      placeholder="Personleg helsing frå Øivind Solheim..."
                      label="Forfattarhelsing"
                      className="text-sm text-stone-700 leading-relaxed"
                    />
                  </div>
                </div>

              </section>

            </div>
          )}

        </div>
      </div>

      {/* IMAGE PICKER MODAL */}
      {showImagePicker && (
        <ImagePickerModal
          onClose={() => setShowImagePicker(false)}
          onSelect={(url) => {
            setCoverUrl(url);
            setShowImagePicker(false);
          }}
        />
      )}

    </div>
  );
}
