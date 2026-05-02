import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { projectsApi } from '../api/projects';
import { analyticsApi } from '../api/workflow';
import type { BackendProject, ProjectAnalytics } from '../api/types';

const card: React.CSSProperties = {
  background: '#fafaf8',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '16px 18px',
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

  // ── Data from local mock API ──────────────────────────────────────────────
  const [rows, setRows] = useState<ProjectRowData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const projects = await projectsApi.list();
        if (cancelled) return;

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
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    // Re-fetch when the tab regains focus (e.g. returning from project creation)
    function onFocus() { void load(); }
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const activeCount = rows.filter((r) => r.project.status === 'active').length;
  const atRiskCount = rows.filter((r) => r.project.status === 'at_risk').length;

  // Aggregate stats from all projects
  const totalTasks = rows.reduce((sum, r) => sum + (r.analytics?.total_tasks ?? 0), 0);
  const doneTasks = rows.reduce((sum, r) => sum + (r.analytics?.task_stats?.done ?? 0), 0);
  const activeTasks = rows.reduce((sum, r) => sum + (r.analytics?.task_stats?.in_progress ?? 0), 0);

  // Calculate average health score across all projects
  const avgHealthScore = rows.length > 0
    ? Math.round(rows.reduce((sum, r) => sum + (r.analytics?.health_score ?? 50), 0) / rows.length)
    : 0;

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

      {/* Show empty state if no projects yet */}
      {!loading && rows.length === 0 ? (
        <div
          style={{
            background: 'var(--white)',
            padding: '80px 20px',
            textAlign: 'center',
            marginTop: 40,
          }}
        >
          <p style={{ fontSize: 16, color: 'var(--grey-500)' }}>No projects yet</p>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <StatCard
              label="Active Projects"
              value={activeCount}
              sub={atRiskCount > 0 ? `${atRiskCount} at risk` : 'All on track'}
            />
            <StatCard
              label="Tasks Complete"
              value={totalTasks > 0 ? `${doneTasks}/${totalTasks}` : '0/0'}
              sub={`${activeTasks} in progress`}
            />
            <StatCard label="Total Team Size" value={rows.length} sub={rows.length === 1 ? '1 project' : `${rows.length} projects`} />
            <StatCard
              label="Team Health"
              value={`${avgHealthScore}%`}
              sub={avgHealthScore >= 70 ? 'Healthy' : avgHealthScore >= 50 ? 'At risk' : 'Critical'}
            />
          </div>

          {/* Active Projects */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--grey-900)' }}>Active Projects</h2>
          </div>

          {loading ? (
            <ProjectCardSkeleton />
          ) : (
            // ── Projects from local mock API ─────────────────────────────────────
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
                            label={project.status === 'at_risk' ? 'At Risk' : project.status.charAt(0).toUpperCase() + project.status.slice(1)}
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
        </>
      )}
    </PageLayout>
  );
}
