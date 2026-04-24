import { api } from './client';
import type { BackendMember, MemberCreate } from './types';

export const teamsApi = {
  listByProject: (projectId: string) =>
    api.get<BackendMember[]>(`/api/teams/project/${projectId}`),
  get: (memberId: string) => api.get<BackendMember>(`/api/teams/${memberId}`),
  addMember: (data: MemberCreate) =>
    api.post<BackendMember>('/api/teams', data),
  update: (memberId: string, data: { name?: string; email?: string; skills?: string[]; contribution_score?: number }) =>
    api.patch<BackendMember>(`/api/teams/${memberId}`, data),
  remove: (memberId: string) => api.delete(`/api/teams/${memberId}`),
};
