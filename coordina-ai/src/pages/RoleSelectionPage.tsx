import { useState } from 'react';
import { useRole } from '../contexts/RoleContext';

/* ─── Icons ─── */
const AdminIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const TeamIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
    <path d="M7 8h4M7 11h2" />
    <rect x="13" y="7" width="5" height="5" rx="1" />
  </svg>
);

const LogoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

interface RoleCard {
  role: 'admin' | 'team';
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
}

const CARDS: RoleCard[] = [
  {
    role: 'admin',
    title: 'Admin',
    subtitle: 'Lecturer / Manager',
    description: 'Monitor and oversee all project teams across your class or cohort.',
    icon: <AdminIcon />,
    features: ['All teams overview', 'Risk monitoring', 'Contribution analytics', 'AI decision logs'],
  },
  {
    role: 'team',
    title: 'Project Team',
    subtitle: 'Student / Team Member',
    description: 'Manage your team\'s workflow, tasks, and submission readiness.',
    icon: <TeamIcon />,
    features: ['Task management', 'Dynamic timeline', 'AI agent orchestration', 'Submission checklist'],
  },
];

export default function RoleSelectionPage() {
  const { setRole } = useRole();
  const [hovered, setHovered] = useState<'admin' | 'team' | null>(null);
  const [selecting, setSelecting] = useState<'admin' | 'team' | null>(null);

  const handleSelect = (role: 'admin' | 'team') => {
    setSelecting(role);
    setTimeout(() => setRole(role), 280);
  };

  return (
    /* Outer page — same #f3f2f0 bg as the rest of the app */
    <div style={{
      position: 'fixed', inset: 0,
      background: '#f3f2f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-sans)',
      padding: 24,
    }}>
      {/* Centre card — mirrors the .app-shell style */}
      <div style={{
        background: 'var(--white)',
        borderRadius: 20,
        boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
        padding: '48px 52px',
        width: '100%',
        maxWidth: 700,
        animation: 'fadeUp 0.28s ease both',
      }}>
        {/* Logo + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
          <span style={{ color: 'var(--grey-900)', display: 'flex' }}>
            <LogoIcon />
          </span>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', color: 'var(--grey-900)' }}>
            Coordina <span style={{ fontWeight: 300, color: 'var(--grey-500)' }}>AI</span>
          </span>
        </div>

        {/* Heading */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--grey-900)', marginBottom: 6, letterSpacing: '-0.02em' }}>
            Select your workspace
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 400 }}>
            Choose a role to enter the right view. You can switch anytime from the sidebar.
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 24 }} />

        {/* Role cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {CARDS.map((card) => {
            const isHovered = hovered === card.role;
            const isSelecting = selecting === card.role;

            return (
              <button
                key={card.role}
                id={`role-select-${card.role}`}
                onClick={() => handleSelect(card.role)}
                onMouseEnter={() => setHovered(card.role)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: isHovered ? 'var(--grey-50)' : 'var(--white)',
                  border: `1px solid ${isHovered ? 'var(--grey-400)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '22px 22px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all var(--t-fast)',
                  transform: isSelecting ? 'scale(0.98)' : 'none',
                  opacity: selecting && selecting !== card.role ? 0.45 : 1,
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                }}
              >
                {/* Icon box */}
                <div style={{
                  width: 48, height: 48,
                  background: isHovered ? 'var(--grey-900)' : 'var(--grey-100)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                  color: isHovered ? 'var(--white)' : 'var(--grey-700)',
                  transition: 'all var(--t-fast)',
                }}>
                  {card.icon}
                </div>

                {/* Title + subtitle */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--grey-900)', marginBottom: 2 }}>
                    {card.title}
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 600, color: 'var(--text-3)',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    {card.subtitle}
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 16, fontWeight: 400 }}>
                  {card.description}
                </p>

                {/* Feature list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                  {card.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{
                        width: 4, height: 4, borderRadius: '50%',
                        background: isHovered ? 'var(--grey-900)' : 'var(--grey-300)',
                        flexShrink: 0, transition: 'background var(--t-fast)',
                      }} />
                      <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA row */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: 14, borderTop: '1px solid var(--border)',
                }}>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: isHovered ? 'var(--grey-900)' : 'var(--grey-400)',
                    transition: 'color var(--t-fast)',
                  }}>
                    {isSelecting ? 'Entering...' : 'Enter workspace'}
                  </span>
                  <span style={{
                    color: isHovered ? 'var(--grey-900)' : 'var(--grey-300)',
                    transition: 'color var(--t-fast)',
                    display: 'flex',
                  }}>
                    <ArrowIcon />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer note */}
        <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 24, textAlign: 'center', fontWeight: 400 }}>
          Autonomous AI Teammate &amp; Workflow Orchestrator — UMHack 2026
        </p>
      </div>
    </div>
  );
}
