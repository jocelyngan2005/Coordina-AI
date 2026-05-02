import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { projectsApi } from '../api/projects';
import { analyticsApi } from '../api/workflow';
import type { BackendProject, ProjectAnalytics } from '../api/types';

const card: React.CSSProperties = {
  background: 'var(--white)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: 20,
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--grey-900)', lineHeight: 1.1 }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{sub}</span>}
    </div>
  );
}

// Skeleton card shown while loading
function ProjectCardSkeleton() {
  const shimmer: React.CSSProperties = {
    background: 'var(--grey-150)',
    borderRadius: 4,
    animation: 'pulse 1.5s ease-in-out infinite',
  };
  return (
    <div style={{ ...card, marginBottom: 24 }}>
      <div style={{ height: 16, width: '40%', marginBottom: 10, ...shimmer }} />
      <div style={{ height: 12, width: '70%', marginBottom: 20, ...shimmer }} />
      <div style={{ height: 4, width: '100%', marginBottom: 14, ...shimmer }} />
      <div style={{ height: 28, width: '30%', ...shimmer }} />
    </div>
  );
}

interface ProjectRowData {
  project: BackendProject;
  analytics: ProjectAnalytics | null;
}

export default function DashboardPage() {
  const navigate = useNavigate();

  // ── Real data from backend ────────────────────────────────────────────────
  const [rows, setRows] = useState<ProjectRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const projects = await projectsApi.list();
        if (cancelled) return;

        // Fetch analytics for each project in parallel (best-effort)
        const analyticsResults = await Promise.allSettled(
          projects.map((p) => analyticsApi.projectOverview(p.id)),
        );

        if (cancelled) return;

        setRows(
          projects.map((p, i) => ({
            project: p,
            analytics:
              analyticsResults[i].status === 'fulfilled'
                ? (analyticsResults[i] as PromiseFulfilledResult<ProjectAnalytics>).value
                : null,
          })),
        );
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

  // ── Derived stats ─────────────────────────────────────────────────────────
  const activeCount = apiAvailable ? rows.filter((r) => r.project.status === 'active').length : 0;
  const atRiskCount = apiAvailable ? rows.filter((r) => r.project.status === 'at_risk').length : 0;

  const firstAnalytics = rows[0]?.analytics ?? null;
  const totalTasks = firstAnalytics?.total_tasks ?? 0;
  const doneTasks = firstAnalytics?.task_stats?.done ?? 0;
  const activeTasks = firstAnalytics?.task_stats?.in_progress ?? 0;
  const riskScore = firstAnalytics?.health_score ?? 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageLayout>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 400, color: 'var(--grey-900)', lineHeight: 1.2, marginBottom: 4 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Overview of your active projects and team</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => navigate('/projects/new')}>+ New Project</Button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard
          label="Active Projects"
          value={apiAvailable ? activeCount : 1}
          sub={atRiskCount > 0 ? `${atRiskCount} approaching deadline` : 'All on track'}
        />
        <StatCard
          label="Tasks Complete"
          value={`${doneTasks}/${totalTasks}`}
          sub={`${activeTasks} in progress`}
        />
        <StatCard label="Active Agents" value={3} sub="2 idle · 0 errors" />
        <StatCard
          label="Risk Score"
          value={`${riskScore}%`}
          sub="Medium — 2 alerts open"
        />
      </div>

      {/* Active Projects */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--grey-900)' }}>Recent Projects</h2>
        {!apiAvailable && (
          <span style={{ fontSize: 11, color: 'var(--text-3)', padding: '3px 8px', background: 'var(--grey-100)', borderRadius: 6 }}>
            Demo mode — backend offline
          </span>
        )}
      </div>

      {loading ? (
        <ProjectCardSkeleton />
      ) : apiAvailable && rows.length > 0 ? (
        // ── Real projects from API ───────────────────────────────────────────
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {rows.map(({ project, analytics }) => {
            const progress = analytics?.completion_pct ?? 0;
            const done = analytics?.task_stats?.done ?? 0;
            const total = analytics?.total_tasks ?? 0;
            const deadline = project.deadline_date
              ? project.deadline_date.slice(0, 10)
              : '—';

            return (
              <div
                key={project.id}
                style={{ ...card, cursor: 'pointer' }}
                onClick={() => navigate(`/projects/${project.id}`)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--grey-400)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600 }}>{project.name}</h3>
                      <Badge
                        label={
                          project.status === 'at_risk' ? 'At Risk' :
                          project.status === 'completed' ? 'Completed' :
                          project.status === 'archived' ? 'Archived' :
                          'Active'
                        }
                        variant={project.status === 'at_risk' ? 'black' : 'black'}
                      />
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--grey-500)', maxWidth: 480 }}>
                      {project.description ?? 'No description provided.'}
                    </p>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--grey-400)', flexShrink: 0, marginLeft: 16 }}>
                    Due {deadline}
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: total > 0 ? 14 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Progress</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--grey-700)' }}>{Math.round(progress)}%</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--grey-150)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: 'var(--grey-900)', transition: 'width 0.6s ease', borderRadius: 2 }} />
                  </div>
                </div>

                {total > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {done} of {total} tasks done
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // ── No projects available ────────────────────────────────────────────
        <div style={{ ...card, marginBottom: 24, textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 16 }}>No projects available yet.</p>
          <Button variant="primary" size="sm" onClick={() => navigate('/projects/new')}>Create your first project</Button>
        </div>
      )}

      {/* Recent activity */}
      <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--grey-900)' }}>Recent Activity</h2>
      <div style={{ ...card }}>
        {[
          { time: '2 min ago', text: 'Risk Detection Agent flagged 28h inactivity for Sam Okonkwo', who: 'AI' },
          { time: '10 min ago', text: 'Deadline risk recalculated — REST API task at risk', who: 'AI' },
          { time: '1 hr ago', text: 'Priya Sharma pushed model training checkpoint', who: 'PS' },
          { time: '3 hrs ago', text: 'Mei Tanaka submitted usability test report for review', who: 'MT' },
          { time: '5 hrs ago', text: 'Alex Chen updated system architecture document', who: 'AC' },
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            padding: '10px 0',
            borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: item.who === 'AI' ? 'var(--grey-900)' : 'var(--grey-200)',
              color: item.who === 'AI' ? 'var(--white)' : 'var(--grey-700)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, flexShrink: 0,
            }}>{item.who}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, color: 'var(--grey-800)', marginBottom: 2 }}>{item.text}</p>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.time}</span>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
