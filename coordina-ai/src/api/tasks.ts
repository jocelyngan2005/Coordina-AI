import { mockStore } from './mockStore';
import type { BackendTask } from './types';

export const tasksApi = {
  listByProject: (projectId: string) =>
    mockStore.tasks.listByProject(projectId) as Promise<BackendTask[]>,
  get: (taskId: string) => mockStore.tasks.get(taskId) as Promise<BackendTask>,
  update: (
    taskId: string,
    data: Partial<Pick<BackendTask, 'status' | 'completion_pct' | 'assignee_id' | 'title' | 'description' | 'priority' | 'due_date'>>,
  ) => mockStore.tasks.update(taskId, data) as Promise<BackendTask>,
  delete: (taskId: string) => mockStore.tasks.delete(taskId),
};
