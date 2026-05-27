import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Image as ImageIcon, Trash2, Copy, Plus } from 'lucide-react';

export interface ImageFile {
  id?: string;
  filename: string;
  url: string;
  createdAt?: any;
}

export default function FileManager({ onSelect }: { onSelect?: (url: string) => void }) {
  const { user } = useAuth();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(true);
  
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
    // Silent copy instead of alert
  };

  return (
    <div className="bg-brand-surface border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif">File Manager</h2>
        
        <label className="cursor-pointer bg-brand-dark text-white px-4 py-2 text-xs font-semibold tracking-widest uppercase hover:bg-black transition-colors flex items-center">
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
      </div>

      {loading ? (
        <div className="text-brand-muted text-sm py-4">Laster bilder...</div>
      ) : images.length === 0 ? (
        <div className="text-brand-muted text-sm py-8 text-center bg-white border border-dashed border-gray-300">Ingen bilder lastet opp.</div>
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
                   <span className="bg-white px-3 py-1.5 text-xs font-bold tracking-widest text-brand-dark shadow-sm">VELG</span>
                 </div>
              )}
            </div>
          ))}
        </div>
      )}

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
