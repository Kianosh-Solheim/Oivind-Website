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
  const [uploading, setUploading] = useState(false);
  
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

    const filename = window.prompt("Tast inn filnavn (filename):", file.name);
    if (!filename) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
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
          alert("Image is too complex/large even after compression. Please use a smaller image.");
          setUploading(false);
          return;
        }

        try {
          await addDoc(collection(db, 'images'), {
            filename: filename,
            url: dataUrl,
            authorId: user!.uid,
            createdAt: serverTimestamp()
          });
          loadImages();
        } catch (err) {
          console.error("Upload error", err);
          alert("Failed to upload image. It might be too large.");
        } finally {
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Slett dette bildet?")) return;
    try {
      await deleteDoc(doc(db, 'images', id));
      loadImages();
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    alert("URL kopiert!");
  };

  return (
    <div className="bg-brand-surface border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif">File Manager</h2>
        
        <label className="cursor-pointer bg-brand-dark text-white px-4 py-2 text-xs font-semibold tracking-widest uppercase hover:bg-black transition-colors flex items-center">
          <Plus className="w-4 h-4 mr-2" /> 
          {uploading ? 'Laster opp...' : 'Last opp bilde'}
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileSelect} 
            disabled={uploading}
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
                <img src={img.url} alt={img.filename} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="p-3 flex justify-between items-center border-t border-gray-50 bg-white z-10">
                <span className="text-xs font-semibold truncate max-w-[120px]" title={img.filename}>{img.filename}</span>
                <div className="flex gap-2">
                  <button onClick={() => copyToClipboard(img.url)} className="text-brand-muted hover:text-brand-dark" title="Kopier URL">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(img.id!)} className="text-red-400 hover:text-red-600" title="Slett">
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
    </div>
  );
}
