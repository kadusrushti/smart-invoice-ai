import { useState } from 'react';
import { FileJson, FileSpreadsheet, FileText, Copy, Check, RefreshCw, RotateCcw } from 'lucide-react';
import type { ExtractedInvoice } from '@/types/invoice';
import { exportJSON, exportCSV, exportXLSX, copyJSONToClipboard } from '@/utils/exporter';
import { averageConfidence } from '@/utils/invoiceParser';
import ConfidenceBadge from './ConfidenceBadge';

interface ExportToolbarProps {
  invoice: ExtractedInvoice;
  fileName: string;
  onReset: () => void;
  onReextract: () => void;
}

export default function ExportToolbar({ invoice, fileName, onReset, onReextract }: ExportToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyJSONToClipboard(invoice);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const avgConfidence = averageConfidence(invoice);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/50 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/20">
            <span className="text-sm font-bold text-cyan-400">{avgConfidence}%</span>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-300">Overall Confidence</div>
            <div className="text-[10px] text-slate-500">
              {avgConfidence >= 90 ? 'High accuracy' : avgConfidence >= 75 ? 'Review recommended' : 'Manual review needed'}
            </div>
          </div>
        </div>
        <div className="hidden sm:block">
          <ConfidenceBadge confidence={avgConfidence / 100} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onReextract}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          title="Re-run extraction"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Re-extract
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-300"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
        <button
          onClick={() => exportJSON(invoice, fileName)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-300"
        >
          <FileJson className="h-3.5 w-3.5" />
          JSON
        </button>
        <button
          onClick={() => exportCSV(invoice, fileName)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-300"
        >
          <FileText className="h-3.5 w-3.5" />
          CSV
        </button>
        <button
          onClick={() => exportXLSX(invoice, fileName)}
          className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 transition-all hover:bg-emerald-500/20"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Excel
        </button>
        <div className="mx-1 h-6 w-px bg-slate-700" />
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          New
        </button>
      </div>
    </div>
  );
}
