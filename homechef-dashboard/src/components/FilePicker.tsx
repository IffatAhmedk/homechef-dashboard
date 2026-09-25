"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";

interface FilePickerProps {
  fileName: string;
  /** What to say before a file is chosen. */
  prompt: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}

/** A dashed box that opens the file chooser. */
export function FilePicker({ fileName, prompt, accept, multiple, onFiles }: FilePickerProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => e.target.files && onFiles(Array.from(e.target.files))}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="flex h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-control text-base text-ink-muted hover:border-brand hover:text-brand"
      >
        <Upload size={18} /> {fileName || prompt}
      </button>
    </>
  );
}
