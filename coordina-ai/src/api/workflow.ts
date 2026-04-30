import { api, BASE_URL } from './client';
import type { WorkflowState, RunPipelineRequest, ProjectAnalytics } from './types';

/**
 * Workflow API client with comprehensive error handling.
 * All methods include detailed error messages and type safety.
 */
export const workflowApi = {
  /**
   * Fetch the complete project state from workflow orchestrator.
   * Includes all AI agent outputs (goals, tasks, assignments, risks, readiness).
   * 
   * @throws Error if project not found or state retrieval fails
   */
  getState: async (projectId: string): Promise<WorkflowState> => {
    try {
      return await api.get<WorkflowState>(`/api/workflow/${projectId}/state`);
    } catch (err) {
      throw new Error(`Failed to fetch workflow state: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  },

  /**
   * Get decision log with reasoning from all GLM agents.
   * Useful for audit trails and understanding why decisions were made.
   * 
   * @param projectId - Project ID
   * @param limit - Maximum number of decisions to fetch (default: 20)
   * @returns Array of decision records with timestamps and reasoning
   */
  getDecisions: async (projectId: string, limit = 20): Promise<unknown[]> => {
    try {
      return await api.get<unknown[]>(`/api/workflow/${projectId}/decisions?limit=${limit}`);
    } catch (err) {
      throw new Error(`Failed to fetch decisions: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  },

  /**
   * Run the complete AI pipeline (all 6 stages).
   * Blocking call - waits for all stages to complete before returning.
   * 
   * For real-time progress, use streamPipeline() instead.
   * 
   * @throws Error if any pipeline stage fails
   */
  runPipeline: async (projectId: string, data: RunPipelineRequest): Promise<WorkflowState> => {
    try {
      return await api.post<WorkflowState>(`/api/workflow/${projectId}/run-pipeline`, {
        document_text: data.document_text,
        document_type: data.document_type ?? 'brief',
        deadline_date: data.deadline_date,
        project_name: data.project_name,
        team_size: data.team_size,
        team_members: data.team_members,
      });
    } catch (err) {
      throw new Error(`Pipeline execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  },

  /**
   * Run risk check on current project state.
   * Detects deadline risks, inactivity, missing artifacts, ambiguities.
   * 
   * @throws Error if risk check fails
   */
  runRiskCheck: async (projectId: string): Promise<unknown> => {
    try {
      return await api.post<unknown>(`/api/workflow/${projectId}/risk-check`, {});
    } catch (err) {
      throw new Error(`Risk check failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  },

  /**
   * Run submission readiness check.
   * Validates rubric coverage and generates submission readiness score.
   * 
   * @throws Error if submission check fails
   */
  runSubmissionCheck: async (projectId: string, uploadedArtefacts: string[] = []): Promise<unknown> => {
    try {
      return await api.post<unknown>(`/api/workflow/${projectId}/submission-check`, {
        uploaded_artefacts: uploadedArtefacts,
      });
    } catch (err) {
      throw new Error(`Submission check failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  },

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
  /**
   * Get project overview analytics.
   * Includes task stats, health score, deadline failure probability, completion %.
   */
  projectOverview: async (projectId: string): Promise<ProjectAnalytics> => {
    try {
      return await api.get<ProjectAnalytics>(`/api/analytics/project/${projectId}/overview`);
    } catch (err) {
      throw new Error(`Failed to fetch project analytics: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  },

  /**
   * Get contribution breakdown by team member.
   */
  contributions: async (projectId: string): Promise<unknown> => {
    try {
      return await api.get<unknown>(`/api/analytics/project/${projectId}/contributions`);
    } catch (err) {
      throw new Error(`Failed to fetch contributions: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  },
};

