import { useState } from 'react';
import PageLayout from '../components/layout/PageLayout';
import TopBar from '../components/layout/TopBar';
import Button from '../components/ui/Button';
import { MOCK_RUBRIC } from '../data/mockData';
import type { RubricItem } from '../types';

const statusConfig: Record<RubricItem['status'], { label: string; icon: string; color: string }> = {
  covered: { label: 'Covered',  icon: '✓', color: 'var(--grey-900)' },
  partial: { label: 'Partial',  icon: '◑', color: 'var(--grey-500)' },
  missing: { label: 'Missing',  icon: '○', color: 'var(--grey-300)' },
};

export default function SubmissionPage() {
  const [expanded, setExpanded] = useState<string | null>('rb3');

  const totalScore = MOCK_RUBRIC.reduce((s, r) => s + r.score, 0);
  const maxScore   = MOCK_RUBRIC.reduce((s, r) => s + r.maxScore, 0);
  const covered    = MOCK_RUBRIC.filter(r => r.status === 'covered').length;
  const partial    = MOCK_RUBRIC.filter(r => r.status === 'partial').length;
  const missing    = MOCK_RUBRIC.filter(r => r.status === 'missing').length;
  const readiness  = Math.round((totalScore / maxScore) * 100);

  const card: React.CSSProperties = {
    background: 'var(--white)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
  };

  const artifacts = [
    { name: 'Project Brief',             status: 'found',  file: 'project_brief.pdf' },
    { name: 'Grading Rubric',            status: 'found',  file: 'grading_rubric.docx' },
    { name: 'Meeting Transcripts',       status: 'found',  file: '3 files uploaded' },
    { name: 'Technical Documentation',   status: 'partial', file: 'architecture.md — API docs missing' },
    { name: 'Test Report',               status: 'missing', file: 'Not uploaded' },
    { name: 'Final Presentation Slides', status: 'missing', file: 'Not uploaded' },
  ];

  const artColors = { found: 'var(--grey-900)', partial: 'var(--grey-500)', missing: 'var(--grey-300)' };
  const artIcons  = { found: '✓', partial: '◑', missing: '○' };

  return (
    <PageLayout
      topBar={
        <TopBar
          title="Submission Readiness"
          subtitle="Rubric coverage, artifact status, and submission checklist"
          actions={
            <Button variant="primary" size="sm">Generate Report</Button>
          }
        />
      }
    >
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Readiness Score', value: `${readiness}%`, sub: `${totalScore} / ${maxScore} points` },
          { label: 'Fully Covered',   value: covered,          sub: `${MOCK_RUBRIC.length} criteria total` },
          { label: 'Partial Coverage', value: partial,         sub: 'Needs more evidence' },
          { label: 'Missing',          value: missing,         sub: 'Requires action' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--grey-900)', lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: 'var(--text-2)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      <div style={{ ...card, padding: '14px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 600 }}>Overall Rubric Coverage</p>
          <span style={{ fontSize: 12, fontWeight: 700 }}>{readiness}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--grey-150)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${readiness}%`, height: '100%', background: 'var(--grey-900)', borderRadius: 3, transition: 'width 0.8s ease' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        {/* Rubric checklist */}
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--grey-900)' }}>Rubric Criteria</p>
          </div>
          {MOCK_RUBRIC.map((item, i) => {
            const sc = statusConfig[item.status];
            const isOpen = expanded === item.id;
            return (
              <div key={item.id} style={{ borderBottom: i < MOCK_RUBRIC.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                    cursor: 'pointer', background: isOpen ? 'var(--grey-50)' : 'var(--white)',
                    transition: 'background var(--t-fast)',
                  }}
                >
                  <span style={{ fontSize: 15, color: sc.color, flexShrink: 0, fontWeight: 600 }}>{sc.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--grey-900)', marginBottom: 2 }}>{item.criterion}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Weight: {item.weight}%</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Score: {item.score}/{item.maxScore}</span>
                    </div>
                  </div>
                  {/* Mini progress */}
                  <div style={{ width: 60, height: 3, background: 'var(--grey-150)', borderRadius: 2, flexShrink: 0 }}>
                    <div style={{ width: `${(item.score / item.maxScore) * 100}%`, height: '100%', background: sc.color, borderRadius: 2 }} />
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, flexShrink: 0,
                    background: item.status === 'covered' ? 'var(--grey-900)' : item.status === 'partial' ? 'var(--grey-150)' : 'var(--grey-100)',
                    color: item.status === 'covered' ? 'var(--white)' : 'var(--grey-600)',
                  }}>{sc.label}</span>
                  <svg style={{ flexShrink: 0, color: 'var(--grey-400)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--t-fast)' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
                {isOpen && (
                  <div style={{ padding: '10px 20px 14px 48px', background: 'var(--grey-50)', borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
                      <strong style={{ color: 'var(--grey-700)' }}>AI Evidence: </strong>{item.evidence}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Artifact checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 12, fontWeight: 600 }}>Required Artifacts</p>
            </div>
            {artifacts.map((a, i) => (
              <div key={a.name} style={{
                display: 'flex', gap: 10, padding: '12px 16px', alignItems: 'flex-start',
                borderBottom: i < artifacts.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ fontSize: 13, color: artColors[a.status as keyof typeof artColors], flexShrink: 0, fontWeight: 600 }}>{artIcons[a.status as keyof typeof artIcons]}</span>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--grey-900)', marginBottom: 2 }}>{a.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{a.file}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Submit action */}
          <div style={{ ...card, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Submission Status</p>
            <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 12 }}>
              {missing > 0
                ? `${missing} artifact(s) missing and ${partial} criteria partially covered before submission.`
                : 'All required artifacts present. Ready for final review.'}
            </p>
            <div style={{ height: 1, background: 'var(--border)', marginBottom: 12 }} />
            <Button variant={missing > 0 ? 'secondary' : 'primary'} style={{ width: '100%', justifyContent: 'center' }}>
              {missing > 0 ? 'Mark Ready When Complete' : 'Submit Project'}
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
