import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import { projectsApi } from '../../api/projects';
import { analyticsApi } from '../../api/workflow';
import { teamsApi } from '../../api/teams';
import type { BackendProject, ProjectAnalytics } from '../../api/types';

/* ─── Helpers ─── */
const card: React.CSSProperties = {
  background: 'var(--white)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '18px 20px',
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: '#dcfce7', color: '#166534', label: 'Active' },
    at_risk: { bg: '#fef3c7', color: '#92400e', label: 'At Risk' },
    completed: { bg: '#ede9fe', color: '#5b21b6', label: 'Completed' },
    archived: { bg: '#f3f4f6', color: '#6b7280', label: 'Archived' },
  };
  const s = cfg[status] ?? cfg.archived;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
      background: s.bg, color: s.color,
    }}>{s.label}</span>
  );
}

function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 5, background: 'var(--grey-150)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--grey-700)', width: 30 }}>{score}%</span>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 700, color: accent ?? 'var(--grey-900)', lineHeight: 1.1 }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{sub}</span>}
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[140, 90, 60, 100, 70, 80].map((w, i) => (
        <td key={i} style={{ padding: '12px 16px' }}>
          <div style={{ height: 12, width: w, background: 'var(--grey-150)', borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite' }} />
        </td>
      ))}
    </tr>
  );
}

/* ─── Risk Heatmap ─── */
interface RiskCell {
  projectName: string;
  risk: number; // 0-100
  status: string;
}
function RiskHeatmap({ cells }: { cells: RiskCell[] }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--grey-900)', marginBottom: 14 }}>
        Risk Heatmap
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {cells.map((cell) => {
          const heat = cell.risk;
          const bg = heat >= 70 ? '#fee2e2' : heat >= 40 ? '#fef3c7' : '#dcfce7';
          const border = heat >= 70 ? '#fca5a5' : heat >= 40 ? '#fde68a' : '#bbf7d0';
          const textColor = heat >= 70 ? '#991b1b' : heat >= 40 ? '#92400e' : '#166534';
          return (
            <div key={cell.projectName} style={{
              padding: '10px 14px', borderRadius: 10, border: `1px solid ${border}`,
              background: bg, minWidth: 120, textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: textColor, marginBottom: 4, lineHeight: 1.3 }}>
                {cell.projectName.split(' ').slice(0, 3).join(' ')}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: textColor }}>{heat}%</div>
              <div style={{ fontSize: 10, color: textColor, opacity: 0.7 }}>risk</div>
            </div>
          );
        })}
        {cells.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-3)', padding: '8px 0' }}>No projects yet.</p>
        )}
      </div>
    </div>
  );
}

/* ─── AI Activity Feed ─── */
const MOCK_ACTIVITY = [
  { time: '2 min ago', text: 'Risk Detection Agent flagged 28h inactivity on Project Alpha', who: 'AI', type: 'risk' },
  { time: '10 min ago', text: 'Planning Agent regenerated timeline for Team Omega after scope change', who: 'AI', type: 'plan' },
  { time: '1 hr ago', text: 'Submission Readiness Agent: Team Delta is GO — 94% rubric coverage', who: 'AI', type: 'submit' },
  { time: '2 hrs ago', text: 'Coordination Agent redistributed 3 tasks from inactive member', who: 'AI', type: 'coord' },
  { time: '4 hrs ago', text: 'Instruction Analysis Agent parsed new rubric for Project Beta', who: 'AI', type: 'analysis' },
];

const typeColor: Record<string, string> = {
  risk: '#ef4444', plan: '#6366f1', submit: '#22c55e', coord: '#f59e0b', analysis: '#8b5cf6',
};

function AgentActivityFeed() {
  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--grey-900)', marginBottom: 14 }}>
        AI Agent Activity
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {MOCK_ACTIVITY.map((item, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            padding: '10px 0',
            borderBottom: i < MOCK_ACTIVITY.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: typeColor[item.type] ?? '#6b7280',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>AI</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, color: 'var(--grey-800)', marginBottom: 2 }}>{item.text}</p>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
interface ProjectRow {
  project: BackendProject;
  analytics: ProjectAnalytics | null;
  memberCount: number;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const projects = await projectsApi.list();
        if (cancelled) return;

        const [analyticsResults, memberResults] = await Promise.all([
          Promise.allSettled(projects.map(p => analyticsApi.projectOverview(p.id))),
          Promise.allSettled(projects.map(p => teamsApi.listByProject(p.id))),
        ]);

        if (cancelled) return;

        setRows(projects.map((p, i) => ({
          project: p,
          analytics: analyticsResults[i].status === 'fulfilled'
            ? (analyticsResults[i] as PromiseFulfilledResult<ProjectAnalytics>).value
            : null,
          memberCount: memberResults[i].status === 'fulfilled'
            ? (memberResults[i] as PromiseFulfilledResult<unknown[]>).value.length
            : 0,
        })));
        setApiAvailable(true);
      } catch {
        if (!cancelled) setApiAvailable(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  /* Derived stats */
  const totalProjects = rows.length;
  const activeCount = rows.filter(r => r.project.status === 'active').length;
  const atRiskCount = rows.filter(r => r.project.status === 'at_risk').length;
  const completedCount = rows.filter(r => r.project.status === 'completed').length;
  const avgCompletion = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + (r.analytics?.completion_pct ?? 0), 0) / rows.length)
    : 0;

  const riskCells: RiskCell[] = rows.map(r => ({
    projectName: r.project.name,
    risk: Math.round((r.analytics?.deadline_failure_probability ?? 0) * 100),
    status: r.project.status,
  }));

  return (
    <PageLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 26, fontWeight: 400, color: 'var(--grey-900)', lineHeight: 1.2 }}>
              Admin Overview
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
            Monitor all project teams — progress, risks, and AI activity
          </p>
        </div>
        {!apiAvailable && (
          <span style={{ fontSize: 11, color: 'var(--text-3)', padding: '4px 10px', background: 'var(--grey-100)', borderRadius: 6 }}>
            Demo mode — backend offline
          </span>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Projects" value={loading ? '—' : totalProjects} sub={`${completedCount} completed`} />
        <StatCard label="Active Teams" value={loading ? '—' : activeCount} sub="Currently running" accent="#7d2027" />
        <StatCard label="At Risk" value={loading ? '—' : atRiskCount} sub="Needs attention" accent={atRiskCount > 0 ? '#f59e0b' : undefined} />
        <StatCard label="Avg Completion" value={loading ? '—' : `${avgCompletion}%`} sub="Across all projects" />
      </div>

      {/* Project Teams Table */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--grey-900)' }}>All Project Teams</h2>
        </div>
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--grey-50)' }}>
                {['Project', 'Status', 'Members', 'Progress', 'Health Score', 'Deadline', ''].map((h) => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left',
                    fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                    No projects in the system yet.
                  </td>
                </tr>
              ) : (
                rows.map(({ project, analytics, memberCount }) => {
                  const progress = analytics?.completion_pct ?? 0;
                  const health = analytics?.health_score ?? 0;
                  const days = daysUntil(project.deadline_date);

                  return (
                    <tr
                      key={project.id}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background var(--t-fast)' }}
                      onClick={() => navigate(`/admin/projects/${project.id}`)}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--grey-50)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--grey-900)' }}>{project.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {project.description ?? '—'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge status={project.status} />
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--grey-700)', fontSize: 13 }}>
                        {memberCount}
                      </td>
                      <td style={{ padding: '12px 16px', minWidth: 140 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                              {analytics?.task_stats?.done ?? 0}/{analytics?.total_tasks ?? 0} tasks
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--grey-700)' }}>
                              {Math.round(progress)}%
                            </span>
                          </div>
                          <div style={{ height: 4, background: 'var(--grey-150)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: '#7d2027', borderRadius: 2, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', minWidth: 130 }}>
                        <HealthBar score={health} />
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>
                        {project.deadline_date ? (
                          <div>
                            <div style={{ color: 'var(--grey-700)', fontWeight: 500 }}>
                              {project.deadline_date.slice(0, 10)}
                            </div>
                            {days !== null && (
                              <div style={{
                                fontSize: 11, marginTop: 1,
                                color: days < 0 ? '#dc2626' : days <= 3 ? '#f59e0b' : 'var(--text-3)',
                                fontWeight: days < 7 ? 600 : 400,
                              }}>
                                {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/admin/projects/${project.id}`); }}
                          style={{
                            fontSize: 11, fontWeight: 600, padding: '5px 12px',
                            borderRadius: 6, border: '1px solid var(--border)',
                            background: 'transparent', cursor: 'pointer',
                            color: '#7d2027', transition: 'all var(--t-fast)',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.08)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = '#a5b4fc';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = '';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                          }}
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom row: Heatmap + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <RiskHeatmap cells={riskCells} />
        <AgentActivityFeed />
      </div>
    </PageLayout>
  );
}
