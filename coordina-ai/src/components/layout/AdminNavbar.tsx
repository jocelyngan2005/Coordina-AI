import { useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useRole } from '../../contexts/RoleContext';

/* ─── Icons (inline SVGs) ─── */
const icons = {
  overview: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
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
  home: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <polyline points="9 21 9 12 15 12 15 21" />
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

/* ─── Project folder icon ─── */
const projectIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
);

/* ─── NavItem — identical to Navbar.tsx ─── */
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

/* ─── SectionLabel — identical to Navbar.tsx ─── */
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

/* ─── Props ─── */
interface AdminNavbarProps {
  projects: { id: string; name: string; status: string }[];
}

export default function AdminNavbar({ projects }: AdminNavbarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { clearRole } = useRole();
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em', color: 'var(--grey-900)', whiteSpace: 'nowrap' }}>
              Coordina <span style={{ fontWeight: 300, color: 'var(--grey-500)' }}>AI</span>
            </span>
            {/* Admin label — same muted style as the rest of the sidebar text */}
            <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Admin
            </span>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px' }}>
        <SectionLabel label="Main" collapsed={collapsed} />
        <NavItem to="/admin" icon={icons.overview} label="Overview" collapsed={collapsed} end />

        <SectionLabel label="Projects" collapsed={collapsed} />

        {/* Admin project links — identical pattern to Navbar.tsx project links */}
        {projects.map((project) => {
          const isProjectActive = location.pathname.startsWith(`/admin/projects/${project.id}`);
          const isStatusActive  = project.status === 'active';
          const isCompleted     = project.status === 'completed' || project.status === 'archived';
          const isAtRisk        = project.status === 'at_risk';
          const dotColor  = isStatusActive ? '#22c55e' : isCompleted ? '#d1d5db' : isAtRisk ? '#f59e0b' : '#9ca3af';
          const dotGlow   = isStatusActive ? 'rgba(34,197,94,0.25)' : isCompleted ? 'rgba(209,213,219,0.25)' : 'rgba(245,158,11,0.25)';
          const statusLabel = isStatusActive ? 'Active' : isCompleted ? 'Inactive' : isAtRisk ? 'At Risk' : 'Pending';

          return (
            <NavLink
              key={project.id}
              to={`/admin/projects/${project.id}`}
              end
              title={collapsed ? project.name : undefined}
              style={() => ({
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
                background: isProjectActive ? 'var(--grey-900)' : 'transparent',
                color: isProjectActive ? 'var(--white)' : 'var(--grey-600)',
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
                  {/* Status dot — identical to Navbar.tsx */}
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                    background: dotColor,
                    boxShadow: `0 0 0 2px ${dotGlow}`,
                  }} title={statusLabel} />
                </div>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Bottom buttons — identical structure to Navbar.tsx */}
      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Home / Role Selection */}
        <button
          onClick={clearRole}
          title="Back to role selection"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            color: 'var(--grey-500)',
            fontSize: 12,
            fontWeight: 500,
            transition: 'all var(--t-fast)',
            border: '1px solid var(--border)',
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--grey-100)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--grey-900)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--grey-500)';
          }}
        >
          <span style={{ display: 'flex', flexShrink: 0 }}>{icons.home}</span>
          {!collapsed && <span>Home</span>}
        </button>

        {/* Collapse Toggle */}
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
