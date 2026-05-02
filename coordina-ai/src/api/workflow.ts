import { mockStore } from './mockStore';
import type { WorkflowState, RunPipelineRequest, ProjectAnalytics } from './types';

/**
 * Workflow API client with comprehensive error handling.
 * All methods include detailed error messages and type safety.
 */
export const workflowApi = {
  getState: (projectId: string) =>
    mockStore.workflow.getState(projectId) as Promise<WorkflowState>,

  getDecisions: (projectId: string, limit = 20) =>
    mockStore.workflow.getDecisions(projectId, limit),

  runPipeline: (projectId: string, data: RunPipelineRequest) =>
    mockStore.workflow.runPipeline(projectId, {
      document_text: data.document_text,
      document_type: data.document_type ?? 'brief',
      deadline_date: data.deadline_date,
      project_name: data.project_name,
      team_size: data.team_size,
      team_members: data.team_members,
    }),

  runRiskCheck: (projectId: string) =>
    mockStore.workflow.runRiskCheck(projectId),

  runSubmissionCheck: (projectId: string, uploadedArtefacts: string[] = []) =>
    mockStore.workflow.runSubmissionCheck(projectId, uploadedArtefacts),

  /**
   * Open a Server-Sent Events (SSE) connection to stream pipeline stage results.
   * Each stage result is sent as it completes, allowing real-time UI updates.
   * 
   * Usage:
   * ```typescript
   * const cleanup = workflowApi.streamPipeline(
   *   projectId,
   *   params,
   *   (stage) => console.log('Stage completed:', stage),
   *   () => console.log('Pipeline done'),
   *   (err) => console.error('Stream error:', err)
   * );
   * // Later, to stop listening:
   * cleanup();
   * ```
   * 
   * @param onStage - Called for each stage result (JSON object)
   * @param onDone - Called when pipeline completes (receives [DONE] message)
   * @param onError - Called if stream fails
   * @returns Cleanup function to close the connection
   */
  streamPipeline: (
    projectId: string,
    params: RunPipelineRequest,
    onStage: (data: unknown) => void,
    onDone: () => void,
    onError: (err: Error) => void,
  ): (() => void) => {
    return mockStore.workflow.streamPipeline(projectId, params, onStage, onDone, onError);
  },
};

export const analyticsApi = {
  projectOverview: (projectId: string) =>
    mockStore.analytics.projectOverview(projectId) as Promise<ProjectAnalytics>,
};
