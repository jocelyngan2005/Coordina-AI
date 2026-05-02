import { mockStore } from './mockStore';
import type { BackendProject, ProjectCreate } from './types';

export const projectsApi = {
  list: () => mockStore.projects.list() as Promise<BackendProject[]>,
  get: (id: string) => mockStore.projects.get(id) as Promise<BackendProject>,
  create: (data: ProjectCreate) =>
    mockStore.projects.create(data) as Promise<BackendProject>,
  update: (id: string, data: Partial<ProjectCreate>) =>
    mockStore.projects.update(id, data) as Promise<BackendProject>,
  delete: (id: string) => mockStore.projects.delete(id),
};
