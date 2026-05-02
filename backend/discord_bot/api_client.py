"""API client for Coordina-AI backend"""

import httpx
from config import API_BASE_URL
from typing import Any

class APIClient:
    def __init__(self, base_url: str = API_BASE_URL):
        self.base_url = base_url
        self.client = httpx.AsyncClient(base_url=base_url, follow_redirects=True)

    async def close(self):
        await self.client.aclose()

    # Projects
    async def get_projects(self) -> list[dict]:
        """Get all projects"""
        response = await self.client.get("/api/projects/")
        response.raise_for_status()
        return response.json()

    async def get_project(self, project_id: str) -> dict:
        """Get a specific project"""
        response = await self.client.get(f"/api/projects/{project_id}/")
        response.raise_for_status()
        return response.json()

    # Tasks
    async def get_tasks(self, project_id: str) -> list[dict]:
        """Get tasks for a project"""
        response = await self.client.get(f"/api/tasks/project/{project_id}/")
        response.raise_for_status()
        return response.json()

    async def get_task(self, task_id: str) -> dict:
        """Get a specific task"""
        response = await self.client.get(f"/api/tasks/{task_id}/")
        response.raise_for_status()
        return response.json()

    async def update_task(self, task_id: str, data: dict) -> dict:
        """Update a task"""
        response = await self.client.patch(f"/api/tasks/{task_id}/", json=data)
        response.raise_for_status()
        return response.json()

    # Members
    async def get_project_members(self, project_id: str) -> list[dict]:
        """Get members in a project"""
        response = await self.client.get(f"/api/teams/project/{project_id}")
        response.raise_for_status()
        return response.json()

    async def get_member(self, member_id: str) -> dict:
        """Get a specific member"""
        response = await self.client.get(f"/api/teams/{member_id}")
        response.raise_for_status()
        return response.json()

    # Roles
    async def get_role_assignments(self, project_id: str) -> list[dict]:
        """Get role assignments for a project"""
        response = await self.client.get(f"/api/teams/projects/{project_id}/roles/")
        response.raise_for_status()
        return response.json()

    async def get_member_roles(self, member_id: str) -> list[dict]:
        """Get roles for a member"""
        response = await self.client.get(f"/api/teams/members/{member_id}/roles/")
        response.raise_for_status()
        return response.json()

    # Risks
    async def get_detected_risks(self, project_id: str) -> list[dict]:
        """Get detected risks for a project"""
        response = await self.client.get(f"/api/agents/projects/{project_id}/risks/")
        response.raise_for_status()
        return response.json()


api_client = APIClient()
