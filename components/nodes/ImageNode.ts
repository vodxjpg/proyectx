'use client';

import { DecoratorNode, type EditorConfig, type LexicalEditor, type LexicalNode, type NodeKey } from 'lexical';

// A simple Lexical node that renders an <img>
export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__key);
  }

  constructor(src: string, key?: NodeKey) {
    super(key);
    this.__src = src;
  }

  // View
  createDOM(): HTMLElement {
    const img = document.createElement('img');
    img.src = this.__src;
    img.style.maxWidth = '100%';
    return img;
  }

  updateDOM(): false {
    return false;
  }

  // No special React decorators to render:
  decorate(_editor: LexicalEditor, _config: EditorConfig): JSX.Element {
    return null;
  }
}

// Factory method to create an ImageNode
export function $createImageNode(src: string): ImageNode {
  return new ImageNode(src);
}
