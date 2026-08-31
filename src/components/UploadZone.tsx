import { useRef, useState } from 'react';
import { UploadCloud, FileText, ImageIcon, Loader2 } from 'lucide-react';

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
}

export default function UploadZone({ onFileSelected, isProcessing }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !isProcessing && inputRef.current?.click()}
      className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
        isDragging
          ? 'border-cyan-400 bg-cyan-500/10 scale-[1.02]'
          : 'border-slate-700 bg-slate-900/50 hover:border-cyan-500/50 hover:bg-slate-800/50'
      } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />

      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl transition-all duration-300 group-hover:bg-cyan-500/30" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 ring-1 ring-cyan-500/30">
          {isProcessing ? (
            <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
          ) : (
            <UploadCloud className="h-7 w-7 text-cyan-400 transition-transform duration-300 group-hover:scale-110" />
          )}
        </div>
      </div>

      <h3 className="mb-1 text-lg font-semibold text-white">
        {isProcessing ? 'Processing document...' : 'Drag & drop your invoice'}
      </h3>
      <p className="mb-4 text-sm text-slate-400">
        {isProcessing ? 'Running OCR extraction engine' : 'or click to browse files'}
      </p>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" /> PDF
        </span>
        <span className="flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" /> PNG
        </span>
        <span className="flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" /> JPG
        </span>
      </div>
    </div>
  );
}
