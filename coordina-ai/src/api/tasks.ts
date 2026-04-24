import { api } from './client';
import type { BackendTask } from './types';

export const tasksApi = {
  listByProject: (projectId: string) =>
    api.get<BackendTask[]>(`/api/tasks/project/${projectId}`),
  get: (taskId: string) => api.get<BackendTask>(`/api/tasks/${taskId}`),
  update: (
    taskId: string,
    data: Partial<Pick<BackendTask, 'status' | 'completion_pct' | 'assignee_id' | 'title' | 'description' | 'priority' | 'due_date'>>,
  ) => api.patch<BackendTask>(`/api/tasks/${taskId}`, data),
  delete: (taskId: string) => api.delete(`/api/tasks/${taskId}`),
};
