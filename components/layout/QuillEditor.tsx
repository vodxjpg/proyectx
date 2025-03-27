'use client';

import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';


interface QuillEditorProps {
  value: string;
  onChange: (content: string) => void;
}

const QuillEditor: React.FC<QuillEditorProps> = ({ value, onChange }) => {
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],              // Header options
      ['bold', 'italic', 'underline'],              // Basic formatting
      [{ 'size': ['small', false, 'large', 'huge'] }], // Text size
      [{ 'color': [] }, { 'background': [] }],      // Text and background color
      [{ 'align': [] }],                            // Alignment (left, center, right, justify)
      ['link', 'image'],                            // Link and image
      [{ 'list': 'ordered' }, { 'list': 'bullet' }], // Lists
    ],
  };

  return (
    <ReactQuill
      value={value}
      onChange={onChange}
      modules={modules}
      theme="snow"
      className='mt-2 p-2 dark:border-dark-tremor-border h-[16rem] rounded-xl'
    />
  );
};

export default QuillEditor;