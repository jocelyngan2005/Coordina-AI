import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { extractTextFromImage, extractTextFromPdf, isOcrSupported, isPdfFile } from '../services/ocrService';
import type { OcrProgress } from '../services/ocrService';

type DocType = 'brief' | 'rubric' | 'transcript' | 'chat_log';

interface UploadedFile {
  name: string;
  type: DocType;
  size: string;
  /** OCR state — only populated for image files */
  ocr?: {
    status: 'idle' | 'running' | 'done' | 'error';
    progress: number;       // 0–1
    progressLabel: string;
    text: string;
    expanded: boolean;
  };
}

const docTypeLabels: Record<DocType, string> = {
  brief: 'Project Brief',
  rubric: 'Rubric',
  transcript: 'Meeting Transcript',
  chat_log: 'Chat Log',
};

const steps = ['Upload Documents', 'Team & Timeline', 'AI Ingestion'];

const card: React.CSSProperties = {
  background: 'var(--white)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: 24,
};

export default function NewProjectPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([
    { name: 'project_brief.pdf',   type: 'brief',      size: '142 KB' },
    { name: 'grading_rubric.docx', type: 'rubric',     size: '58 KB' },
    { name: 'meeting_apr22.txt',   type: 'transcript', size: '24 KB' },
  ]);
  const [projectName, setProjectName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [members, setMembers] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [ingestStep, setIngestStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ingestSteps = [
    'Parsing uploaded documents...',
    'Running Instruction Analysis Agent...',
    'Planning Agent decomposing tasks...',
    'Team Coordination Agent assigning roles...',
    'Project state initialised ✓',
  ];

  // ─── OCR helpers ────────────────────────────────────────────────────────────

  function updateFileOcr(index: number, patch: Partial<NonNullable<UploadedFile['ocr']>>) {
    setFiles(prev =>
      prev.map((f, i) =>
        i !== index ? f : { ...f, ocr: { ...f.ocr!, ...patch } },
      ),
    );
  }

  async function runOcr(file: File, index: number) {
    // Initialise OCR state
    setFiles(prev =>
      prev.map((f, i) =>
        i !== index
          ? f
          : {
              ...f,
              ocr: {
                status: 'running',
                progress: 0,
                progressLabel: isPdfFile(file) ? 'Rendering PDF pages…' : 'Initialising…',
                text: '',
                expanded: false,
              },
            },
      ),
    );

    try {
      // PDFs: render each page to JPEG via PDF.js, then OCR each page image.
      // Images: feed directly to Tesseract.
      const extractor = isPdfFile(file) ? extractTextFromPdf : extractTextFromImage;

      const text = await extractor(file, (p: OcrProgress) => {
        // Strip verbose page-tracking prefix so the label stays concise.
        const label = p.status
          .replace(/^rendering_page_(\d+)_of_(\d+)__?/, 'Rendering p.$1/$2 — ')
          .replace(/^ocr_page_(\d+)_of_(\d+)__?/, 'OCR p.$1/$2 — ')
          .replace(/_/g, ' ');
        updateFileOcr(index, {
          progress: p.progress,
          progressLabel: label,
        });
      });

      updateFileOcr(index, {
        status: 'done',
        progress: 1,
        progressLabel: 'Complete',
        text,
        expanded: text.length > 0,
      });
    } catch {
      updateFileOcr(index, {
        status: 'error',
        progressLabel: 'OCR failed',
      });
    }
  }

  // ─── File ingestion ──────────────────────────────────────────────────────────

  function addFiles(rawFiles: FileList | null) {
    if (!rawFiles) return;
    // Restrict to PDFs only
    const incoming = Array.from(rawFiles).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
    );
    if (incoming.length === 0) return;

    setFiles(prev => {
      const startIndex = prev.length;
      const newEntries: UploadedFile[] = incoming.map(f => ({
        name: f.name,
        type: 'brief' as DocType,
        size: `${Math.round(f.size / 1024)} KB`,
        ...(isOcrSupported(f) ? { ocr: { status: 'idle' as const, progress: 0, progressLabel: '', text: '', expanded: false } } : {}),
      }));

      // Kick off OCR for image files (after state is committed)
      incoming.forEach((f, i) => {
        if (isOcrSupported(f)) {
          // Use setTimeout so the state update above has flushed
          setTimeout(() => runOcr(f, startIndex + i), 0);
        }
      });

      return [...prev, ...newEntries];
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  // ─── AI ingestion ────────────────────────────────────────────────────────────

  function startIngestion() {
    setIngesting(true);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setIngestStep(i);
      if (i >= ingestSteps.length - 1) {
        clearInterval(interval);
        setTimeout(() => navigate('/projects/proj-001'), 1200);
      }
    }, 900);
  }

  // ─── Styles ──────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    fontSize: 13,
    color: 'var(--grey-900)',
    outline: 'none',
    background: 'var(--white)',
  };

  function handleClose() {
    if (window.history.length > 1) { navigate(-1); return; }
    navigate('/');
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200 }}>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(17, 24, 39, 0.38)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Dialog centred */}
      <div
        style={{
          position: 'fixed', inset: 0,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: 24,
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="New project setup"
          style={{
            width: 'fit-content',
            minWidth: 640,
            maxWidth: 'min(760px, calc(100vw - 48px))',
            maxHeight: 'calc(100vh - 64px)',
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              padding: '20px 20px 16px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <h2 style={{ fontSize: 22, fontWeight: 400, color: 'var(--grey-900)', lineHeight: 1.2 }}>New Project</h2>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Upload documents and configure your team</span>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close dialog"
              style={{
                width: 30, height: 30, borderRadius: 8, border: 'none',
                background: 'transparent', color: 'var(--grey-500)',
                fontSize: 20, lineHeight: 1, cursor: 'pointer',
              }}
            >×</button>
          </div>

          {/* Body */}
          <div style={{ overflowY: 'auto', padding: 20 }}>
            {/* Step indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20, justifyContent: 'center' }}>
              {steps.map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: i <= step ? 'var(--grey-900)' : 'var(--grey-200)',
                      color: i <= step ? 'var(--white)' : 'var(--grey-500)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 600, flexShrink: 0,
                      transition: 'all var(--t-base)',
                    }}>{i + 1}</div>
                    <span style={{ fontSize: 12, fontWeight: i === step ? 600 : 400, color: i === step ? 'var(--grey-900)' : 'var(--grey-400)' }}>{s}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div style={{ flex: 1, height: 1, background: i < step ? 'var(--grey-900)' : 'var(--border)', margin: '0 12px', transition: 'background var(--t-base)' }} />
                  )}
                </div>
              ))}
            </div>

            <div style={{ maxWidth: 760 }}>

              {/* ── Step 0 — Upload ──────────────────────────────────────────── */}
              {step === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Drop zone */}
                  <div
                    style={{
                      ...card,
                      border: `2px dashed ${dragOver ? 'var(--grey-900)' : 'var(--border)'}`,
                      background: dragOver ? 'var(--grey-50)' : 'var(--white)',
                      textAlign: 'center', cursor: 'pointer', transition: 'all var(--t-fast)',
                    }}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,application/pdf"
                      style={{ display: 'none' }}
                      onChange={e => addFiles(e.target.files)}
                    />
                    <svg style={{ margin: '0 auto 12px', color: 'var(--grey-400)' }} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--grey-700)', marginBottom: 4 }}>Drop files here or click to upload</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Briefs, rubrics, transcripts, chat logs</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      <span style={{ color: 'var(--grey-600)', fontWeight: 500 }}>PDF files only</span> — text will be extracted automatically via OCR
                    </p>
                  </div>

                  {/* File list */}
                  {files.length > 0 && (
                    <div style={card}>
                      <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                        Uploaded Documents
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {files.map((f, i) => (
                          <div key={i} style={{ borderBottom: i < files.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: i < files.length - 1 ? 8 : 0 }}>

                            {/* File row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--grey-400)" strokeWidth="1.8">
                                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                                </svg>
                                <div>
                                  <p style={{ fontSize: 13, color: 'var(--grey-900)', fontWeight: 500 }}>{f.name}</p>
                                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{f.size}</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <select
                                  value={f.type}
                                  onChange={e => setFiles(prev => prev.map((x, j) => j === i ? { ...x, type: e.target.value as DocType } : x))}
                                  style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: 11 }}
                                >
                                  {(Object.keys(docTypeLabels) as DocType[]).map(k => <option key={k} value={k}>{docTypeLabels[k]}</option>)}
                                </select>
                                <button
                                  onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                                  style={{ color: 'var(--grey-400)', fontSize: 16, cursor: 'pointer', border: 'none', background: 'none' }}
                                >×</button>
                              </div>
                            </div>

                            {/* OCR panel — only for image files */}
                            {f.ocr && (
                              <div style={{ marginBottom: 4 }}>

                                {/* Progress bar (while running) */}
                                {f.ocr.status === 'running' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'capitalize' }}>
                                        🔍 OCR: {f.ocr.progressLabel}
                                      </span>
                                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                                        {Math.round(f.ocr.progress * 100)}%
                                      </span>
                                    </div>
                                    <div style={{ height: 4, borderRadius: 4, background: 'var(--grey-100)', overflow: 'hidden' }}>
                                      <div style={{
                                        height: '100%',
                                        width: `${f.ocr.progress * 100}%`,
                                        background: 'var(--grey-900)',
                                        borderRadius: 4,
                                        transition: 'width 0.3s ease',
                                      }} />
                                    </div>
                                  </div>
                                )}

                                {/* Error badge */}
                                {f.ocr.status === 'error' && (
                                  <span style={{ fontSize: 11, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '2px 6px' }}>
                                    ✗ OCR failed
                                  </span>
                                )}

                                {/* Collapsible extracted text */}
                                {f.ocr.status === 'done' && (
                                  <div>
                                    <button
                                      onClick={() => updateFileOcr(i, { expanded: !f.ocr!.expanded })}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        fontSize: 11, fontWeight: 500,
                                        color: 'var(--grey-600)',
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        padding: '2px 0', marginBottom: 4,
                                      }}
                                    >
                                      <span style={{
                                        display: 'inline-block',
                                        transform: f.ocr.expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s',
                                        fontSize: 10,
                                      }}>▶</span>
                                      {f.ocr.expanded ? 'Hide' : 'Show'} extracted text
                                      {f.ocr.text.length === 0 && (
                                        <span style={{ color: 'var(--grey-400)', fontWeight: 400 }}>(no text found)</span>
                                      )}
                                    </button>

                                    {f.ocr.expanded && (
                                      <pre style={{
                                        fontSize: 11,
                                        lineHeight: 1.6,
                                        color: 'var(--grey-700)',
                                        background: 'var(--grey-50)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '10px 12px',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        maxHeight: 180,
                                        overflowY: 'auto',
                                        margin: 0,
                                      }}>
                                        {f.ocr.text || '(no text detected)'}
                                      </pre>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="primary" onClick={() => setStep(1)}>Continue →</Button>
                  </div>
                </div>
              )}

              {/* ── Step 1 — Team & Timeline ─────────────────────────────────── */}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={card}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--grey-700)', display: 'block', marginBottom: 6 }}>Project Name</label>
                        <input style={inputStyle} placeholder="e.g. Smart Campus Navigation System" value={projectName} onChange={e => setProjectName(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--grey-700)', display: 'block', marginBottom: 6 }}>Submission Deadline</label>
                        <input style={inputStyle} type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--grey-700)', display: 'block', marginBottom: 6 }}>
                          Team Members <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(one per line: Name, Role)</span>
                        </label>
                        <textarea
                          rows={5}
                          style={{ ...inputStyle, resize: 'vertical' }}
                          placeholder={'Alex Chen, Team Lead\nPriya Sharma, AI Engineer\nJordan Lee, Frontend Dev'}
                          value={members}
                          onChange={e => setMembers(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Button variant="ghost" onClick={() => setStep(0)}>← Back</Button>
                    <Button variant="primary" onClick={() => { setStep(2); startIngestion(); }}>Run AI Ingestion →</Button>
                  </div>
                </div>
              )}

              {/* ── Step 2 — AI Ingestion ────────────────────────────────────── */}
              {step === 2 && (
                <div style={card}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>AI Processing your project...</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {ingestSteps.map((s, i) => {
                      const done = i < ingestStep;
                      const active = i === ingestStep && ingesting;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%',
                            background: done ? 'var(--grey-900)' : active ? 'var(--grey-300)' : 'var(--grey-150)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, transition: 'background var(--t-base)',
                          }}>
                            {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                            {active && <div className="spinning" style={{ width: 10, height: 10, border: '2px solid var(--grey-600)', borderTopColor: 'transparent', borderRadius: '50%' }} />}
                          </div>
                          <span style={{ fontSize: 13, color: done ? 'var(--grey-900)' : active ? 'var(--grey-700)' : 'var(--text-3)', fontWeight: done || active ? 500 : 400, transition: 'color var(--t-base)' }}>{s}</span>
                        </div>
                      );
                    })}
                  </div>
                  {ingestStep >= ingestSteps.length - 1 && (
                    <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--grey-50)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                      <p style={{ fontSize: 13, color: 'var(--grey-700)' }}>✓ Project ready. Redirecting to workspace...</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
