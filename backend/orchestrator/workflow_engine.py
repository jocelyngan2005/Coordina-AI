"""
orchestrator/workflow_engine.py

The central multi-step workflow orchestrator.
Coordinates all agents in sequence, manages state transitions,
and handles replanning when conditions change.

Workflow Stages:
  1. INGEST       — parse uploaded documents
  2. ANALYSE      — InstructionAnalysisAgent extracts goals
  3. PLAN         — PlanningAgent decomposes into tasks
  4. COORDINATE   — CoordinationAgent assigns roles
  5. MONITOR      — RiskDetectionAgent runs continuously
  6. VALIDATE     — SubmissionReadinessAgent checks completion
"""

from typing import Any, AsyncGenerator
from datetime import datetime, timezone

from agents import (
    InstructionAnalysisAgent,
    PlanningAgent,
    CoordinationAgent,
    RiskDetectionAgent,
    SubmissionReadinessAgent,
)
from orchestrator.state_manager import StateManager
from orchestrator.event_bus import EventBus, WorkflowEvent
from memory.decision_log import DecisionLogger
from core.logger import logger
from core.exceptions import WorkflowExecutionError


class WorkflowEngine:
    """
    Orchestrates the full project workflow lifecycle.
    Each method corresponds to a workflow stage.
    """

    def __init__(self):
        self.state_manager = StateManager()
        self.event_bus = EventBus()
        self.decision_logger = DecisionLogger()

        # Agent registry
        self._agents = {
            "instruction_analysis": InstructionAnalysisAgent(),
            "planning": PlanningAgent(),
            "coordination": CoordinationAgent(),
            "risk_detection": RiskDetectionAgent(),
            "submission_readiness": SubmissionReadinessAgent(),
        }

    # ------------------------------------------------------------------ #
    #  Stage 1+2: Ingest & Analyse                                         #
    # ------------------------------------------------------------------ #
    async def run_analysis(self, project_id: str, document_text: str, document_type: str) -> dict:
        """Parse a brief/rubric and store structured goals in project state."""
        state = await self.state_manager.get(project_id)

        context = {
            "project_id": project_id,
            "document_text": document_text,
            "document_type": document_type,
        }

        output = await self._agents["instruction_analysis"].execute(context)
        self._raise_on_agent_error(output, "instruction_analysis")

        # Persist goals into project state
        state["structured_goals"] = output["result"].get("structured_goals", [])
        state["rubric_criteria"] = output["result"].get("grading_priorities", [])
        state["ambiguities"] = output["result"].get("ambiguities", [])
        state["workflow_stage"] = "analysed"
        await self.state_manager.save(project_id, state)

        await self.decision_logger.log(
            project_id=project_id,
            agent="instruction_analysis",
            decision_summary="Extracted structured goals from project brief.",
            output=output["result"],
        )

        await self.event_bus.publish(WorkflowEvent(
            project_id=project_id,
            event_type="analysis_complete",
            payload=output["result"],
        ))

        return output

    # ------------------------------------------------------------------ #
    #  Stage 3: Plan                                                       #
    # ------------------------------------------------------------------ #
    async def run_planning(self, project_id: str, deadline_date: str) -> dict:
        """Generate tasks, milestones, and dependency graph."""
        state = await self.state_manager.get(project_id)

        if not state.get("structured_goals"):
            raise WorkflowExecutionError("Cannot plan: no structured goals found. Run analysis first.")

        context = {
            "project_id": project_id,
            "structured_goals": state["structured_goals"],
            "team_size": len(state.get("members", [])) or 1,
            "deadline_date": deadline_date,
            "project_start_date": datetime.now(timezone.utc).date().isoformat(),
            "existing_tasks": state.get("tasks", []),
        }

        output = await self._agents["planning"].execute(context)
        self._raise_on_agent_error(output, "planning")

        state["tasks"] = output["result"].get("tasks", [])
        state["milestones"] = output["result"].get("milestones", [])
        state["critical_path"] = output["result"].get("critical_path", [])
        state["workflow_stage"] = "planned"
        await self.state_manager.save(project_id, state)

        await self.decision_logger.log(
            project_id=project_id,
            agent="planning",
            decision_summary=f"Generated {len(state['tasks'])} tasks across {len(state['milestones'])} milestones.",
            output=output["result"],
        )

        await self.event_bus.publish(WorkflowEvent(
            project_id=project_id,
            event_type="planning_complete",
            payload=output["result"],
        ))

        return output

    # ------------------------------------------------------------------ #
    #  Stage 4: Coordinate                                                 #
    # ------------------------------------------------------------------ #
    async def run_coordination(self, project_id: str) -> dict:
        """Assign roles, balance workload, generate meeting agenda."""
        state = await self.state_manager.get(project_id)

        context = {
            "project_id": project_id,
            "members": state.get("members", []),
            "tasks": state.get("tasks", []),
            "activity_history": state.get("activity_history", []),
            "project_phase": state.get("workflow_stage", "execution"),
        }

        output = await self._agents["coordination"].execute(context)
        self._raise_on_agent_error(output, "coordination")

        state["role_assignments"] = output["result"].get("role_assignments", [])
        state["meeting_agenda"] = output["result"].get("meeting_agenda", [])
        state["workflow_stage"] = "coordinated"
        await self.state_manager.save(project_id, state)

        await self.event_bus.publish(WorkflowEvent(
            project_id=project_id,
            event_type="coordination_complete",
            payload=output["result"],
        ))

        return output

    # ------------------------------------------------------------------ #
    #  Stage 5: Monitor (runs on-demand or on schedule)                   #
    # ------------------------------------------------------------------ #
    async def run_risk_check(self, project_id: str) -> dict:
        """Detect risks, inactivity, and deadline threats. Trigger recovery if needed."""
        state = await self.state_manager.get(project_id)

        context = {
            "project_id": project_id,
            "tasks": state.get("tasks", []),
            "members": state.get("members", []),
            "deadline_date": state.get("deadline_date", ""),
            "current_date": datetime.now(timezone.utc).date().isoformat(),
            "decision_history": state.get("decision_history", []),
        }

        output = await self._agents["risk_detection"].execute(context)
        self._raise_on_agent_error(output, "risk_detection")

        state["last_risk_report"] = output["result"]
        await self.state_manager.save(project_id, state)

        # If auto recovery triggered, replan
        if output["result"].get("auto_recovery_triggered"):
            logger.warning(f"[WorkflowEngine] Auto-recovery triggered for project {project_id}")
            await self.event_bus.publish(WorkflowEvent(
                project_id=project_id,
                event_type="recovery_triggered",
                payload=output["result"],
            ))

        return output

    # ------------------------------------------------------------------ #
    #  Stage 6: Validate                                                   #
    # ------------------------------------------------------------------ #
    async def run_submission_check(self, project_id: str, uploaded_artefacts: list[str]) -> dict:
        """Validate rubric coverage and generate submission readiness score."""
        state = await self.state_manager.get(project_id)

        completed = [t["title"] for t in state.get("tasks", []) if t.get("status") == "done"]

        context = {
            "project_id": project_id,
            "rubric_criteria": state.get("rubric_criteria", []),
            "completed_deliverables": completed,
            "uploaded_artefacts": uploaded_artefacts,
        }

        output = await self._agents["submission_readiness"].execute(context)
        self._raise_on_agent_error(output, "submission_readiness")

        state["submission_report"] = output["result"]
        state["workflow_stage"] = "validated"
        await self.state_manager.save(project_id, state)

        await self.event_bus.publish(WorkflowEvent(
            project_id=project_id,
            event_type="submission_check_complete",
            payload=output["result"],
        ))

        return output

    # ------------------------------------------------------------------ #
    #  Full Pipeline (convenience method)                                  #
    # ------------------------------------------------------------------ #
    async def run_full_pipeline(
        self,
        project_id: str,
        document_text: str,
        document_type: str,
        deadline_date: str,
    ) -> dict[str, Any]:
        """
        Run stages 1-4 in sequence.
        Returns a combined summary of all stage outputs.
        """
        logger.info(f"[WorkflowEngine] Starting full pipeline for project {project_id}")

        analysis = await self.run_analysis(project_id, document_text, document_type)
        plan = await self.run_planning(project_id, deadline_date)
        coordination = await self.run_coordination(project_id)
        risk = await self.run_risk_check(project_id)

        return {
            "project_id": project_id,
            "pipeline_status": "complete",
            "stages": {
                "analysis": analysis,
                "planning": plan,
                "coordination": coordination,
                "risk": risk,
            },
        }

    # ------------------------------------------------------------------ #
    #  Streaming pipeline for WebSocket delivery                           #
    # ------------------------------------------------------------------ #
    async def stream_pipeline(
        self,
        project_id: str,
        document_text: str,
        document_type: str,
        deadline_date: str,
    ) -> AsyncGenerator[dict, None]:
        """Yield stage results as they complete for real-time frontend updates."""
        stages = [
            ("analysis",    lambda: self.run_analysis(project_id, document_text, document_type)),
            ("planning",    lambda: self.run_planning(project_id, deadline_date)),
            ("coordination",lambda: self.run_coordination(project_id)),
            ("risk",        lambda: self.run_risk_check(project_id)),
        ]
        for stage_name, stage_fn in stages:
            result = await stage_fn()
            yield {"stage": stage_name, "data": result}

    # ------------------------------------------------------------------ #
    #  Helpers                                                             #
    # ------------------------------------------------------------------ #
    @staticmethod
    def _raise_on_agent_error(output: dict, agent_name: str):
        if output.get("status") == "error":
            raise WorkflowExecutionError(
                f"Agent '{agent_name}' failed: {output.get('error', 'unknown error')}"
            )


workflow_engine = WorkflowEngine()