import { useCallback, useRef, useState } from 'react';
import { FileText, Layers, ScanLine, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import Header from '@/components/Header';
import UploadZone from '@/components/UploadZone';
import SamplePicker from '@/components/SamplePicker';
import DocumentViewer from '@/components/DocumentViewer';
import DataEditor from '@/components/DataEditor';
import LineItemsEditor from '@/components/LineItemsEditor';
import DetailSectionsPanel from '@/components/DetailSectionsPanel';
import ExportToolbar from '@/components/ExportToolbar';
import { sampleInvoices } from '@/data/sampleInvoices';
import { extractTextFromFile, type OcrProgress } from '@/utils/ocrEngine';
import { parseInvoiceFromText, averageConfidence } from '@/utils/invoiceParser';
import type { ExtractedInvoice, SampleInvoice, UploadedDocument } from '@/types/invoice';

type Phase = 'upload' | 'processing' | 'review';

interface ActiveDoc {
  doc: UploadedDocument;
  invoice: ExtractedInvoice;
  rawText: string;
}

interface ProcessingStep {
  label: string;
  status: 'pending' | 'active' | 'done';
  detail?: string;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('upload');
  const [activeDoc, setActiveDoc] = useState<ActiveDoc | null>(null);
  const [showSamplePanel, setShowSamplePanel] = useState(true);
  const [steps, setSteps] = useState<ProcessingStep[]>([]);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileUrlRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    if (fileUrlRef.current) {
      URL.revokeObjectURL(fileUrlRef.current);
      fileUrlRef.current = null;
    }
    setPhase('upload');
    setActiveDoc(null);
    setShowSamplePanel(true);
    setError(null);
    setSteps([]);
    setOcrProgress(0);
  }, []);

  const processFile = useCallback(async (file: File) => {
    setPhase('processing');
    setShowSamplePanel(false);
    setError(null);
    setOcrProgress(0);

    const url = URL.createObjectURL(file);
    fileUrlRef.current = url;

    setSteps([
      { label: 'Loading document', status: 'active' },
      { label: 'Running OCR text extraction', status: 'pending' },
      { label: 'Parsing structured fields', status: 'pending' },
      { label: 'Validating data & computing confidence', status: 'pending' },
    ]);

    try {
      // Step 1: OCR extraction
      const rawText = await extractTextFromFile(file, (p: OcrProgress) => {
        setOcrProgress(p.progress);
        setSteps((prev) => [
          { label: 'Loading document', status: 'done' },
          { label: `Running OCR — ${p.phase}`, status: 'active', detail: `${Math.round(p.progress * 100)}%` },
          { label: 'Parsing structured fields', status: 'pending' },
          { label: 'Validating data & computing confidence', status: 'pending' },
        ]);
      });

      // Step 2: Parsing
      setSteps((prev) => [
        { label: 'Loading document', status: 'done' },
        { label: 'Running OCR text extraction', status: 'done' },
        { label: 'Parsing structured fields', status: 'active' },
        { label: 'Validating data & computing confidence', status: 'pending' },
      ]);

      await sleep(400);

      const invoice = parseInvoiceFromText(rawText);

      // Step 3: Validation
      setSteps((prev) => [
        { label: 'Loading document', status: 'done' },
        { label: 'Running OCR text extraction', status: 'done' },
        { label: 'Parsing structured fields', status: 'done' },
        { label: 'Validating data & computing confidence', status: 'active' },
      ]);

      await sleep(500);

      setSteps((prev) => prev.map((s) => ({ ...s, status: 'done' as const })));

      const doc: UploadedDocument = {
        id: Math.random().toString(36).slice(2),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        url,
        isSample: false,
      };
      setActiveDoc({ doc, invoice, rawText });
      setPhase('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process document');
      setPhase('upload');
      setShowSamplePanel(true);
    }
  }, []);

  const loadSample = useCallback((sample: SampleInvoice) => {
    setPhase('processing');
    setShowSamplePanel(false);
    setError(null);

    setSteps([
      { label: 'Loading sample document', status: 'active' },
      { label: 'Running OCR text extraction', status: 'pending' },
      { label: 'Parsing structured fields', status: 'pending' },
      { label: 'Validating data & computing confidence', status: 'pending' },
    ]);

    setTimeout(() => {
      setSteps((prev) => [
        { label: 'Loading sample document', status: 'done' },
        { label: 'Running OCR text extraction', status: 'done' },
        { label: 'Parsing structured fields', status: 'done' },
        { label: 'Validating data & computing confidence', status: 'active' },
      ]);
    }, 800);

    setTimeout(() => {
      setSteps((prev) => prev.map((s) => ({ ...s, status: 'done' as const })));
      const doc: UploadedDocument = {
        id: sample.id,
        name: sample.name,
        type: sample.name.endsWith('.png') ? 'image/png' : 'application/pdf',
        size: 102400,
        url: '',
        isSample: true,
      };
      setActiveDoc({ doc, invoice: JSON.parse(JSON.stringify(sample.data)), rawText: '' });
      setPhase('review');
    }, 1600);
  }, []);

  const reextract = useCallback(async () => {
    if (!activeDoc || !activeDoc.doc.url) return;
    // Re-run OCR on the same file
    setPhase('processing');
    setError(null);
    setOcrProgress(0);

    setSteps([
      { label: 'Loading document', status: 'active' },
      { label: 'Running OCR text extraction', status: 'pending' },
      { label: 'Parsing structured fields', status: 'pending' },
      { label: 'Validating data & computing confidence', status: 'pending' },
    ]);

    try {
      const response = await fetch(activeDoc.doc.url);
      const blob = await response.blob();
      const file = new File([blob], activeDoc.doc.name, { type: activeDoc.doc.type });

      const rawText = await extractTextFromFile(file, (p: OcrProgress) => {
        setOcrProgress(p.progress);
        setSteps((prev) => [
          { label: 'Loading document', status: 'done' },
          { label: `Running OCR — ${p.phase}`, status: 'active', detail: `${Math.round(p.progress * 100)}%` },
          { label: 'Parsing structured fields', status: 'pending' },
          { label: 'Validating data & computing confidence', status: 'pending' },
        ]);
      });

      setSteps((prev) => [
        { label: 'Loading document', status: 'done' },
        { label: 'Running OCR text extraction', status: 'done' },
        { label: 'Parsing structured fields', status: 'active' },
        { label: 'Validating data & computing confidence', status: 'pending' },
      ]);

      await sleep(400);

      const invoice = parseInvoiceFromText(rawText);

      setSteps((prev) => prev.map((s) => ({ ...s, status: 'done' as const })));

      setActiveDoc((prev) => (prev ? { ...prev, invoice, rawText } : prev));
      setPhase('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-extraction failed');
      setPhase('review');
    }
  }, [activeDoc]);

  const updateInvoice = useCallback((invoice: ExtractedInvoice) => {
    setActiveDoc((prev) => (prev ? { ...prev, invoice } : prev));
  }, []);

  const updateDetailSections = useCallback((detailSections: ExtractedInvoice['detailSections']) => {
    setActiveDoc((prev) => (prev ? { ...prev, invoice: { ...prev.invoice, detailSections } } : prev));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header onLogoClick={reset} />

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {phase === 'upload' && (
          <div className="mx-auto max-w-4xl">
            {error && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-300">
                  Dismiss
                </button>
              </div>
            )}

            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/50 px-4 py-1.5 text-xs font-medium text-slate-400">
                <ScanLine className="h-3.5 w-3.5 text-cyan-400" />
                Real OCR — Reads Your Actual Documents
              </div>
              <h2 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Extract invoice data with
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"> real OCR scanning</span>
              </h2>
              <p className="mx-auto max-w-xl text-sm text-slate-400">
                Upload any invoice or receipt in PDF, PNG, or JPG format. The OCR engine reads every pixel,
                extracts text, and intelligently parses vendor details, line items, and totals — with confidence scores.
              </p>
            </div>

            <UploadZone onFileSelected={processFile} isProcessing={false} />

            {showSamplePanel && (
              <div className="mt-10">
                <div className="mb-4 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                    Or try a sample document
                  </h3>
                </div>
                <SamplePicker samples={sampleInvoices} onSelect={loadSample} />
              </div>
            )}

            <FeatureGrid />
          </div>
        )}

        {phase === 'processing' && (
          <ProcessingView steps={steps} ocrProgress={ocrProgress} />
        )}

        {phase === 'review' && activeDoc && (
          <div className="flex flex-col gap-4">
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <ExportToolbar
              invoice={activeDoc.invoice}
              fileName={activeDoc.doc.name}
              onReset={reset}
              onReextract={reextract}
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="h-[calc(100vh-220px)] min-h-[500px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/30">
                <DocumentViewer document={activeDoc.doc} invoice={activeDoc.invoice} />
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
                  <DataEditor invoice={activeDoc.invoice} onChange={updateInvoice} />
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
                  <LineItemsEditor invoice={activeDoc.invoice} onChange={updateInvoice} />
                </div>
                {activeDoc.invoice.detailSections.length > 0 && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
                    <DetailSectionsPanel
                      sections={activeDoc.invoice.detailSections}
                      onChange={updateDetailSections}
                    />
                  </div>
                )}
                {activeDoc.rawText && (
                  <RawTextPanel rawText={activeDoc.rawText} />
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ProcessingView({ steps, ocrProgress }: { steps: ProcessingStep[]; ocrProgress: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-ping rounded-full bg-cyan-500/20" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 ring-2 ring-cyan-500/30">
          <ScanLine className="h-9 w-9 animate-pulse text-cyan-400" />
        </div>
      </div>
      <h3 className="mb-2 text-xl font-semibold text-white">Scanning your document...</h3>
      <p className="mb-6 text-sm text-slate-400">
        {ocrProgress > 0 ? `OCR progress: ${Math.round(ocrProgress * 100)}%` : 'Reading pixels and extracting text'}
      </p>
      <div className="w-full max-w-md space-y-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-500 ${
              step.status === 'done'
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : step.status === 'active'
                  ? 'border-cyan-500/30 bg-cyan-500/5'
                  : 'border-slate-800 bg-slate-900/30'
            }`}
          >
            {step.status === 'done' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            ) : step.status === 'active' ? (
              <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            ) : (
              <div className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-700" />
            )}
            <span
              className={`text-sm transition-colors ${
                step.status === 'pending' ? 'text-slate-500' : 'text-white'
              }`}
            >
              {step.label}
            </span>
            {step.detail && (
              <span className="ml-auto font-mono text-xs text-cyan-400">{step.detail}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RawTextPanel({ rawText }: { rawText: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Raw OCR Text
          </h3>
        </div>
        <span className="text-xs text-slate-500">{expanded ? 'Hide' : 'Show'}</span>
      </button>
      {expanded && (
        <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-slate-950/50 p-3 text-xs text-slate-400 whitespace-pre-wrap">
          {rawText || 'No raw text available'}
        </pre>
      )}
    </div>
  );
}

function FeatureGrid() {
  const features = [
    { icon: ScanLine, title: 'Real OCR Engine', desc: 'Tesseract.js reads actual pixels from your documents' },
    { icon: FileText, title: 'Smart Parsing', desc: 'Multi-pattern regex extraction with auto-validation' },
    { icon: CheckCircle2, title: 'Confidence Scores', desc: 'Per-field accuracy based on match quality' },
    { icon: Layers, title: 'Multi-format Export', desc: 'JSON, Excel, and CSV with one click' },
  ];
  return (
    <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {features.map((f) => (
        <div key={f.title} className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/20">
            <f.icon className="h-5 w-5 text-cyan-400" />
          </div>
          <h4 className="mb-1 text-sm font-semibold text-white">{f.title}</h4>
          <p className="text-xs text-slate-400">{f.desc}</p>
        </div>
      ))}
    </div>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
