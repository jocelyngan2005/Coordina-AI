import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { projectsApi } from '../api/projects';
import type { BackendProject } from '../api/types';

interface ProjectsContextType {
  projects: BackendProject[];
  loadingProjects: boolean;
  refreshProjects: () => Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const loadProjects = async () => {
    try {
      const data = await projectsApi.list();
      setProjects(data);
    } catch {
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const refreshProjects = async () => {
    setLoadingProjects(true);
    await loadProjects();
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  return (
    <ProjectsContext.Provider value={{ projects, loadingProjects, refreshProjects }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error('useProjects must be used within ProjectsProvider');
  }
  return context;
}
