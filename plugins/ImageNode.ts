'use client';

import {
  DecoratorNode,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
} from 'lexical';

// A simple node that renders an <img>.
export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;

  static getType() {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__key);
  }

  constructor(src: string, key?: NodeKey) {
    super(key);
    this.__src = src;
  }

  createDOM(): HTMLElement {
    const img = document.createElement('img');
    img.src = this.__src;
    img.style.maxWidth = '100%';
    return img;
  }

  updateDOM(): false {
    return false;
  }

  decorate(
    _editor: LexicalEditor,
    _config: EditorConfig
  ): JSX.Element | null {
    return null;
  }
}

// Factory function to create an ImageNode
export function $createImageNode(src: string): ImageNode {
  return new ImageNode(src);
}
