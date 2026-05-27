import { X } from 'lucide-react';
import FileManager from './FileManager';

export default function ImagePickerModal({ onClose, onSelect }: { onClose: () => void, onSelect: (url: string) => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 md:p-12 overflow-y-auto">
      <div className="bg-brand-surface w-full max-w-5xl rounded-sm shadow-2xl relative">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white">
          <h2 className="text-xl font-serif">Velg Bilde</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded text-brand-dark">
            <X size={20} />
          </button>
        </div>
        <div className="p-0 max-h-[70vh] overflow-y-auto">
          <FileManager onSelect={(url) => {
            onSelect(url);
            onClose();
          }} />
        </div>
      </div>
    </div>
  );
}
