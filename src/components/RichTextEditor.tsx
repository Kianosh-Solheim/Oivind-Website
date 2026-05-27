import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Bold, Italic, Heading2, Quote, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';
import ImagePickerModal from './ImagePickerModal';

export default function RichTextEditor({ content, onChange }: { content: string, onChange: (c: string) => void }) {
  const [showImagePicker, setShowImagePicker] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Tell your story...' })
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-brand max-w-none focus:outline-none min-h-[300px] text-lg font-serif leading-relaxed text-brand-dark/90',
      },
    },
  });

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  const addImage = () => {
    if (!editor) return;
    setShowImagePicker(true);
  }

  return (
    <div className="relative tiptap-wrapper flex flex-col h-full">
      {editor && (
        <div className="flex flex-wrap gap-2 items-center border-b border-gray-100 bg-white p-2 mb-8 sticky top-16 z-40 transition-shadow">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('bold') ? 'text-brand-accent bg-gray-50' : 'text-brand-dark'}`} title="Bold"><Bold size={16} strokeWidth={2.5} /></button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('italic') ? 'text-brand-accent bg-gray-50' : 'text-brand-dark'}`} title="Italic"><Italic size={16} strokeWidth={2.5} /></button>
          <div className="w-px h-5 bg-gray-200 mx-1"></div>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 2 }) ? 'text-brand-accent bg-gray-50' : 'text-brand-dark'}`} title="Heading"><Heading2 size={18} strokeWidth={2.5} /></button>
          <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('blockquote') ? 'text-brand-accent bg-gray-50' : 'text-brand-dark'}`} title="Quote"><Quote size={18} strokeWidth={2.5} /></button>
          <div className="w-px h-5 bg-gray-200 mx-1"></div>
          <button onClick={setLink} className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('link') ? 'text-brand-accent bg-gray-50' : 'text-brand-dark'}`} title="Link"><LinkIcon size={18} strokeWidth={2.5} /></button>
          <button onClick={addImage} className={`p-2 rounded hover:bg-gray-100 text-brand-dark`} title="Image"><ImageIcon size={18} strokeWidth={2.5} /></button>
        </div>
      )}
      <EditorContent editor={editor} className="flex-grow" />
      {showImagePicker && (
         <ImagePickerModal 
           onClose={() => setShowImagePicker(false)}
           onSelect={(url) => {
             editor?.chain().focus().setImage({ src: url }).run();
           }}
         />
      )}
    </div>
  );
}
