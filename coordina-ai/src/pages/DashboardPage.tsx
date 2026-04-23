import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import TopBar from '../components/layout/TopBar';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { MOCK_PROJECT } from '../data/mockData';

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

function MemberAvatar({ initials }: { initials: string }) {
  return (
    <div style={{
      width: 28, height: 28,
      borderRadius: '50%',
      background: 'var(--grey-900)',
      color: 'var(--white)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 600,
      flexShrink: 0,
    }}>{initials}</div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const p = MOCK_PROJECT;
  const doneTasks = p.tasks.filter(t => t.status === 'done').length;
  const activeTasks = p.tasks.filter(t => t.status === 'in_progress').length;

  return (
    <PageLayout
      topBar={
        <TopBar
          title="Dashboard"
          subtitle="Overview of your active projects and team"
          actions={
            <Button variant="primary" size="sm" onClick={() => navigate('/projects/new')}>
              + New Project
            </Button>
          }
        />
      }
    >
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Active Projects" value={1} sub="1 approaching deadline" />
        <StatCard label="Tasks Complete" value={`${doneTasks}/${p.tasks.length}`} sub={`${activeTasks} in progress`} />
        <StatCard label="Active Agents" value={3} sub="2 idle · 0 errors" />
        <StatCard label="Risk Score" value={`${p.riskScore}%`} sub="Medium — 2 alerts open" />
      </div>

      {/* Active projects */}
      <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--grey-900)' }}>Active Projects</h2>
      <div
        style={{ ...card, cursor: 'pointer', marginBottom: 24 }}
        onClick={() => navigate('/projects/proj-001')}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--grey-400)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</h3>
              <Badge label="Active" variant="black" />
            </div>
            <p style={{ fontSize: 12, color: 'var(--grey-500)', maxWidth: 480 }}>{p.description}</p>
          </div>
          <span style={{ fontSize: 12, color: 'var(--grey-400)', flexShrink: 0, marginLeft: 16 }}>Due {p.deadline}</span>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Progress</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--grey-700)' }}>{p.progress}%</span>
          </div>
          <div style={{ height: 4, background: 'var(--grey-150)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${p.progress}%`, height: '100%', background: 'var(--grey-900)', transition: 'width 0.6s ease', borderRadius: 2 }} />
          </div>
        </div>

        {/* Team */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {p.teamMembers.map(m => <MemberAvatar key={m.id} initials={m.initials} />)}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{p.teamMembers.length} members · {doneTasks} of {p.tasks.length} tasks done</span>
        </div>
      </div>

      {/* Recent activity */}
      <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--grey-900)' }}>Recent Activity</h2>
      <div style={{ ...card }}>
        {[
          { time: '2 min ago', text: 'Risk Detection Agent flagged 28h inactivity for Sam Okonkwo', who: 'AI' },
          { time: '10 min ago', text: 'Deadline risk recalculated — REST API task at risk', who: 'AI' },
          { time: '1 hr ago',  text: 'Priya Sharma pushed model training checkpoint', who: 'PS' },
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
