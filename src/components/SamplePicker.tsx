import { FileText, Receipt, ArrowRight } from 'lucide-react';
import type { SampleInvoice } from '@/types/invoice';

interface SamplePickerProps {
  samples: SampleInvoice[];
  onSelect: (sample: SampleInvoice) => void;
}

export default function SamplePicker({ samples, onSelect }: SamplePickerProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {samples.map((sample) => {
        const Icon = sample.type === 'invoice' ? FileText : Receipt;
        return (
          <button
            key={sample.id}
            onClick={() => onSelect(sample)}
            className="group relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-left transition-all duration-300 hover:border-cyan-500/50 hover:bg-slate-800/60 hover:shadow-lg hover:shadow-cyan-500/5"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 ring-1 ring-slate-700 transition-colors group-hover:bg-cyan-500/10 group-hover:ring-cyan-500/30">
                <Icon className="h-5 w-5 text-slate-400 group-hover:text-cyan-400" />
              </div>
              <ArrowRight className="h-4 w-4 -translate-x-2 text-slate-600 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-cyan-400 group-hover:opacity-100" />
            </div>
            <h4 className="mb-1 truncate text-sm font-semibold text-white">{sample.vendor}</h4>
            <p className="mb-3 truncate text-xs text-slate-500">{sample.name}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs capitalize text-slate-400">{sample.type}</span>
              <span className="font-mono text-sm font-semibold text-cyan-400">
                ${sample.total.toFixed(2)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
