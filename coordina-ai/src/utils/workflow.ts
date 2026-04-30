/**
 * Workflow state validation and transformation utilities.
 * Ensures backend responses are usable before passing to UI components.
 */

export type WorkflowValidationResult = 
  | { valid: true; issues: never[] }
  | { valid: false; issues: string[] };

/**
 * Validate that a workflow state has the expected structure and required fields.
 * Returns detailed info about any validation issues found.
 */
export function validateWorkflowState(state: unknown): WorkflowValidationResult {
  const issues: string[] = [];

  if (!state || typeof state !== 'object') {
    issues.push('Workflow state is not an object');
    return { valid: false, issues };
  }

  const s = state as Record<string, unknown>;

  // Check for required fields
  if (!s.project_id || typeof s.project_id !== 'string') {
    issues.push('Missing or invalid project_id');
  }

  if (!s.workflow_stage || typeof s.workflow_stage !== 'string') {
    issues.push('Missing or invalid workflow_stage');
  }

  // Check AI outputs exist
  if (!Array.isArray(s.structured_goals)) {
    issues.push('structured_goals is not an array');
  }

  if (!Array.isArray(s.tasks)) {
    issues.push('tasks array is missing or invalid');
  }

  if (!Array.isArray(s.role_assignments)) {
    issues.push('role_assignments array is missing or invalid');
  }

  // Check reports exist (may be empty but should be objects)
  if (s.last_risk_report && typeof s.last_risk_report !== 'object') {
    issues.push('last_risk_report is not an object');
  }

  if (s.submission_report && typeof s.submission_report !== 'object') {
    issues.push('submission_report is not an object');
  }

  return issues.length > 0 
    ? { valid: false, issues }
    : { valid: true, issues: [] };
}

/**
 * Check if workflow state has substantive AI outputs (goals, tasks, assignments).
 * Returns true if the pipeline has actually run and produced results.
 */
export function hasSubstantiveResults(state: Record<string, unknown>): boolean {
  const goalsCount = Array.isArray(state.structured_goals) ? state.structured_goals.length : 0;
  const tasksCount = Array.isArray(state.tasks) ? state.tasks.length : 0;
  const assignmentsCount = Array.isArray(state.role_assignments) ? state.role_assignments.length : 0;

  // Pipeline has run if we have at least some results from agents
  return goalsCount > 0 || tasksCount > 0 || assignmentsCount > 0;
}

/**
 * Get a human-readable summary of what AI work has been done.
 */
export function getCompletionSummary(state: Record<string, unknown>): string {
  const stage = String(state.workflow_stage ?? 'unknown');
  const hasGoals = Array.isArray(state.structured_goals) && state.structured_goals.length > 0;
  const hasTasks = Array.isArray(state.tasks) && state.tasks.length > 0;
  const hasAssignments = Array.isArray(state.role_assignments) && state.role_assignments.length > 0;
  const hasRisks = state.last_risk_report && typeof state.last_risk_report === 'object';
  const hasSubmission = state.submission_report && typeof state.submission_report === 'object';

  const parts: string[] = [];
  
  if (hasGoals) parts.push('goals analyzed');
  if (hasTasks) parts.push('tasks planned');
  if (hasAssignments) parts.push('team coordinated');
  if (hasRisks) parts.push('risks assessed');
  if (hasSubmission) parts.push('submission readiness checked');

  if (parts.length === 0) return 'Workflow initialized, no results yet';
  return `Completed: ${parts.join(', ')}`;
}

/**
 * Extract a readable error message from validation issues.
 */
export function formatValidationIssues(issues: string[]): string {
  if (issues.length === 0) return 'Unknown validation error';
  if (issues.length === 1) return issues[0];
  return `Multiple issues: ${issues.join('; ')}`;
}
