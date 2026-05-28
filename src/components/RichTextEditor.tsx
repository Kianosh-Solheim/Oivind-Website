import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Figure } from './FigureExtension';
import { Bold, Italic, Heading2, Quote, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ImagePickerModal from './ImagePickerModal';

export default function RichTextEditor({ content, onChange }: { content: string, onChange: (c: string) => void }) {
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [toolbarContainer, setToolbarContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setToolbarContainer(document.getElementById('editor-toolbar-container'));
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Figure,
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

  const toolbarContent = editor && (
    <div className={`flex flex-wrap gap-1 md:gap-2 items-center bg-white ${toolbarContainer ? 'p-0 border-0' : 'p-2 border-b border-gray-100 mb-8 sticky top-0 z-40'}`}>
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 md:p-2 rounded hover:bg-gray-100 ${editor.isActive('bold') ? 'text-brand-accent bg-gray-50' : 'text-brand-dark'}`} title="Bold"><Bold size={16} strokeWidth={2.5} /></button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 md:p-2 rounded hover:bg-gray-100 ${editor.isActive('italic') ? 'text-brand-accent bg-gray-50' : 'text-brand-dark'}`} title="Italic"><Italic size={16} strokeWidth={2.5} /></button>
      <div className="w-px h-5 bg-gray-200 mx-0.5 md:mx-1"></div>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 md:p-2 rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 2 }) ? 'text-brand-accent bg-gray-50' : 'text-brand-dark'}`} title="Heading"><Heading2 size={18} strokeWidth={2.5} /></button>
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-1.5 md:p-2 rounded hover:bg-gray-100 ${editor.isActive('blockquote') ? 'text-brand-accent bg-gray-50' : 'text-brand-dark'}`} title="Quote"><Quote size={18} strokeWidth={2.5} /></button>
      <div className="w-px h-5 bg-gray-200 mx-0.5 md:mx-1"></div>
      <button onClick={setLink} className={`p-1.5 md:p-2 rounded hover:bg-gray-100 ${editor.isActive('link') ? 'text-brand-accent bg-gray-50' : 'text-brand-dark'}`} title="Link"><LinkIcon size={18} strokeWidth={2.5} /></button>
      <button onClick={addImage} className={`p-1.5 md:p-2 rounded hover:bg-gray-100 text-brand-dark`} title="Image"><ImageIcon size={18} strokeWidth={2.5} /></button>
    </div>
  );

  return (
    <div className="relative tiptap-wrapper flex flex-col h-full">
      {toolbarContainer && toolbarContent ? createPortal(toolbarContent, toolbarContainer) : toolbarContent}
      <EditorContent editor={editor} className="flex-grow" />
      {showImagePicker && (
         <ImagePickerModal 
           onClose={() => setShowImagePicker(false)}
           onSelect={(url, defaultCaption) => {
             const finalCaption = defaultCaption || window.prompt("Image Caption (optional):", "") || "";
             editor?.chain().focus().insertContent({
               type: 'figure',
               attrs: { src: url },
               content: finalCaption ? [{ type: 'text', text: finalCaption }] : [],
             }).run();
           }}
         />
      )}
    </div>
  );
}
