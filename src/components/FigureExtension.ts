import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import FigureComponent from './FigureComponent';

export const Figure = Node.create({
  name: 'figure',
  group: 'block',
  content: 'inline*',
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        contentElement: 'figcaption',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          const img = node.querySelector('img');
          if (!img) return false;
          return {
            src: img.getAttribute('src'),
            title: img.getAttribute('title'),
            alt: img.getAttribute('alt'),
          };
        },
      },
      {
        tag: 'img[src]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }
          return {
            src: node.getAttribute('src'),
            title: node.getAttribute('title'),
            alt: node.getAttribute('alt'),
          };
        }
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'figure',
      { class: 'image-figure my-8' },
      ['img', mergeAttributes(HTMLAttributes, { draggable: false, contenteditable: false, class: 'w-full h-auto' })],
      ['figcaption', { class: 'text-center text-sm text-brand-muted mt-3 italic' }, 0],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureComponent)
  },
});
