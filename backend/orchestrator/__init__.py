"""
orchestrator package — workflow execution and state management.
"""

from orchestrator.workflow_engine import WorkflowEngine

workflow_engine = WorkflowEngine()

__all__ = ["WorkflowEngine", "workflow_engine"]
