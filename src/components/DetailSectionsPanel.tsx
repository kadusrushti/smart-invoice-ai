import { useState } from 'react';
import { ChevronDown, ChevronRight, Truck, FileText, Factory } from 'lucide-react';
import type { DetailSection } from '@/types/invoice';
import ConfidenceBadge from './ConfidenceBadge';

interface DetailSectionsPanelProps {
  sections: DetailSection[];
  onChange: (sections: DetailSection[]) => void;
}

const sectionIcons: Record<string, typeof FileText> = {
  'Invoice & Order Details': FileText,
  'Delivery & Transport': Truck,
  'Production Details': Factory,
};

export default function DetailSectionsPanel({ sections, onChange }: DetailSectionsPanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(sections.map((s) => s.title)));

  const toggle = (title: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const updateField = (sectionTitle: string, fieldIndex: number, value: string) => {
    const updated = sections.map((section) => {
      if (section.title !== sectionTitle) return section;
      return {
        ...section,
        fields: section.fields.map((f, i) => (i === fieldIndex ? { ...f, value } : f)),
      };
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Document Details</h3>
      {sections.map((section) => {
        const Icon = sectionIcons[section.title] || FileText;
        const isOpen = expanded.has(section.title);
        return (
          <div key={section.title} className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/30">
            <button
              onClick={() => toggle(section.title)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-slate-800/40"
            >
              {isOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
              <Icon className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-white">{section.title}</span>
              <span className="ml-auto text-xs text-slate-500">{section.fields.filter((f) => f.value).length}/{section.fields.length} filled</span>
            </button>
            {isOpen && (
              <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2">
                {section.fields.map((f, i) => (
                  <div key={i}>
                    <label className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">{f.label}</span>
                      {f.value && <ConfidenceBadge confidence={f.confidence} size="sm" />}
                    </label>
                    <input
                      type="text"
                      value={f.value}
                      onChange={(e) => updateField(section.title, i, e.target.value)}
                      placeholder="—"
                      className={`w-full rounded-lg border bg-slate-900/50 px-3 py-2 text-sm text-white transition-all focus:outline-none focus:ring-2 ${
                        f.value
                          ? f.confidence < 0.75
                            ? 'border-amber-500/40 focus:border-amber-400 focus:ring-amber-500/20'
                            : 'border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20'
                          : 'border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/20'
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
