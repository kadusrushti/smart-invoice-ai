import { FileScan, Github, Sparkles } from 'lucide-react';

interface HeaderProps {
  onLogoClick: () => void;
}

export default function Header({ onLogoClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <button onClick={onLogoClick} className="group flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 opacity-75 blur-md transition-opacity group-hover:opacity-100" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600">
              <FileScan className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-left">
            <h1 className="text-lg font-bold tracking-tight text-white">
              SmartInvoice<span className="text-cyan-400"> AI</span>
            </h1>
            <p className="hidden text-xs text-slate-400 sm:block">Intelligent Invoice &amp; Receipt Processing</p>
          </div>
        </button>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 sm:flex">
            <Sparkles className="h-3.5 w-3.5" />
            <span>OCR Engine Online</span>
          </div>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            <Github className="h-4.5 w-4.5" />
          </a>
        </div>
      </div>
    </header>
  );
}
