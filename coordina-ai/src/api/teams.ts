import { mockStore } from './mockStore';
import type { BackendMember, MemberCreate } from './types';

export const teamsApi = {
  listByProject: (projectId: string) =>
    mockStore.members.listByProject(projectId) as Promise<BackendMember[]>,
  get: (memberId: string) =>
    mockStore.members.get(memberId) as Promise<BackendMember>,
  addMember: (data: MemberCreate) =>
    mockStore.members.add(data) as Promise<BackendMember>,
  update: (memberId: string, data: { name?: string; email?: string; skills?: string[]; contribution_score?: number }) =>
    mockStore.members.update(memberId, data) as Promise<BackendMember>,
  remove: (memberId: string) => mockStore.members.remove(memberId),
};
