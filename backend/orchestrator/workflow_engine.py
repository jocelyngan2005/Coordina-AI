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
from edge_cases.ambiguity_resolver import ambiguity_resolver
from edge_cases.missing_data_handler import missing_data_handler
from edge_cases.inactivity_detector import inactivity_detector
from edge_cases.deadline_recovery import DeadlineRecovery
from orchestrator.state_manager import StateManager
from orchestrator.event_bus import EventBus, WorkflowEvent
from memory.decision_log import DecisionLogger
from parsers import (
    document_parser,
    transcript_parser,
    chat_logs_parser,
    rubric_parser,
)
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
        self.deadline_recovery = DeadlineRecovery()

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
        """
        Parse a brief/rubric/transcript/chat logs and store structured goals in project state.
        Supported document types: "brief", "rubric", "meeting_transcript", "chat_logs"
        Handle ambiguities.
        """
        state = await self.state_manager.get(project_id)

        # Parse document based on type
        parsed_document = self._parse_document(document_text, document_type)
        
        context = {
            "project_id": project_id,
            "document_text": parsed_document,
            "document_type": document_type,
        }

        output = await self._agents["instruction_analysis"].execute(context)
        self._raise_on_agent_error(output, "instruction_analysis")

        # Extract analysis results
        result = output["result"]
        ambiguities = result.get("ambiguities", [])
        confidence_score = result.get("confidence_score", 1.0)

        # EDGE CASE: Handle ambiguities or low confidence
        ambiguity_resolution = None
        if ambiguities or confidence_score < 0.6:
            logger.warning(
                f"[WorkflowEngine] Low confidence ({confidence_score}) or ambiguities detected. Running resolver."
            )
            ambiguity_resolution = await ambiguity_resolver.resolve(
                project_id=project_id,
                ambiguities=ambiguities,
                document_text=parsed_document,
            )
            result["ambiguity_resolution"] = ambiguity_resolution
            result["confidence_score"] = confidence_score

            await self.event_bus.publish(WorkflowEvent(
                project_id=project_id,
                event_type="ambiguities_detected",
                payload={
                    "ambiguity_count": len(ambiguities),
                    "confidence_score": confidence_score,
                    "can_proceed": ambiguity_resolution.get("can_proceed", True),
                    "clarification_questions": ambiguity_resolution.get("clarification_questions", []),
                },
            ))

        # Persist goals into project state
        if result.get("structured_goals"):
            state["structured_goals"] = state.get("structured_goals", []) + result.get("structured_goals", [])
        if result.get("grading_priorities"):
            state["rubric_criteria"] = state.get("rubric_criteria", []) + result.get("grading_priorities", [])
        
        # Merge newly extracted members with existing members
        extracted_members = result.get("team_members", [])
        if extracted_members:
            existing_members = state.get("members", [])
            current_count = len(existing_members)
            for i, m in enumerate(extracted_members):
                existing_members.append({
                    "id": f"M{current_count + i + 1}",
                    "name": m.get("name", f"Member {current_count + i + 1}"),
                    "skills": m.get("skills", []),
                    "past_behaviour": m.get("past_behaviour"),
                    "contribution_score": 0.0,
                    "availability": "full-time",
                    "experience_level": "mid",
                })
            state["members"] = existing_members
            state["team_size"] = len(existing_members)

        state["ambiguities"] = ambiguities
        state["ambiguity_resolution"] = ambiguity_resolution
        state["document_type"] = document_type
        state["workflow_stage"] = "analysed"
        await self.state_manager.save(project_id, state)

        await self.decision_logger.log(
            project_id=project_id,
            agent="instruction_analysis",
            decision_summary=f"Extracted {len(result.get('structured_goals', []))} goals from {document_type}. Confidence: {confidence_score:.1%}",
            output=result,
        )

        await self.event_bus.publish(WorkflowEvent(
            project_id=project_id,
            event_type="analysis_complete",
            payload=result,
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

        # Calculate team_size: prefer explicit value, fall back to members count
        team_size = state.get("team_size") or len(state.get("members", [])) or 1

        # Calculate days available until deadline
        from datetime import datetime
        today = datetime.now(timezone.utc).date()
        deadline = datetime.fromisoformat(deadline_date).date() if deadline_date else today
        days_available = max(1, (deadline - today).days)

        compact_goals = [
            {
                "goal_id": goal.get("goal_id"),
                "statement": goal.get("statement"),
                "priority": goal.get("priority"),
            }
            for goal in state.get("structured_goals", [])
        ]

        compact_existing_tasks = [
            {
                "task_id": task.get("task_id") or task.get("id"),
                "title": task.get("title"),
                "status": task.get("status"),
                "priority": task.get("priority"),
                "estimated_hours": task.get("estimated_hours"),
                "phase": task.get("phase"),
                "dependencies": task.get("dependencies", []),
                "assigned_to": task.get("assigned_to", []),
                "startDate": task.get("startDate"),
                "endDate": task.get("endDate"),
            }
            for task in state.get("tasks", [])
        ]

        context = {
            "project_id": project_id,
            "structured_goals": compact_goals,
            "team_size": team_size,
            "deadline_date": deadline_date,
            "project_start_date": state.get("project_start_date") or today.isoformat(),
            "existing_tasks": compact_existing_tasks,
            "days_available": days_available,
            "members": state.get("members", []),
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
        state["contribution_balance"] = output["result"].get("contribution_balance", [])
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

        risk_report = output["result"]

        # EDGE CASE: Detect inactive members and trigger redistribution
        if state.get("members"):
            inactivity_report = await inactivity_detector.scan(
                project_id=project_id,
                members=state.get("members", []),
            )
            risk_report["inactivity_report"] = inactivity_report

            if inactivity_report.get("inactive_members"):
                logger.warning(
                    f"[WorkflowEngine] {len(inactivity_report['inactive_members'])} inactive members detected"
                )
                await self.event_bus.publish(WorkflowEvent(
                    project_id=project_id,
                    event_type="inactivity_detected",
                    payload=inactivity_report,
                ))

        # EDGE CASE: Deadline recovery if failure probability exceeds threshold
        if risk_report.get("deadline_failure_probability", 0) > 0.5:
            logger.warning(
                f"[WorkflowEngine] Deadline failure probability {risk_report['deadline_failure_probability']:.0%} "
                f"exceeds threshold. Generating recovery plan."
            )
            recovery_plan = await self.deadline_recovery.generate_recovery_plan(
                project_id=project_id,
                tasks=state.get("tasks", []),
                deadline_date=state.get("deadline_date", ""),
                current_date=datetime.now(timezone.utc).date().isoformat(),
                risk_report=risk_report,
            )
            risk_report["recovery_plan"] = recovery_plan

            await self.event_bus.publish(WorkflowEvent(
                project_id=project_id,
                event_type="recovery_plan_generated",
                payload=recovery_plan,
            ))

        state["last_risk_report"] = risk_report
        await self.state_manager.save(project_id, state)

        # If auto recovery triggered, replanning is needed
        if risk_report.get("auto_recovery_triggered"):
            logger.warning(f"[WorkflowEngine] Auto-recovery triggered for project {project_id}")
            await self.event_bus.publish(WorkflowEvent(
                project_id=project_id,
                event_type="recovery_triggered",
                payload=risk_report,
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
        project_name: str = None,
        team_size: int = None,
        team_members: list[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        Run stages 1-4 in sequence.
        Returns a combined summary of all stage outputs.

        Args:
            project_id: Project identifier
            document_text: Extracted/raw document text
            document_type: "brief", "rubric", "meeting_transcript", "chat_logs"
            deadline_date: ISO date string
            project_name: Project name for context
            team_size: Number of team members (overrides calculated from team_members)
            team_members: List of {name, skills} dicts from frontend
        """
        logger.info(f"[WorkflowEngine] Starting full pipeline for project {project_id}")

        # Get or initialize project state
        state = await self.state_manager.get(project_id)

        # Transform and store team metadata in the proper format for agents
        if team_members:
            # Convert frontend team_members format to agent-expected format
            members = [
                {
                    "id": f"M{i+1}",  # Generate member IDs: M1, M2, M3, ...
                    "name": member.get("name", f"Member {i+1}"),
                    "skills": member.get("skills", []),
                    "contribution_score": 0.0,  # Initial score
                    "availability": "full-time",  # Default
                    "experience_level": "mid",  # Default (will be inferred from context later)
                }
                for i, member in enumerate(team_members)
            ]
            state["members"] = members
            state["team_size"] = len(members)
        elif team_size:
            # If only team_size is provided, store it
            state["team_size"] = team_size

        # Store other metadata
        if project_name:
            state["project_name"] = project_name
        if deadline_date:
            state["deadline_date"] = deadline_date

        await self.state_manager.save(project_id, state)

        # Run the full pipeline
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
        project_name: str = None,
        team_size: int = None,
        team_members: list[dict[str, Any]] = None,
    ) -> AsyncGenerator[dict, None]:
        """Yield stage results as they complete for real-time frontend updates."""
        # Get or initialize project state
        state = await self.state_manager.get(project_id)

        # Transform and store team metadata in the proper format for agents
        if team_members:
            # Convert frontend team_members format to agent-expected format
            members = [
                {
                    "id": f"M{i+1}",  # Generate member IDs: M1, M2, M3, ...
                    "name": member.get("name", f"Member {i+1}"),
                    "skills": member.get("skills", []),
                    "contribution_score": 0.0,  # Initial score
                    "availability": "full-time",  # Default
                    "experience_level": "mid",  # Default
                }
                for i, member in enumerate(team_members)
            ]
            state["members"] = members
            state["team_size"] = len(members)
        elif team_size:
            state["team_size"] = team_size

        # Store other metadata
        if project_name:
            state["project_name"] = project_name
        if deadline_date:
            state["deadline_date"] = deadline_date

        await self.state_manager.save(project_id, state)

        stages = [
            ("analysis",    lambda: self.run_analysis(project_id, document_text, document_type)),
            ("planning",    lambda: self.run_planning(project_id, deadline_date)),
            ("coordination",lambda: self.run_coordination(project_id)),
            ("risk",        lambda: self.run_risk_check(project_id)),
        ]
        for stage_name, stage_fn in stages:
            try:
                logger.info(f"[WorkflowEngine] Starting stage: {stage_name}")
                result = await stage_fn()
                logger.info(f"[WorkflowEngine] Completed stage: {stage_name}")
                yield {"stage": stage_name, "status": "complete", "data": result}
            except WorkflowExecutionError as e:
                logger.error(f"[WorkflowEngine] Stage {stage_name} failed: {str(e)}")
                yield {"stage": stage_name, "status": "error", "error": str(e)}
                break  # Stop pipeline on agent failure
            except Exception as e:
                logger.error(f"[WorkflowEngine] Unexpected error in stage {stage_name}: {type(e).__name__}: {str(e)}", exc_info=True)
                yield {"stage": stage_name, "status": "error", "error": f"{type(e).__name__}: {str(e)}"}
                break

    # ------------------------------------------------------------------ #
    #  Helpers                                                             #
    # ------------------------------------------------------------------ #
    def _parse_document(self, document_text: str, document_type: str) -> str:
        """
        Parse document text based on type and return cleaned text.
        
        Supported types:
        - "brief": Plain project brief (minimal parsing)
        - "rubric": Grading rubric (minimal parsing)
        - "meeting_transcript": Meeting transcript with timestamps and speakers
        - "chat_logs": Chat log (Slack, Discord, Teams, etc.)
        """
        try:
            if document_type == "meeting_transcript":
                parsed = transcript_parser.parse(document_text)
                logger.debug(
                    f"[WorkflowEngine] Parsed transcript: {len(parsed['turns'])} turns, "
                    f"{len(parsed['speakers'])} speakers"
                )
                return parsed["cleaned_text"]
            
            elif document_type == "chat_logs":
                parsed = chat_logs_parser.parse(document_text)
                logger.debug(
                    f"[WorkflowEngine] Parsed chat logs: {parsed['message_count']} messages, "
                    f"{len(parsed['speakers'])} speakers"
                )
                return parsed["cleaned_text"]
            
            elif document_type == "rubric":
                # Rubrics are parsed by the GLM agent itself (structured format)
                # Just return the raw text; the prompt handles rubric analysis
                logger.debug(f"[WorkflowEngine] Preparing rubric document for analysis")
                return document_text.strip()
            
            elif document_type == "brief" or document_type == "team_profile":
                # Briefs and team profiles don't need special parsing
                return document_text.strip()
            
            else:
                logger.warning(
                    f"[WorkflowEngine] Unknown document type '{document_type}'. Returning raw text."
                )
                return document_text
        
        except Exception as e:
            logger.error(f"[WorkflowEngine] Error parsing document ({document_type}): {e}")
            # Fall back to raw text on parse error
            return document_text

    @staticmethod
    def _raise_on_agent_error(output: dict, agent_name: str):
        if output.get("status") == "error":
            raise WorkflowExecutionError(
                f"Agent '{agent_name}' failed: {output.get('error', 'unknown error')}"
            )


workflow_engine = WorkflowEngine()