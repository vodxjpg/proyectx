// /home/zodx/Desktop/proyectx/components/layout/EditorWrapper.tsx
"use client"; 

import dynamic from "next/dynamic";

// Dynamically import the QuillEditor with no SSR
const QuillNoSSR = dynamic(() => import("./QuillEditor"), {
  ssr: false,
});

export default function EditorWrapper(props: any) {
  return <QuillNoSSR {...props} />;
}
