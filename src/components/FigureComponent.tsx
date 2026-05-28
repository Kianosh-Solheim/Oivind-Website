import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';

export default function FigureComponent(props: any) {
  return (
    <NodeViewWrapper as="figure" className="image-figure my-8 relative group block">
      {props.node.attrs.src && (
        <img src={props.node.attrs.src} alt={props.node.attrs.alt || ''} title={props.node.attrs.title || ''} className="w-full h-auto" draggable={false} contentEditable={false} />
      )}
      <button
        onClick={() => props.deleteNode()}
        contentEditable={false}
        className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1.5 text-xs font-semibold tracking-widest uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
      >
        Fjern bilde
      </button>
      <figcaption className="text-center text-sm text-brand-muted mt-3 italic">
        <NodeViewContent className="inline-block" />
      </figcaption>
    </NodeViewWrapper>
  );
}
