import { Plus, Trash2 } from 'lucide-react';
import type { ExtractedInvoice, LineItem } from '@/types/invoice';
import ConfidenceBadge from './ConfidenceBadge';

interface LineItemsEditorProps {
  invoice: ExtractedInvoice;
  onChange: (invoice: ExtractedInvoice) => void;
}

const uid = () => Math.random().toString(36).slice(2, 11);

const units = ['NOS', 'PCS', 'KG', 'LTR', 'BOX', 'SET', 'HRS', 'DAY', 'UNIT', 'MTR', 'FT', 'GM', 'TON'];

export default function LineItemsEditor({ invoice, onChange }: LineItemsEditorProps) {
  const updateItem = (id: string, key: keyof LineItem, value: string | number) => {
    const items = invoice.lineItems.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [key]: value };
      if (key === 'quantity' || key === 'unitPrice' || key === 'discount') {
        const gross = updated.quantity * updated.unitPrice;
        updated.lineTotal = Math.round((gross - (gross * updated.discount) / 100) * 100) / 100;
      }
      return updated;
    });
    onChange({ ...invoice, lineItems: items });
  };

  const addItem = () => {
    const newItem: LineItem = {
      id: uid(),
      description: '',
      hsnCode: '',
      quantity: 1,
      unit: 'NOS',
      unitPrice: 0,
      discount: 0,
      lineTotal: 0,
      confidence: 1,
    };
    onChange({ ...invoice, lineItems: [...invoice.lineItems, newItem] });
  };

  const removeItem = (id: string) => {
    onChange({ ...invoice, lineItems: invoice.lineItems.filter((i) => i.id !== id) });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Line Items</h3>
        <button
          onClick={addItem}
          className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-all hover:bg-cyan-500/20 hover:shadow-md hover:shadow-cyan-500/10"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Row
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50 text-left text-xs uppercase text-slate-500">
              <th className="py-2.5 pl-3 pr-2 font-medium">Description</th>
              <th className="px-2 py-2.5 text-center font-medium">HSN</th>
              <th className="px-2 py-2.5 text-center font-medium">Qty</th>
              <th className="px-2 py-2.5 text-center font-medium">Unit</th>
              <th className="px-2 py-2.5 text-right font-medium">Rate</th>
              <th className="px-2 py-2.5 text-right font-medium">Disc%</th>
              <th className="px-2 py-2.5 text-right font-medium">Total</th>
              <th className="px-2 py-2.5 text-center font-medium">Conf.</th>
              <th className="w-10 py-2.5 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-sm text-slate-500">
                  No line items. Click "Add Row" to create one.
                </td>
              </tr>
            ) : (
              invoice.lineItems.map((item) => (
                <tr key={item.id} className="group border-b border-slate-800/50 transition-colors hover:bg-slate-800/30">
                  <td className="py-2 pl-3 pr-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Product / Service"
                      className="w-full min-w-[150px] rounded-md border border-transparent bg-transparent px-2 py-1.5 text-white transition-all hover:border-slate-700 focus:border-cyan-500 focus:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                    />
                  </td>
                  <td className="px-2 text-center">
                    <input
                      type="text"
                      value={item.hsnCode}
                      onChange={(e) => updateItem(item.id, 'hsnCode', e.target.value)}
                      placeholder="—"
                      className="w-16 rounded-md border border-transparent bg-transparent px-1 py-1.5 text-center font-mono text-xs text-white transition-all hover:border-slate-700 focus:border-cyan-500 focus:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                    />
                  </td>
                  <td className="px-2 text-center">
                    <input
                      type="number"
                      value={item.quantity}
                      min={0}
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-14 rounded-md border border-transparent bg-transparent px-1 py-1.5 text-center text-white transition-all hover:border-slate-700 focus:border-cyan-500 focus:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                    />
                  </td>
                  <td className="px-2 text-center">
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                      className="w-16 rounded-md border border-transparent bg-transparent px-1 py-1.5 text-center text-xs text-white transition-all hover:border-slate-700 focus:border-cyan-500 focus:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                    >
                      {units.map((u) => (
                        <option key={u} value={u} className="bg-slate-900">{u}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 text-right">
                    <input
                      type="number"
                      value={item.unitPrice}
                      min={0}
                      step="0.01"
                      onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-24 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-right text-white transition-all hover:border-slate-700 focus:border-cyan-500 focus:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                    />
                  </td>
                  <td className="px-2 text-right">
                    <input
                      type="number"
                      value={item.discount}
                      min={0}
                      max={100}
                      step="0.01"
                      onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                      className="w-14 rounded-md border border-transparent bg-transparent px-1 py-1.5 text-right text-white transition-all hover:border-slate-700 focus:border-cyan-500 focus:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                    />
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-sm text-slate-300 whitespace-nowrap">
                    ₹{item.lineTotal.toFixed(2)}
                  </td>
                  <td className="px-2 text-center">
                    <ConfidenceBadge confidence={item.confidence} size="sm" />
                  </td>
                  <td className="pr-3 text-center">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded-md p-1 text-slate-600 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
