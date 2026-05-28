import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Image as ImageIcon, Trash2, Copy, Plus, Search } from 'lucide-react';

export interface ImageFile {
  id?: string;
  filename: string;
  url: string;
  createdAt?: any;
}

export default function FileManager({ onSelect }: { onSelect?: (url: string, caption?: string) => void }) {
  const { user } = useAuth();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'my-images' | 'unsplash'>('my-images');
  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [unsplashImages, setUnsplashImages] = useState<any[]>([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  
  // Custom dialog states to replace window.*
  const [uploadPrompt, setUploadPrompt] = useState<{file: File, filename: string} | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadImages();
    }
  }, [user]);

  const loadImages = async () => {
    try {
      const q = query(collection(db, 'images'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setImages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ImageFile)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadPrompt({ file, filename: file.name });
  };

  const executeUpload = () => {
    if (!uploadPrompt || !uploadPrompt.filename.trim()) return;
    
    setUploading(true);
    const { file, filename } = uploadPrompt;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new globalThis.Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        let scaleSize = 1;
        if (img.width > MAX_WIDTH) {
          scaleSize = MAX_WIDTH / img.width;
        }
        canvas.width = img.width * scaleSize;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // compress heavily to fit in 1MB limit for firestore
        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        while (dataUrl.length > 900000 && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        
        if (dataUrl.length > 1000000) {
          console.error("Image is too complex/large even after compression.");
          setUploading(false);
          setUploadPrompt(null);
          return;
        }

        try {
          await addDoc(collection(db, 'images'), {
            filename: filename.trim(),
            url: dataUrl,
            authorId: user!.uid,
            createdAt: serverTimestamp()
          });
          loadImages();
        } catch (err) {
          console.error("Upload error", err);
        } finally {
          setUploading(false);
          setUploadPrompt(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'images', deleteId));
      setDeleteId(null);
      loadImages();
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url).catch(console.error);
  };
  
  const searchUnsplash = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!unsplashQuery.trim()) return;
    
    const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      alert('VITE_UNSPLASH_ACCESS_KEY er ikkje konfigurert i miljøvariablane.');
      return;
    }
    
    setUnsplashLoading(true);
    try {
      const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(unsplashQuery)}&per_page=20`, {
        headers: {
          'Authorization': `Client-ID ${accessKey}`
        }
      });
      const data = await res.json();
      setUnsplashImages(data.results || []);
    } catch (err) {
      console.error(err);
      alert('Kunne ikkje hente bilete frå Unsplash.');
    } finally {
      setUnsplashLoading(false);
    }
  };

  return (
    <div className="bg-brand-surface border border-gray-100 p-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-6 border-b border-gray-200">
          <button 
            className={`pb-2 text-sm font-semibold tracking-widest uppercase transition-colors ${activeTab === 'my-images' ? 'text-brand-dark border-b-2 border-brand-dark' : 'text-brand-muted hover:text-brand-dark border-b-2 border-transparent'}`}
            onClick={() => setActiveTab('my-images')}
          >
            Mine Bilde
          </button>
          <button 
            className={`pb-2 text-sm font-semibold tracking-widest uppercase transition-colors ${activeTab === 'unsplash' ? 'text-brand-dark border-b-2 border-brand-dark' : 'text-brand-muted hover:text-brand-dark border-b-2 border-transparent'}`}
            onClick={() => setActiveTab('unsplash')}
          >
            Unsplash
          </button>
        </div>
        
        {activeTab === 'my-images' && (
          <label className="cursor-pointer bg-brand-dark text-white px-4 py-2 text-xs font-semibold tracking-widest uppercase hover:bg-black transition-colors flex items-center shrink-0">
            <Plus className="w-4 h-4 mr-2" /> 
            Last opp bilde
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileSelect} 
            />
          </label>
        )}
      </div>

      <div className="flex-grow overflow-y-auto">
        {activeTab === 'my-images' && (
          <>
            {loading ? (
              <div className="text-brand-muted text-sm py-4">Lastar bilde...</div>
            ) : images.length === 0 ? (
              <div className="text-brand-muted text-sm py-8 text-center bg-white border border-dashed border-gray-300">Ingen bilde lasta opp.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map(img => (
                  <div key={img.id} className="bg-white border border-gray-100 flex flex-col group relative overflow-hidden">
                    <div 
                      className="w-full h-32 bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer"
                      onClick={() => onSelect && onSelect(img.url)}
                    >
                      <img loading="lazy" src={img.url} alt={img.filename} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="p-3 flex justify-between items-center border-t border-gray-50 bg-white z-10">
                      <span className="text-xs font-semibold truncate max-w-[120px]" title={img.filename}>{img.filename}</span>
                      <div className="flex gap-2">
                        <button onClick={() => copyToClipboard(img.url)} className="text-brand-muted hover:text-brand-dark" title="Kopier URL">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(img.id!)} className="text-red-400 hover:text-red-600" title="Slett">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {onSelect && (
                       <div 
                         className="absolute inset-0 bg-brand-accent/10 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity pointer-events-none"
                       >
                         <span className="bg-white px-3 py-1.5 text-xs font-bold tracking-widest text-brand-dark shadow-sm">VEL</span>
                       </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'unsplash' && (
          <div className="flex flex-col h-full gap-6">
            <form onSubmit={searchUnsplash} className="flex gap-2 relative">
              <input 
                type="text" 
                placeholder="Søk på Unsplash (t.d. natur, minimalistisk...)"
                value={unsplashQuery}
                onChange={e => setUnsplashQuery(e.target.value)}
                className="flex-grow p-3 text-sm border-none ring-1 ring-gray-200 focus:ring-brand-accent bg-white outline-none pl-10"
              />
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <button type="submit" className="px-6 py-3 bg-brand-dark text-white text-xs font-semibold tracking-widest uppercase hover:bg-black transition-colors" disabled={unsplashLoading}>
                {unsplashLoading ? 'Søkjer...' : 'Søk'}
              </button>
            </form>
            
            {!import.meta.env.VITE_UNSPLASH_ACCESS_KEY && (
              <div className="p-4 bg-orange-50 border border-orange-100 text-orange-800 text-sm">
                VITE_UNSPLASH_ACCESS_KEY er ikkje konfigurert i miljøvariablane. Opprett ein API-nøkkel på Unsplash Developer-plattforma for å bruke denne funksjonen.
              </div>
            )}

            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 pb-4 space-y-4">
              {unsplashImages.map(img => (
                <div key={img.id} className="break-inside-avoid bg-white border border-gray-100 flex flex-col group relative overflow-hidden cursor-pointer" onClick={() => {
                  const captionStr = `Bilde av ${img.user?.name} på Unsplash`;
                  onSelect && onSelect(img.urls.regular, captionStr);
                }}>
                  <div className="w-full bg-gray-50 flex items-center justify-center overflow-hidden">
                    <img loading="lazy" src={img.urls.small} alt={img.alt_description || 'Unsplash image'} className="w-full h-auto block object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-3 border-t border-gray-50 bg-white z-10 relative">
                    <span className="text-[10px] text-brand-muted truncate block">Av {img.user?.name}</span>
                  </div>
                  {onSelect && (
                     <div 
                       className="absolute inset-0 bg-brand-accent/10 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity pointer-events-none z-20"
                     >
                       <span className="bg-white px-3 py-1.5 text-xs font-bold tracking-widest text-brand-dark shadow-sm text-center">
                         VEL<br/><span className="text-[9px] font-normal lowercase tracking-normal">med kreditering</span>
                       </span>
                     </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Custom Upload Dialog */}
      {uploadPrompt && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4">
          <div className="bg-white p-6 max-w-sm w-full shadow-2xl rounded-sm">
            <h3 className="text-lg font-serif mb-4">Lagre bilde som</h3>
            <input 
              type="text" 
              value={uploadPrompt.filename} 
              onChange={e => setUploadPrompt({...uploadPrompt, filename: e.target.value})}
              className="w-full border border-gray-300 p-2 text-sm mb-6 focus:outline-none focus:border-brand-dark"
              disabled={uploading}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setUploadPrompt(null)}
                className="px-4 py-2 text-xs font-semibold tracking-widest uppercase text-brand-muted hover:text-brand-dark"
                disabled={uploading}
              >
                Avbryt
              </button>
              <button 
                onClick={executeUpload}
                className="px-4 py-2 text-xs font-semibold tracking-widest uppercase bg-brand-dark text-white hover:bg-black disabled:opacity-50"
                disabled={uploading || !uploadPrompt.filename.trim()}
              >
                {uploading ? 'Laster opp...' : 'Lagre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirm Dialog */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4">
          <div className="bg-white p-6 max-w-sm w-full shadow-2xl rounded-sm">
            <h3 className="text-lg font-serif mb-4">Bekreft sletting</h3>
            <p className="text-sm text-brand-muted mb-6">Er du sikker på at du vil slette dette bildet?</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-xs font-semibold tracking-widest uppercase text-brand-muted hover:text-brand-dark"
              >
                Avbryt
              </button>
              <button 
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-semibold tracking-widest uppercase bg-red-600 text-white hover:bg-red-700"
              >
                Slett
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
