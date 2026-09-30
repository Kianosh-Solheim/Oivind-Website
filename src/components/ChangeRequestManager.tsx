import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useElementPicker } from '../context/ElementPickerContext';
import { ChangeRequest, ElementLocation, RequestScope, RequestType, RequestStatus } from '../types';
import { 
  MapPin, 
  Plus, 
  Sparkles, 
  Clock, 
  Coins, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  ExternalLink, 
  MessageSquare, 
  ChevronRight, 
  User, 
  Send,
  Eye,
  Check,
  X,
  Filter,
  DollarSign,
  Calendar
} from 'lucide-react';

export default function ChangeRequestManager() {
  const { user } = useAuth();
  const { startPicking, pickedElements, removeElement, showLocationOnSite } = useElementPicker();

  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'new'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterScope, setFilterScope] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<RequestType>('change');
  const [formScope, setFormScope] = useState<RequestScope>('small');
  const [formDescription, setFormDescription] = useState('');
  const [formWillingToPay, setFormWillingToPay] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formLocations, setFormLocations] = useState<ElementLocation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Response / Admin update state
  const [replyText, setReplyText] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const currentUserEmail = user?.email?.toLowerCase().trim() || '';
  const isKianosh = currentUserEmail === 'kianoshsolheim@gmail.com';
  const isOivind = currentUserEmail === 'oivindsolheim@gmail.com';

  // Synchronize picked elements from ElementPickerContext
  useEffect(() => {
    if (pickedElements && pickedElements.length > 0) {
      setFormLocations(pickedElements);
      // Auto open form if elements were just picked
      setActiveTab('new');
    }
  }, [pickedElements]);

  // Subscribe to change requests in Firestore
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const colRef = collection(db, 'change_requests');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const list: ChangeRequest[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as ChangeRequest);
        });
        setRequests(list);
        setLoading(false);
      }, (error) => {
        console.warn('Kunne ikkje hente med orderBy, prøver enkel spørring:', error);
        // Fallback to simple collection snapshot without orderBy in case of missing index
        const unsubFallback = onSnapshot(colRef, (snap2) => {
          const list2: ChangeRequest[] = [];
          snap2.forEach((docSnap) => {
            list2.push({ id: docSnap.id, ...docSnap.data() } as ChangeRequest);
          });
          list2.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
            return timeB - timeA;
          });
          setRequests(list2);
          setLoading(false);
        }, (err2) => {
          console.warn('Feil ved henting av endringsførespurnader:', err2?.message || err2);
          setLoading(false);
        });
        unsubscribe = unsubFallback;
      });
    } catch (err: any) {
      console.warn('Feil ved initialisering av lytte-funksjon:', err?.message || err);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const handleStartPickLocations = () => {
    startPicking(formLocations);
  };

  const handleRemoveLocation = (id: string) => {
    removeElement(id);
    setFormLocations(prev => prev.filter(l => l.id !== id));
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Ver venleg og fyll inn kva endringa eller funksjonen gjeld.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formTitle.trim(),
        type: formType,
        scope: formType === 'feature' ? 'feature' : formScope,
        description: formDescription.trim(),
        selectedLocations: formLocations,
        willingToPay: (formScope === 'medium' || formScope === 'large' || formType === 'feature') ? formWillingToPay.trim() : '',
        deadline: (formScope === 'medium' || formScope === 'large' || formType === 'feature') ? formDeadline.trim() : '',
        requestedByEmail: currentUserEmail || 'oivindsolheim@gmail.com',
        requestedByName: user?.displayName || (isOivind ? 'Øivind H. Solheim' : 'Kianosh Solheim'),
        assignedToEmail: 'kianoshsolheim@gmail.com',
        status: 'pending' as RequestStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'change_requests'), payload);
      setSubmitSuccess(true);
      
      // Reset form
      setFormTitle('');
      setFormDescription('');
      setFormWillingToPay('');
      setFormDeadline('');
      setFormLocations([]);
      
      setTimeout(() => {
        setSubmitSuccess(false);
        setActiveTab('list');
      }, 1200);
    } catch (err) {
      console.error('Feil ved innsending av førespurnad:', err);
      alert('Kunne ikkje sende inn førespurnaden. Prøv igjen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (requestId: string, newStatus: RequestStatus) => {
    setIsUpdatingStatus(true);
    try {
      await updateDoc(doc(db, 'change_requests', requestId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Feil ved oppdatering av status:', err);
      alert('Kunne ikkje oppdatere status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveDeveloperNotes = async (requestId: string) => {
    if (!replyText.trim()) return;
    setIsUpdatingStatus(true);
    try {
      await updateDoc(doc(db, 'change_requests', requestId), {
        developerNotes: replyText.trim(),
        updatedAt: serverTimestamp(),
      });
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest(prev => prev ? { ...prev, developerNotes: replyText.trim() } : null);
      }
      setReplyText('');
    } catch (err) {
      console.error('Feil ved lagring av kommentar:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm('Er du sikker på at du vil slette denne førespurnaden?')) return;
    try {
      await deleteDoc(doc(db, 'change_requests', requestId));
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(null);
      }
    } catch (err) {
      console.error('Feil ved sletting:', err);
      alert('Kunne ikkje slette førespurnaden.');
    }
  };

  const filteredRequests = requests.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterScope !== 'all' && r.scope !== filterScope) return false;
    return true;
  });

  const isHighScope = formScope === 'medium' || formScope === 'large' || formType === 'feature';

  return (
    <div className="space-y-8 font-sans">
      {/* HEADER SECTION */}
      <div className="bg-white border border-stone-200/90 rounded-sm p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-800 mb-1 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Samarbeid & Utvikling</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif text-brand-dark">
              Endringsynskjer & Nye funksjonar
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl font-sans">
              Her kan <strong>oivindsolheim@gmail.com</strong> be om endringar, forbetringar eller nye funksjonar på nettsida av <strong>kianoshsolheim@gmail.com</strong>.
              Bruk knappen <em>«Finn lokasjon»</em> for å peike direkte på element på nettsida.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { setActiveTab('list'); setSelectedRequest(null); }}
              className={`px-4 py-2.5 text-xs font-semibold tracking-wider uppercase transition-colors rounded ${
                activeTab === 'list' && !selectedRequest
                  ? 'bg-brand-dark text-white' 
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Førespurnader ({requests.length})
            </button>
            <button
              onClick={() => { setActiveTab('new'); setSelectedRequest(null); }}
              className={`px-4 py-2.5 text-xs font-semibold tracking-wider uppercase transition-colors rounded flex items-center gap-1.5 ${
                activeTab === 'new'
                  ? 'bg-amber-600 text-white shadow-sm' 
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Be om endring / ny funksjon</span>
            </button>
          </div>
        </div>
      </div>

      {/* CREATE NEW REQUEST TAB */}
      {activeTab === 'new' && (
        <div className="bg-white border border-stone-200/90 rounded-sm p-6 sm:p-8 shadow-sm">
          <div className="border-b border-stone-100 pb-4 mb-6">
            <h3 className="text-xl font-serif text-brand-dark mb-1">
              Ny førespurnad til Kianosh
            </h3>
            <p className="text-xs text-stone-500">
              Fyll ut kva du ynskjer gjort, merk elementa på sida med «Finn lokasjon», og oppgje rammene for oppgåva.
            </p>
          </div>

          {submitSuccess && (
            <div className="p-4 mb-6 bg-emerald-50 border border-emerald-300 rounded text-emerald-900 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Førespurnaden er sendt inn!</p>
                <p className="text-xs text-emerald-700">Kianosh kan no sjå endringsønsket ditt og dei merka elementa.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmitRequest} className="space-y-6">
            
            {/* TYPE VELGER: ENDRING ELLER NY FUNKSJON */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-dark mb-2">
                1. Kva type førespurnad er dette?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormType('change')}
                  className={`p-4 rounded border text-left transition-all ${
                    formType === 'change'
                      ? 'border-brand-dark bg-stone-50 shadow-sm ring-1 ring-brand-dark'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-serif font-bold text-base text-brand-dark">
                      ✏️ Endring på eksisterande innhald / side
                    </span>
                    {formType === 'change' && <Check className="w-4 h-4 text-brand-dark" />}
                  </div>
                  <p className="text-xs text-stone-600">
                    Retting, endring av tekst, design, oppsett eller fjerning av eksisterande element.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormType('feature')}
                  className={`p-4 rounded border text-left transition-all ${
                    formType === 'feature'
                      ? 'border-brand-dark bg-stone-50 shadow-sm ring-1 ring-brand-dark'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-serif font-bold text-base text-brand-dark">
                      ✨ Ny funksjon
                    </span>
                    {formType === 'feature' && <Check className="w-4 h-4 text-brand-dark" />}
                  </div>
                  <p className="text-xs text-stone-600">
                    Ny modul, nye knappar, ny integrasjon eller heilt ny funksjonalitet som ikkje finst frå før.
                  </p>
                </button>
              </div>
            </div>

            {/* OMFANG / STØRRELSE (FOR ENDRING) */}
            {formType === 'change' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-dark mb-2">
                  2. Korpumpande er endringa? (Størrelse)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormScope('small')}
                    className={`p-3.5 rounded border text-left transition-all ${
                      formScope === 'small'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-600'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-emerald-900 uppercase tracking-wider">
                        🟢 Liten endring
                      </span>
                      {formScope === 'small' && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                    </div>
                    <p className="text-xs text-stone-600">
                      Enkel retting av tekst, justering av farge eller lita biletendring.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormScope('medium')}
                    className={`p-3.5 rounded border text-left transition-all ${
                      formScope === 'medium'
                        ? 'border-amber-600 bg-amber-50/50 shadow-sm ring-1 ring-amber-600'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-amber-900 uppercase tracking-wider">
                        🟡 Middels endring
                      </span>
                      {formScope === 'medium' && <Check className="w-3.5 h-3.5 text-amber-700" />}
                    </div>
                    <p className="text-xs text-stone-600">
                      Ny seksjon på ei side, endra struktur eller utvida skjema.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormScope('large')}
                    className={`p-3.5 rounded border text-left transition-all ${
                      formScope === 'large'
                        ? 'border-red-600 bg-red-50/50 shadow-sm ring-1 ring-red-600'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-red-900 uppercase tracking-wider">
                        🔴 Stor endring
                      </span>
                      {formScope === 'large' && <Check className="w-3.5 h-3.5 text-red-700" />}
                    </div>
                    <p className="text-xs text-stone-600">
                      Omfattande ombygging, ny salsflyt eller større omarbeiding.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* DEDICATED PAYMENT & TIMELINE QUESTIONS FOR MIDDELS, STOR OG NY FUNKSJON */}
            {isHighScope && (
              <div className="p-5 bg-amber-500/10 border border-amber-300 rounded-sm space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900">
                  <Coins className="w-4 h-4 text-amber-700" />
                  <span>
                    Viktige spørsmål for {formType === 'feature' ? 'ny funksjon' : `${formScope === 'medium' ? 'middels' : 'stor'} endring`}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* QUESTION 1: WILLING TO PAY */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-stone-900">
                      💰 Kor mykje er du villig til å betale for å få denne endringa/funksjonen gjort?
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formWillingToPay}
                        onChange={(e) => setFormWillingToPay(e.target.value)}
                        placeholder="F.eks. 1 500 kr (eller avtales)"
                        className="w-full p-2.5 text-xs bg-white border border-amber-300 rounded focus:border-brand-dark outline-none"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['500 kr', '1 500 kr', '3 000 kr', '5 000 kr', 'Avtalast nærare'].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setFormWillingToPay(sug)}
                          className="px-2 py-0.5 text-[11px] bg-white border border-amber-200 hover:border-amber-400 rounded text-stone-700 transition-colors"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* QUESTION 2: DEADLINE / NÅR BØR DET GJØRES INNEN */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-stone-900">
                      ⏱️ Når bør dette gjerast innan? (Tidsfrist)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formDeadline}
                        onChange={(e) => setFormDeadline(e.target.value)}
                        placeholder="F.eks. Innan 1 veke / spesifikk dato"
                        className="w-full p-2.5 text-xs bg-white border border-amber-300 rounded focus:border-brand-dark outline-none"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['Innan 2-3 dagar', 'Innan 1 veke', 'Innan 2 veker', 'Innan 1 månad', 'Inga hast'].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setFormDeadline(sug)}
                          className="px-2 py-0.5 text-[11px] bg-white border border-amber-200 hover:border-amber-400 rounded text-stone-700 transition-colors"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FINN LOKASJON / ELEMENT-VELGAR */}
            <div className="p-5 bg-stone-50 border border-stone-200 rounded-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-brand-dark">
                      Lokasjon på nettsida
                    </span>
                    <span className="text-[11px] font-mono bg-stone-200 px-2 py-0.5 rounded text-stone-700">
                      {formLocations.length} element merka
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Trykk på «Finn lokasjon» for å klikke på og velje eitt eller fleire element direkte på nettsida.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleStartPickLocations}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center gap-2 shadow-sm shrink-0"
                >
                  <MapPin className="w-4 h-4" />
                  <span>{formLocations.length > 0 ? 'Endre / Legg til fleire lokasjonar' : 'Finn lokasjon'}</span>
                </button>
              </div>

              {/* LIST OF CURRENTLY SELECTED LOCATIONS */}
              {formLocations.length > 0 && (
                <div className="pt-3 border-t border-stone-200 space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 block">
                    Valde lokasjonar som blir viste til Kianosh:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {formLocations.map((loc, idx) => (
                      <div 
                        key={loc.id} 
                        className="p-2.5 bg-white border border-stone-200 rounded flex items-center justify-between gap-2 text-xs shadow-2xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-medium text-stone-900 truncate">
                            <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="truncate">{loc.elementName || loc.tag}</span>
                          </div>
                          <span className="text-[11px] text-stone-400 font-mono block truncate">
                            Side: {loc.pagePath}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => showLocationOnSite(loc)}
                            className="p-1 text-stone-400 hover:text-brand-dark"
                            title="Test vising på nettsida"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveLocation(loc.id)}
                            className="p-1 text-stone-400 hover:text-red-600"
                            title="Fjern"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* TITTEL OG SKILDRING */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-dark mb-1">
                  Kva ynskjer du skal gjerast? (Kort tittel) *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="F.eks. «Gjer det mogleg å skjule omtaler» eller «Ny bestillingsknapp»"
                  className="w-full p-3 text-sm bg-white border border-stone-300 rounded focus:border-brand-dark outline-none font-serif"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-dark mb-1">
                  Utdjupande skildring & detaljar
                </label>
                <textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Forklar kva du ynskjer skal skje, korleis det skal sjå ut, og eventuelle spesielle ynskjer..."
                  className="w-full p-3 text-sm bg-white border border-stone-300 rounded focus:border-brand-dark outline-none font-sans"
                />
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="flex items-center justify-between pt-4 border-t border-stone-100">
              <span className="text-xs text-stone-500">
                Førespurnaden blir lagra og sendt direkte til <strong>kianoshsolheim@gmail.com</strong>
              </span>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-brand-dark hover:bg-black text-white text-xs font-semibold tracking-widest uppercase rounded transition-colors flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Sender inn...' : 'Send førespurnad'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REQUESTS LIST & DETAILS TAB */}
      {activeTab === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: LIST OF REQUESTS */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* FILTER BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-stone-200/90 rounded-sm">
              <div className="flex items-center gap-2 text-xs">
                <Filter className="w-3.5 h-3.5 text-stone-400" />
                <span className="text-stone-500 uppercase tracking-wider text-[11px] font-semibold">Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="py-1 px-2 border border-stone-200 rounded text-xs bg-white text-stone-800 outline-none"
                >
                  <option value="all">Alle statusar</option>
                  <option value="pending">Ventar på svar</option>
                  <option value="in_progress">I arbeid</option>
                  <option value="completed">Fullført</option>
                  <option value="declined">Avvist</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-500 uppercase tracking-wider text-[11px] font-semibold">Størrelse:</span>
                <select
                  value={filterScope}
                  onChange={(e) => setFilterScope(e.target.value)}
                  className="py-1 px-2 border border-stone-200 rounded text-xs bg-white text-stone-800 outline-none"
                >
                  <option value="all">Alle</option>
                  <option value="small">Liten</option>
                  <option value="medium">Middels</option>
                  <option value="large">Stor</option>
                  <option value="feature">Ny funksjon</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-stone-400 uppercase tracking-wider animate-pulse">
                Laster førespurnader...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-12 text-center bg-white border border-stone-200/90 rounded-sm space-y-3">
                <Sparkles className="w-8 h-8 text-stone-300 mx-auto" />
                <h4 className="text-lg font-serif text-brand-dark">Ingen førespurnader funne</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Det er ingen registrerte førespurnader med dei valde filtra. Trykk på «Be om endring / ny funksjon» for å opprette eit nytt ynskje!
                </p>
                <button
                  onClick={() => setActiveTab('new')}
                  className="px-4 py-2 bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider rounded"
                >
                  Opprett ny førespurnad
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((req) => {
                  const isSelected = selectedRequest?.id === req.id;
                  const locCount = req.selectedLocations?.length || 0;

                  return (
                    <div
                      key={req.id}
                      onClick={() => setSelectedRequest(req)}
                      className={`p-5 bg-white border rounded-sm transition-all cursor-pointer relative ${
                        isSelected 
                          ? 'border-brand-dark shadow-md ring-1 ring-brand-dark' 
                          : 'border-stone-200/90 hover:border-stone-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {/* TYPE & SCOPE BADGES */}
                          {req.type === 'feature' ? (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-900 font-bold text-[10px] uppercase tracking-wider rounded">
                              ✨ Ny funksjon
                            </span>
                          ) : req.scope === 'large' ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-900 font-bold text-[10px] uppercase tracking-wider rounded">
                              🔴 Stor endring
                            </span>
                          ) : req.scope === 'medium' ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px] uppercase tracking-wider rounded">
                              🟡 Middels endring
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold text-[10px] uppercase tracking-wider rounded">
                              🟢 Liten endring
                            </span>
                          )}

                          {/* STATUS BADGE */}
                          {req.status === 'completed' ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold uppercase rounded">
                              Fullført
                            </span>
                          ) : req.status === 'in_progress' ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold uppercase rounded">
                              I arbeid
                            </span>
                          ) : req.status === 'declined' ? (
                            <span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-[10px] font-semibold uppercase rounded">
                              Avvist
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold uppercase rounded">
                              Ventar på Kianosh
                            </span>
                          )}
                        </div>

                        {/* DATE */}
                        <span className="text-[11px] text-stone-400 font-mono">
                          {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString('no-NO') : 'Nyleg'}
                        </span>
                      </div>

                      {/* TITLE */}
                      <h4 className="text-lg font-serif text-brand-dark mb-1.5">
                        {req.title}
                      </h4>

                      {/* DESCRIPTION SNIPPET */}
                      {req.description && (
                        <p className="text-xs text-stone-600 line-clamp-2 mb-3">
                          {req.description}
                        </p>
                      )}

                      {/* FOOTER METRICS */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100 text-xs text-stone-500">
                        <div className="flex items-center gap-3">
                          {locCount > 0 && (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                              <MapPin className="w-3 h-3" />
                              <span>{locCount} lokasjon{locCount > 1 ? 'ar' : ''} på sida</span>
                            </span>
                          )}

                          {req.willingToPay && (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                              <Coins className="w-3 h-3" />
                              <span>{req.willingToPay}</span>
                            </span>
                          )}

                          {req.deadline && (
                            <span className="inline-flex items-center gap-1 text-stone-600 text-[11px]">
                              <Clock className="w-3 h-3" />
                              <span>Frist: {req.deadline}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] font-semibold text-brand-dark">
                          <span>Detaljar</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: SELECTED REQUEST DETAILS & ACTIONS */}
          <div className="lg:col-span-5 sticky top-24">
            {selectedRequest ? (
              <div className="bg-white border border-stone-200/90 rounded-sm p-6 shadow-sm space-y-6">
                
                {/* HEADER */}
                <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-brand-muted block mb-1">
                      Førespurnadsdetaljar
                    </span>
                    <h3 className="text-xl font-serif text-brand-dark">
                      {selectedRequest.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="p-1 text-stone-400 hover:text-brand-dark rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* METADATA PILLS */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-stone-50">
                    <span className="text-stone-400 uppercase tracking-wider text-[10px]">Type / Omfang:</span>
                    <span className="font-semibold text-stone-800">
                      {selectedRequest.type === 'feature' ? 'Ny funksjon' : `${selectedRequest.scope} endring`}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-stone-50">
                    <span className="text-stone-400 uppercase tracking-wider text-[10px]">Frå:</span>
                    <span className="font-mono text-stone-800">
                      {selectedRequest.requestedByEmail}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-stone-50">
                    <span className="text-stone-400 uppercase tracking-wider text-[10px]">Til (Utviklar):</span>
                    <span className="font-mono text-stone-800">
                      {selectedRequest.assignedToEmail}
                    </span>
                  </div>

                  {selectedRequest.willingToPay && (
                    <div className="flex justify-between items-center py-1 border-b border-stone-50 bg-emerald-50/50 px-2 rounded">
                      <span className="text-emerald-800 font-semibold text-[11px]">Tilbode betaling:</span>
                      <span className="font-bold text-emerald-950 font-serif text-sm">
                        {selectedRequest.willingToPay}
                      </span>
                    </div>
                  )}

                  {selectedRequest.deadline && (
                    <div className="flex justify-between items-center py-1 border-b border-stone-50">
                      <span className="text-stone-400 uppercase tracking-wider text-[10px]">Ynskt frist:</span>
                      <span className="font-semibold text-stone-800">
                        {selectedRequest.deadline}
                      </span>
                    </div>
                  )}
                </div>

                {/* DESCRIPTION */}
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-dark block mb-1">
                    Skildring & forklaring:
                  </span>
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">
                    {selectedRequest.description || 'Inga nærare skildring oppgitt.'}
                  </div>
                </div>

                {/* LOCATIONS ON WEBSITE */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-dark">
                      Merka element på nettsida ({selectedRequest.selectedLocations?.length || 0})
                    </span>
                  </div>

                  {selectedRequest.selectedLocations && selectedRequest.selectedLocations.length > 0 ? (
                    <div className="space-y-2">
                      {selectedRequest.selectedLocations.map((loc, idx) => (
                        <div
                          key={loc.id || idx}
                          className="p-3 bg-amber-50/50 border border-amber-200/80 rounded flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-semibold text-stone-900 truncate">
                              <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span className="truncate">{loc.elementName || loc.tag}</span>
                            </div>
                            {loc.textSnippet && (
                              <p className="text-[11px] text-stone-500 italic truncate mt-0.5">
                                «{loc.textSnippet}»
                              </p>
                            )}
                            <span className="text-[10px] text-stone-400 font-mono block mt-0.5">
                              {loc.pagePath}
                            </span>
                          </div>

                          <button
                            onClick={() => showLocationOnSite(loc)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-[11px] uppercase tracking-wider rounded transition-colors flex items-center gap-1 shrink-0 shadow-xs"
                          >
                            <span>Vis på sida</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400 italic">
                      Ingen spesifikke element er merka for denne førespurnaden.
                    </p>
                  )}
                </div>

                {/* DEVELOPER NOTES / KOMMENTAR FRÅ KIANOSH */}
                <div className="pt-2 border-t border-stone-100">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-dark block mb-1">
                    Tilbakemelding / Kommentar frå Kianosh:
                  </span>
                  
                  {selectedRequest.developerNotes && (
                    <div className="p-3 bg-blue-50/60 border border-blue-200 rounded text-xs text-blue-950 leading-relaxed mb-3">
                      {selectedRequest.developerNotes}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Skriv kommentar eller oppdatering..."
                      className="flex-grow p-2 text-xs bg-white border border-stone-300 rounded focus:border-brand-dark outline-none"
                    />
                    <button
                      type="button"
                      disabled={isUpdatingStatus || !replyText.trim()}
                      onClick={() => handleSaveDeveloperNotes(selectedRequest.id!)}
                      className="px-3 py-2 bg-stone-800 hover:bg-black text-white text-xs font-semibold rounded disabled:opacity-50"
                    >
                      Lagre
                    </button>
                  </div>
                </div>

                {/* STATUS ACTIONS FOR DEVELOPER / ADMIN */}
                <div className="pt-4 border-t border-stone-100 space-y-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block">
                    Oppdater status:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedRequest.id!, 'pending')}
                      className={`p-2 text-[11px] font-semibold rounded border text-center transition-colors ${
                        selectedRequest.status === 'pending'
                          ? 'bg-amber-100 border-amber-300 text-amber-900'
                          : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      Ventar
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedRequest.id!, 'in_progress')}
                      className={`p-2 text-[11px] font-semibold rounded border text-center transition-colors ${
                        selectedRequest.status === 'in_progress'
                          ? 'bg-blue-100 border-blue-300 text-blue-900'
                          : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      I arbeid
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedRequest.id!, 'completed')}
                      className={`p-2 text-[11px] font-semibold rounded border text-center transition-colors ${
                        selectedRequest.status === 'completed'
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                          : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      Fullført
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedRequest.id!, 'declined')}
                      className={`p-2 text-[11px] font-semibold rounded border text-center transition-colors ${
                        selectedRequest.status === 'declined'
                          ? 'bg-red-100 border-red-300 text-red-900'
                          : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      Avvist
                    </button>
                  </div>
                </div>

                {/* DELETE ACTION */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleDeleteRequest(selectedRequest.id!)}
                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Slett førespurnad</span>
                  </button>
                </div>

              </div>
            ) : (
              <div className="p-8 text-center bg-stone-50 border border-dashed border-stone-300 rounded-sm">
                <p className="text-xs text-stone-500">
                  Vel ein førespurnad frå lista til venstre for å sjå detaljar, merka lokasjonar på nettsida og oppdatere status.
                </p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
