import PageLayout from '../components/layout/PageLayout';
import TopBar from '../components/layout/TopBar';
import { MOCK_RISKS, MOCK_PROJECT } from '../data/mockData';
import type { RiskSeverity, RiskType } from '../types';

const severityStyles: Record<RiskSeverity, { dot: string; label: string; bg: string }> = {
  high:   { dot: '#111', label: 'High',   bg: '#f5f5f5' },
  medium: { dot: '#666', label: 'Medium', bg: '#fafafa' },
  low:    { dot: '#aaa', label: 'Low',    bg: 'var(--white)' },
};

const typeLabels: Record<RiskType, string> = {
  inactivity:       'Inactivity',
  deadline:         'Deadline Risk',
  ambiguity:        'Ambiguity',
  missing_artifact: 'Missing Artifact',
};

function RiskGauge({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const stroke = (score / 100) * circ * 0.75; // 3/4 arc
  return (
    <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
      <svg viewBox="0 0 140 140" width={140} height={140}>
        {/* Track */}
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--grey-150)" strokeWidth="10"
          strokeDasharray={`${circ * 0.75} ${circ}`} strokeDashoffset={0}
          strokeLinecap="round" transform="rotate(135 70 70)" />
        {/* Fill */}
        <circle cx="70" cy="70" r={r} fill="none"
          stroke={score > 60 ? '#111' : score > 35 ? '#666' : '#aaa'}
          strokeWidth="10"
          strokeDasharray={`${stroke} ${circ}`}
          strokeDashoffset={0}
          strokeLinecap="round" transform="rotate(135 70 70)"
          style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 12 }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--grey-900)', lineHeight: 1 }}>{score}%</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{score > 60 ? 'High Risk' : score > 35 ? 'Medium' : 'Low Risk'}</span>
      </div>
    </div>
  );
}

export default function RiskPage() {
  const p = MOCK_PROJECT;
  const memberMap = Object.fromEntries(p.teamMembers.map(m => [m.id, m]));

  const card: React.CSSProperties = {
    background: 'var(--white)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: 20,
  };

  return (
    <PageLayout
      topBar={<TopBar title="Risk & Alerts" subtitle="AI-detected risks, inactivity flags, and deadline predictions" />}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, marginBottom: 16 }}>
        {/* Risk gauge */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Overall Risk</p>
          <RiskGauge score={p.riskScore} />
          <p style={{ fontSize: 11, color: 'var(--text-2)', textAlign: 'center', lineHeight: 1.5 }}>Moderate risk — 2 active issues require attention</p>
        </div>

        {/* Risk breakdown */}
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Risk Breakdown</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[
              { label: 'Deadline Risk', value: 42, sub: 'REST API task delayed' },
              { label: 'Inactivity',    value: 28, sub: '1 member flagged' },
              { label: 'Ambiguity',     value: 18, sub: '1 rubric criterion unclear' },
              { label: 'Missing Items', value: 12, sub: 'Test report not uploaded' },
            ].map(item => (
              <div key={item.label} style={{ padding: '12px 14px', background: 'var(--grey-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--grey-800)' }}>{item.label}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--grey-900)' }}>{item.value}%</span>
                </div>
                <div style={{ height: 3, background: 'var(--grey-200)', borderRadius: 2 }}>
                  <div style={{ width: `${item.value}%`, height: '100%', background: 'var(--grey-700)', borderRadius: 2 }} />
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alert feed */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--grey-900)' }}>Active Alerts <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>({MOCK_RISKS.length})</span></p>
        </div>
        {MOCK_RISKS.map((alert, i) => {
          const sv = severityStyles[alert.severity];
          return (
            <div key={alert.id} style={{
              padding: '16px 20px',
              borderBottom: i < MOCK_RISKS.length - 1 ? '1px solid var(--border)' : 'none',
              background: sv.bg,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ marginTop: 5, width: 8, height: 8, borderRadius: '50%', background: sv.dot, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--grey-900)' }}>{alert.message}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99,
                      background: 'var(--grey-200)', color: 'var(--grey-600)',
                    }}>{typeLabels[alert.type]}</span>
                    {alert.memberId && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        → {memberMap[alert.memberId]?.name}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 4 }}>{alert.detail}</p>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{alert.timestamp}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: sv.dot, flexShrink: 0, marginTop: 2 }}>{sv.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inactivity table */}
      <div style={{ ...card, marginTop: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, fontWeight: 600 }}>Member Activity</p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--grey-50)' }}>
              {['Member', 'Role', 'Last Active', 'Contribution', 'Tasks', 'Status'].map(h => (
                <th key={h} style={{ padding: '8px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.teamMembers.map((m, i) => {
              const isRisk = m.id === 'm4';
              return (
                <tr key={m.id} style={{ borderBottom: i < p.teamMembers.length - 1 ? '1px solid var(--border)' : 'none', background: isRisk ? '#fafafa' : 'var(--white)' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--grey-900)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{m.initials}</div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--grey-900)' }}>{m.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text-2)' }}>{m.role}</td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: isRisk ? 'var(--grey-800)' : 'var(--text-2)', fontWeight: isRisk ? 600 : 400 }}>{m.lastActive}</td>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 3, background: 'var(--grey-150)', borderRadius: 2 }}>
                        <div style={{ width: `${m.contributionScore}%`, height: '100%', background: 'var(--grey-700)', borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{m.contributionScore}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text-2)' }}>{m.taskCount}</td>
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                      background: isRisk ? 'var(--grey-900)' : 'var(--grey-150)',
                      color: isRisk ? 'var(--white)' : 'var(--grey-600)',
                    }}>{isRisk ? '⚠ Inactive' : 'Active'}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
}
