import { api, BASE_URL } from './client';
import type { WorkflowState, RunPipelineRequest, ProjectAnalytics } from './types';

export const workflowApi = {
  getState: (projectId: string) =>
    api.get<WorkflowState>(`/api/workflow/${projectId}/state`),

  getDecisions: (projectId: string, limit = 20) =>
    api.get<unknown[]>(`/api/workflow/${projectId}/decisions?limit=${limit}`),

  runPipeline: (projectId: string, data: RunPipelineRequest) =>
    api.post<unknown>(`/api/workflow/${projectId}/run-pipeline`, {
      document_text: data.document_text,
      document_type: data.document_type ?? 'brief',
      deadline_date: data.deadline_date,
      project_name: data.project_name,
      team_size: data.team_size,
      team_members: data.team_members,
    }),

  runRiskCheck: (projectId: string) =>
    api.post<unknown>(`/api/workflow/${projectId}/risk-check`),

  runSubmissionCheck: (projectId: string, uploadedArtefacts: string[] = []) =>
    api.post<unknown>(`/api/workflow/${projectId}/submission-check`, {
      uploaded_artefacts: uploadedArtefacts,
    }),

  /**
   * Open an SSE connection to stream pipeline stage results as they complete.
   * Returns a cleanup function that closes the connection.
   */
  streamPipeline: (
    projectId: string,
    params: RunPipelineRequest,
    onStage: (data: unknown) => void,
    onDone: () => void,
    onError: (err: Error) => void,
  ): (() => void) => {
    const url = new URL(`${BASE_URL}/api/workflow/${projectId}/stream-pipeline`);
    url.searchParams.set('document_text', params.document_text);
    url.searchParams.set('document_type', params.document_type ?? 'brief');
    url.searchParams.set('deadline_date', params.deadline_date);
    if (params.project_name) url.searchParams.set('project_name', params.project_name);
    if (params.team_size) url.searchParams.set('team_size', String(params.team_size));
    if (params.team_members) url.searchParams.set('team_members', JSON.stringify(params.team_members));

    const es = new EventSource(url.toString());

    es.onmessage = (event: MessageEvent<string>) => {
      if (event.data === '[DONE]') {
        es.close();
        onDone();
        return;
      }
      try {
        onStage(JSON.parse(event.data));
      } catch {
        // non-JSON frame — ignore
      }
    };

    es.onerror = () => {
      es.close();
      onError(new Error('SSE stream failed'));
    };

    return () => es.close();
  },
};

export const analyticsApi = {
  projectOverview: (projectId: string) =>
    api.get<ProjectAnalytics>(`/api/analytics/project/${projectId}/overview`),
};
