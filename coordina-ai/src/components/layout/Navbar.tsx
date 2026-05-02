import { useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useProjects } from '../../contexts/ProjectsContext';
import type { BackendProject } from '../../api/types';

/* ─── Icons (inline SVGs) ─── */
const icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  newProject: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  workspace: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  agents: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="9" height="9" rx="1" /><rect x="13" y="2" width="9" height="9" rx="1" />
      <rect x="2" y="13" width="9" height="9" rx="1" /><path d="M17 17h4m-2-2v4" />
    </svg>
  ),
  risk: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  submission: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" /><polyline points="9 15 11 17 15 13" />
    </svg>
  ),
  collapse: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  expand: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  logo: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  ),
};

interface NavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
  collapsed: boolean;
  end?: boolean;
}

function NavItem({ to, icon, label, collapsed, end }: NavItemProps) {
  const activeStyle: React.CSSProperties = {
    background: 'var(--grey-900)',
    color: 'var(--white)',
  };
  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: collapsed ? '9px 0' : '9px 12px',
    justifyContent: collapsed ? 'center' : 'flex-start',
    borderRadius: 'var(--radius-md)',
    color: 'var(--grey-600)',
    transition: 'all var(--t-fast)',
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    width: '100%',
    cursor: 'pointer',
    position: 'relative',
  };

  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      style={({ isActive }) => ({ ...baseStyle, ...(isActive ? activeStyle : {}) })}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        if (!el.getAttribute('aria-current')) {
          el.style.background = 'var(--grey-100)';
          el.style.color = 'var(--grey-900)';
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        if (!el.getAttribute('aria-current')) {
          el.style.background = '';
          el.style.color = 'var(--grey-600)';
        }
      }}
    >
      <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>
      {!collapsed && <span style={{ transition: 'opacity var(--t-base)', opacity: collapsed ? 0 : 1 }}>{label}</span>}
    </NavLink>
  );
}

interface SectionLabelProps { label: string; collapsed: boolean; }
function SectionLabel({ label, collapsed }: SectionLabelProps) {
  if (collapsed) return <div style={{ height: 1, background: 'var(--border)', margin: '8px 8px' }} />;
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--text-3)',
      padding: '8px 12px 4px',
    }}>
      {label}
    </div>
  );
}

// Project icon
const projectIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
);

export default function Navbar() {
  const [collapsed, setCollapsed] = useState(false);
  const { projects, loadingProjects } = useProjects();
  const location = useLocation();

  const sidebarStyle: React.CSSProperties = {
    width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-w)',
    flexShrink: 0,
    height: '100%',
    background: 'transparent',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width var(--t-base)',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 10,
  };

  return (
    <nav style={sidebarStyle}>
      {/* Logo */}
      <div style={{
        height: 'var(--topbar-h)',
        display: 'flex',
        alignItems: 'center',
        padding: collapsed ? '0' : '0 16px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{ color: 'var(--grey-900)', display: 'flex' }}>{icons.logo}</span>
        {!collapsed && (
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em', color: 'var(--grey-900)', whiteSpace: 'nowrap' }}>
            Coordina <span style={{ fontWeight: 300, color: 'var(--grey-500)' }}>AI</span>
          </span>
        )}
      </div>

      {/* Nav Items */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px' }}>
        <SectionLabel label="Main" collapsed={collapsed} />
        <NavItem to="/" icon={icons.dashboard} label="Dashboard" collapsed={collapsed} end />

        <SectionLabel label="Projects" collapsed={collapsed} />

        {/* Project links */}
        {!loadingProjects && projects.map((project) => {
          const isProjectActive = location.pathname.startsWith(`/projects/${project.id}`);
          return (
            <NavLink
              key={project.id}
              to={`/projects/${project.id}`}
              end
              title={collapsed ? project.name : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? '9px 0' : '9px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                border: 'none',
                width: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                background: isActive || isProjectActive ? 'var(--grey-900)' : 'transparent',
                color: isActive || isProjectActive ? 'var(--white)' : 'var(--grey-600)',
                textDecoration: 'none',
                transition: 'all var(--t-fast)',
              })}
              onMouseEnter={e => {
                if (!isProjectActive) {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'var(--grey-100)';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--grey-900)';
                }
              }}
              onMouseLeave={e => {
                if (!isProjectActive) {
                  (e.currentTarget as HTMLAnchorElement).style.background = '';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--grey-600)';
                }
              }}
            >
              <span style={{ flexShrink: 0, display: 'flex' }}>{projectIcon}</span>
              {!collapsed && (
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {project.name}
                  </span>
                  {/* Status dot */}
                  {(() => {
                    const isActive = project.status === 'active';
                    const isCompleted = project.status === 'completed' || project.status === 'archived';
                    const isAtRisk = project.status === 'at_risk';
                    const dotColor = isActive ? '#22c55e' : isCompleted ? '#d1d5db' : isAtRisk ? '#f59e0b' : '#9ca3af';
                    const dotGlow = isActive ? 'rgba(34,197,94,0.25)' : isCompleted ? 'rgba(209,213,219,0.25)' : 'rgba(245,158,11,0.25)';
                    const statusLabel = isActive ? 'Active' : isCompleted ? 'Inactive' : isAtRisk ? 'At Risk' : 'Pending';
                    return (
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                        background: dotColor,
                        boxShadow: `0 0 0 2px ${dotGlow}`,
                      }} title={statusLabel} />
                    );
                  })()}
                </div>
              )}
            </NavLink>
          );
        })}

        <NavLink
          to="/projects/new"
          state={{ backgroundLocation: location }}
          end
          title={collapsed ? 'New Project' : undefined}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: collapsed ? '9px 0' : '9px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 'var(--radius-md)',
            color: isActive ? 'var(--grey-700)' : 'var(--grey-500)',
            background: isActive ? 'var(--grey-100)' : 'transparent',
            transition: 'all var(--t-fast)',
            fontSize: 13,
            fontWeight: 500,
            width: '100%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textDecoration: 'none',
          })}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLAnchorElement;
            if (!el.getAttribute('aria-current')) {
              el.style.background = 'var(--grey-100)';
              el.style.color = 'var(--grey-700)';
            }
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLAnchorElement;
            if (!el.getAttribute('aria-current')) {
              el.style.background = '';
              el.style.color = 'var(--grey-500)';
            }
          }}
        >
          <span style={{ flexShrink: 0, display: 'flex' }}>{icons.newProject}</span>
          {!collapsed && <span>New Project</span>}
        </NavLink>
      </div>

      {/* Collapse Toggle */}
      <div style={{ padding: '8px' }}>
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-end',
            gap: 6,
            padding: '8px',
            borderRadius: 'var(--radius-md)',
            color: 'var(--grey-500)',
            fontSize: 12,
            transition: 'all var(--t-fast)',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--grey-100)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ''; }}
        >
          {!collapsed && <span>Collapse</span>}
          {collapsed ? icons.expand : icons.collapse}
        </button>
      </div>
    </nav>
  );
}
