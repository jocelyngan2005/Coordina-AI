import { useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MOCK_UPLOAD_EVALUATIONS } from '../data/mockData';
import type { UploadEvaluation } from '../types';

const GRADING_STEPS = [
  'Parsing uploaded document...',
  'Cross-referencing with grading rubric...',
  'Computing rubric coverage scores...',
  'Generating evaluation report ✓',
];

const verdictConfig: Record<UploadEvaluation['verdict'], { bg: string; color: string; dot: string }> = {
  Excellent:    { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
  Good:         { bg: '#fef9c3', color: '#854d0e', dot: '#eab308' },
  'Needs Work': { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
};

const statusColor: Record<'covered' | 'partial' | 'missing', string> = {
  covered: '#274133',
  partial: '#ce9042',
  missing: '#7D2027',
};

export default function SubmissionUploadPage() {
  const { id: projectId, itemName: encodedItemName } = useParams<{ id: string; itemName: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const itemName = decodeURIComponent(encodedItemName ?? '');

  const isReupload = (location.state as { isReupload?: boolean } | null)?.isReupload ?? false;

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradingStep, setGradingStep] = useState(0);
  const [evaluation, setEvaluation] = useState<UploadEvaluation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const screen: 'upload' | 'grading' | 'results' =
    evaluation ? 'results' : grading ? 'grading' : 'upload';

  function addFile(rawFiles: FileList | null) {
    if (!rawFiles) return;
    const f = Array.from(rawFiles).find(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
    );
    if (f) setFile(f);
  }

  function handleClose() {
    if (window.history.length > 1) { navigate(-1); return; }
    navigate(`/projects/${projectId ?? ''}`);
  }

  async function handleUpload() {
    if (!file) return;
    setGrading(true);
    setGradingStep(0);
    for (let i = 1; i <= GRADING_STEPS.length; i++) {
      await new Promise<void>((r) => setTimeout(r, 850));
      setGradingStep(i);
    }
    await new Promise<void>((r) => setTimeout(r, 500));
    const result = MOCK_UPLOAD_EVALUATIONS[`${projectId ?? ''}::${itemName}`] ?? MOCK_UPLOAD_EVALUATIONS[itemName] ?? null;
    setEvaluation(result);
    setGrading(false);
  }

  function handleConfirm() {
    navigate(`/projects/${projectId ?? ''}`, {
      state: { uploadedItem: itemName },
    });
  }

  const vc = evaluation ? verdictConfig[evaluation.verdict] : null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200 }}>
      {/* Backdrop */}
      <div
        onClick={screen === 'upload' ? handleClose : undefined}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(17, 24, 39, 0.38)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Centred dialog */}
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
          style={{
            width: screen === 'results' ? 600 : 480,
            maxWidth: 'calc(100vw - 48px)',
            maxHeight: 'calc(100vh - 64px)',
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'width 0.25s ease',
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              padding: '20px 20px 16px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <h2 style={{ fontSize: 20, fontWeight: 400, color: 'var(--grey-900)', lineHeight: 1.2 }}>
                {screen === 'results'
                  ? 'Evaluation Complete'
                  : screen === 'grading'
                  ? 'Grading in Progress...'
                  : isReupload ? 'Re-upload Document' : 'Upload Document'}
              </h2>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{itemName}</span>
            </div>
            {screen === 'upload' && (
              <button
                onClick={handleClose}
                aria-label="Close dialog"
                style={{
                  width: 30, height: 30, borderRadius: 8, border: 'none',
                  background: 'transparent', color: 'var(--grey-500)',
                  fontSize: 20, lineHeight: 1, cursor: 'pointer',
                }}
              >×</button>
            )}
          </div>

          {/* ── Body ── */}
          <div style={{ overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ──────── Screen 1: Upload ──────── */}
            {screen === 'upload' && (
              <>
                <div
                  style={{
                    border: `2px dashed ${dragOver ? 'var(--grey-900)' : 'var(--border)'}`,
                    borderRadius: 10,
                    background: dragOver ? 'var(--grey-50)' : 'var(--white)',
                    padding: 32,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all var(--t-fast)',
                  }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); addFile(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => addFile(e.target.files)}
                  />
                  <svg
                    style={{ margin: '0 auto 12px', color: 'var(--grey-400)', display: 'block' }}
                    width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--grey-700)', marginBottom: 4 }}>
                    Drop file here or click to upload
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    <span style={{ color: 'var(--grey-600)', fontWeight: 500 }}>PDF files only</span>
                  </p>
                </div>

                {file && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    background: 'var(--grey-50)', border: '1px solid var(--border)', borderRadius: 8,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--grey-500)" strokeWidth="1.8">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--grey-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{Math.round(file.size / 1024)} KB</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      style={{ color: 'var(--grey-400)', fontSize: 18, cursor: 'pointer', border: 'none', background: 'none', lineHeight: 1, padding: '0 2px' }}
                    >×</button>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <button
                    onClick={handleClose}
                    style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', fontSize: 13, fontWeight: 500, color: 'var(--grey-700)', cursor: 'pointer' }}
                  >Cancel</button>
                  <button
                    onClick={() => { void handleUpload(); }}
                    disabled={!file}
                    style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: file ? 'var(--grey-900)' : 'var(--grey-300)', color: 'var(--white)', fontSize: 13, fontWeight: 500, cursor: file ? 'pointer' : 'not-allowed', transition: 'background 0.15s' }}
                  >Upload &amp; Grade</button>
                </div>
              </>
            )}

            {/* ──────── Screen 2: Grading animation ──────── */}
            {screen === 'grading' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0 4px' }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--grey-900)', marginBottom: 4 }}>
                  AI is evaluating your submission against the rubric...
                </p>
                {GRADING_STEPS.map((s, i) => {
                  const done = i < gradingStep;
                  const active = i === gradingStep - 1 && gradingStep < GRADING_STEPS.length;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: done ? 'var(--grey-900)' : 'var(--grey-150)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.3s' }}>
                        {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                        {active && <div style={{ width: 10, height: 10, border: '2px solid var(--grey-600)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
                      </div>
                      <span style={{ fontSize: 13, color: done ? 'var(--grey-900)' : 'var(--text-3)', fontWeight: done ? 500 : 400, transition: 'color 0.3s' }}>{s}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ──────── Screen 3: Evaluation results ──────── */}
            {screen === 'results' && evaluation && vc && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Score hero */}
                <div style={{ background: 'var(--grey-50)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <p style={{ fontSize: 30, fontWeight: 700, color: 'var(--grey-900)', lineHeight: 1 }}>
                      {evaluation.overallScore}
                      <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text-3)' }}>/{evaluation.maxScore}</span>
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{evaluation.pct}%</p>
                  </div>
                  <div style={{ width: 1, height: 40, background: 'var(--border)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--grey-900)' }}>Grade {evaluation.grade}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 99, background: vc.bg, fontSize: 11, fontWeight: 600, color: vc.color }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: vc.dot, flexShrink: 0 }} />
                        {evaluation.verdict}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--grey-600)', lineHeight: 1.5 }}>{evaluation.summary}</p>
                  </div>
                </div>

                {/* Criteria */}
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Criteria Assessment</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {evaluation.criteria.map((c) => {
                      const pct = Math.round((c.score / c.maxScore) * 100);
                      const sc = statusColor[c.status];
                      return (
                        <div key={c.criterionId} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                          {/* Criterion header */}
                          <div style={{ padding: '12px 14px 10px', background: 'var(--white)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="15" height="15" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                                  <circle cx="9" cy="9" r="8" stroke={sc} strokeWidth="1.8" fill={c.status === 'covered' ? sc : 'none'} />
                                  {c.status === 'covered' && <polyline points="5,9 8,12 13,6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
                                  {c.status === 'partial' && <path d="M9 1a8 8 0 0 1 0 16" stroke={sc} strokeWidth="1.8" fill={sc} strokeLinecap="round" />}
                                </svg>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--grey-900)' }}>{c.criterion}</span>
                                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>({c.weight}% weight)</span>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--grey-900)', flexShrink: 0 }}>
                                {c.score}<span style={{ fontWeight: 400, color: 'var(--text-3)' }}>/{c.maxScore}</span>
                              </span>
                            </div>
                            {/* Score bar */}
                            <div style={{ height: 5, background: 'var(--grey-150)', borderRadius: 3, marginBottom: 8 }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: sc, borderRadius: 3, transition: 'width 0.6s ease' }} />
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--grey-600)', lineHeight: 1.5 }}>{c.feedback}</p>
                          </div>
                          {/* Checkpoints */}
                          <div style={{ background: 'var(--grey-50)', borderTop: '1px solid var(--grey-100)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {c.checkpoints.map((cp, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                                {cp.passed ? (
                                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                  </div>
                                ) : (
                                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                  </div>
                                )}
                                <span style={{ fontSize: 11, color: cp.passed ? 'var(--grey-700)' : '#991b1b', lineHeight: 1.4 }}>{cp.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Strengths */}
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Strengths</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {evaluation.strengths.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--grey-700)', lineHeight: 1.55 }}>{s}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggestions */}
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Suggestions</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {evaluation.suggestions.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--grey-700)', lineHeight: 1.55 }}>{s}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confirm row */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={handleClose}
                    style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', fontSize: 13, fontWeight: 500, color: 'var(--grey-700)', cursor: 'pointer' }}
                  >Discard</button>
                  <button
                    onClick={handleConfirm}
                    style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--grey-900)', color: 'var(--white)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                  >Confirm Submission →</button>
                </div>

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
