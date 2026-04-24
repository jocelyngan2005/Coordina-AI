"""
api/router.py

Aggregates all API route modules into a single APIRouter.
This router is included in main.py with the /api prefix.
"""

from fastapi import APIRouter

from api.routes import workflow, projects, tasks, teams, documents, analytics, agents

api_router = APIRouter()

# Include all route modules
api_router.include_router(workflow.router, prefix="/workflow", tags=["workflow"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(teams.router, prefix="/teams", tags=["teams"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])

__all__ = ["api_router"]