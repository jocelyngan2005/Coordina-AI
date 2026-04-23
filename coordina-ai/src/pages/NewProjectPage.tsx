import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import TopBar from '../components/layout/TopBar';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

type DocType = 'brief' | 'rubric' | 'transcript' | 'chat_log';

interface UploadedFile { name: string; type: DocType; size: string; }

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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const newFiles = Array.from(e.dataTransfer.files).map(f => ({
      name: f.name, type: 'brief' as DocType, size: `${Math.round(f.size / 1024)} KB`,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }

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

  return (
    <PageLayout
      topBar={
        <TopBar
          title="New Project"
          subtitle="Upload project documents and configure your team"
        />
      }
    >
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28, maxWidth: 520 }}>
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

      <div style={{ maxWidth: 640 }}>
        {/* Step 0 — Upload */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => {
                const newFiles = Array.from(e.target.files || []).map(f => ({ name: f.name, type: 'brief' as DocType, size: `${Math.round(f.size / 1024)} KB` }));
                setFiles(prev => [...prev, ...newFiles]);
              }} />
              <svg style={{ margin: '0 auto 12px', color: 'var(--grey-400)' }} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--grey-700)', marginBottom: 4 }}>Drop files here or click to upload</p>
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>PDF, DOCX, TXT — briefs, rubrics, meeting transcripts, chat logs</p>
            </div>

            {files.length > 0 && (
              <div style={card}>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Uploaded Documents</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < files.length - 1 ? '1px solid var(--border)' : 'none' }}>
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
                        <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} style={{ color: 'var(--grey-400)', fontSize: 16, cursor: 'pointer', border: 'none', background: 'none' }}>×</button>
                      </div>
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

        {/* Step 1 — Team & Timeline */}
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
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--grey-700)', display: 'block', marginBottom: 6 }}>Team Members <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(one per line: Name, Role)</span></label>
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

        {/* Step 2 — AI Ingestion */}
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
    </PageLayout>
  );
}
