import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ProjectsProvider } from './contexts/ProjectsContext';
import { RoleProvider, useRole } from './contexts/RoleContext';
import Navbar from './components/layout/Navbar';
import AdminNavbar from './components/layout/AdminNavbar';
import DashboardPage from './pages/DashboardPage';
import NewProjectPage from './pages/NewProjectPage';
import ProjectWorkspacePage from './pages/ProjectWorkspacePage';
import RoleSelectionPage from './pages/RoleSelectionPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminProjectDetailPage from './pages/admin/AdminProjectDetailPage';
import { useProjects } from './contexts/ProjectsContext';
import './App.css';

/* ─── Team (student) shell ─── */
function TeamShell() {
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;

  return (
    <>
      <Navbar />
      <div className="app-shell" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Routes location={backgroundLocation || location}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects/new" element={<NewProjectPage />} />
          <Route path="/projects/:id" element={<ProjectWorkspacePage />} />
        </Routes>
        {backgroundLocation && (
          <Routes>
            <Route path="/projects/new" element={<NewProjectPage />} />
          </Routes>
        )}
      </div>
    </>
  );
}

/* ─── Admin shell ─── */
function AdminShell() {
  const { projects } = useProjects();
  const navProjects = projects.map(p => ({ id: p.id, name: p.name, status: p.status }));

  return (
    <>
      <AdminNavbar projects={navProjects} />
      <div className="app-shell" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Routes>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/projects/:id" element={<AdminProjectDetailPage />} />
          {/* Redirect unknown admin routes to overview */}
          <Route path="*" element={<AdminDashboardPage />} />
        </Routes>
      </div>
    </>
  );
}

/* ─── Root router — decides which shell to show ─── */
function AppRoutes() {
  const { role } = useRole();

  if (role === null) return <RoleSelectionPage />;
  if (role === 'admin') return <AdminShell />;
  return <TeamShell />;
}

export default function App() {
  return (
    <BrowserRouter>
      <RoleProvider>
        <ProjectsProvider>
          <AppRoutes />
        </ProjectsProvider>
      </RoleProvider>
    </BrowserRouter>
  );
}
