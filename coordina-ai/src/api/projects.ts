import { api } from './client';
import type { BackendProject, ProjectCreate } from './types';

export const projectsApi = {
  list: () => api.get<BackendProject[]>('/api/projects'),
  get: (id: string) => api.get<BackendProject>(`/api/projects/${id}`),
  create: (data: ProjectCreate) => api.post<BackendProject>('/api/projects', data),
  update: (id: string, data: Partial<ProjectCreate>) =>
    api.patch<BackendProject>(`/api/projects/${id}`, data),
  delete: (id: string) => api.delete(`/api/projects/${id}`),
};
