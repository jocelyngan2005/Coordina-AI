import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import DashboardPage from './pages/DashboardPage';
import NewProjectPage from './pages/NewProjectPage';
import ProjectWorkspacePage from './pages/ProjectWorkspacePage';
import AgentPipelinePage from './pages/AgentPipelinePage';
import RiskPage from './pages/RiskPage';
import SubmissionPage from './pages/SubmissionPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"                              element={<DashboardPage />} />
        <Route path="/projects/new"                  element={<NewProjectPage />} />
        <Route path="/projects/:id"                  element={<ProjectWorkspacePage />} />
        <Route path="/projects/:id/agents"           element={<AgentPipelinePage />} />
        <Route path="/projects/:id/risks"            element={<RiskPage />} />
        <Route path="/projects/:id/submission"       element={<SubmissionPage />} />
      </Routes>
    </BrowserRouter>
  );
}
