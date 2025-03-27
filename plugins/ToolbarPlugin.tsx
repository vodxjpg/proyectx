'use client';

import React, { useCallback, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
} from 'lexical';

// For headings:
import {
  $createHeadingNode,
  $createParagraphNode,
  $isHeadingNode,
} from '@lexical/rich-text';

import { $wrapNodes } from '@lexical/selection';
import { $createImageNode } from './ImageNode'; // We'll define that next

// A minimal toolbar with heading dropdown, bold/italic/underline, Insert Image
export default function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [blockType, setBlockType] = useState('paragraph');

  // Listen for selection changes so we know if user is in a heading, paragraph, etc.
  React.useEffect(() => {
    const unregister = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        editor.getEditorState().read(() => {
          updateToolbar();
        });
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
    return unregister;
  }, [editor]);

  const updateToolbar = () => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      // check if selection is in a heading node
      const anchorNode = selection.anchor.getNode();
      let element = anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow();
      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);
      if (elementDOM !== null) {
        const nodeType = element.getType();
        setBlockType(nodeType);
      }
    }
  };

  const formatBold = useCallback(() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
  }, [editor]);

  const formatItalic = useCallback(() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
  }, [editor]);

  const formatUnderline = useCallback(() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
  }, [editor]);

  const insertImage = useCallback(() => {
    const url = window.prompt('Enter the image URL', 'https://via.placeholder.com/300');
    if (url) {
      editor.update(() => {
        const node = $createImageNode(url);
        $getSelection()?.insertNodes([node]);
      });
    }
  }, [editor]);

  const formatBlock = useCallback(
    (blockType: 'paragraph' | 'h1' | 'h2' | 'h3') => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          // Wrap selected text in heading or revert to paragraph
          if (blockType === 'paragraph') {
            $wrapNodes(selection, () => $createParagraphNode());
          } else {
            const headingLevel = blockType.substring(1); // "h1" -> "1"
            $wrapNodes(selection, () => $createHeadingNode(headingLevel));
          }
        }
      });
    },
    [editor]
  );

  return (
    <div className="toolbar">
      {/* Block type dropdown (Paragraph, H1, H2, H3) */}
      <select
        className="toolbar-item"
        value={blockType}
        onChange={(e) => formatBlock(e.target.value as any)}
      >
        <option value="paragraph">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>

      {/* Text formatting buttons */}
      <button className="toolbar-item" onClick={formatBold}>Bold</button>
      <button className="toolbar-item" onClick={formatItalic}>Italic</button>
      <button className="toolbar-item" onClick={formatUnderline}>Underline</button>

      {/* Insert image */}
      <button className="toolbar-item" onClick={insertImage}>Insert Image</button>
    </div>
  );
}
