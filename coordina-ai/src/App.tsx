import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import DashboardPage from './pages/DashboardPage';
import NewProjectPage from './pages/NewProjectPage';
import ProjectWorkspacePage from './pages/ProjectWorkspacePage';
import RiskPage from './pages/RiskPage';
import './App.css';

function AppRoutes() {
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;

  return (
    <>
      <Navbar />
      <Routes location={backgroundLocation || location}>
        <Route path="/"                   element={<DashboardPage />} />
        <Route path="/projects/new"       element={<NewProjectPage />} />
        <Route path="/projects/:id"       element={<ProjectWorkspacePage />} />
        <Route path="/projects/:id/risks" element={<RiskPage />} />
      </Routes>

      {backgroundLocation && (
        <Routes>
          <Route path="/projects/new" element={<NewProjectPage />} />
        </Routes>
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
