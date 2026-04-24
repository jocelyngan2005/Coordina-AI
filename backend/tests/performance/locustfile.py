"""
tests/performance/locustfile.py

NFR-02: Concurrent load test — 50 simulated users.

Usage:
    pip install locust
    locust -f tests/performance/locustfile.py --headless -u 50 -r 5 --run-time 60s --host http://localhost:8000

    # With HTML report:
    locust -f tests/performance/locustfile.py -u 50 -r 5 --run-time 60s --host http://localhost:8000 --html report.html

Pass criteria (NFR-02):
    - Error rate < 5%
    - p95 < 1500ms
    - No 500 errors
"""

import random
from locust import HttpUser, task, between, events

# Seeded project IDs — create these before running load test
# or let the on_start hook create one per user
SAMPLE_PROJECT_IDS = []


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("\n[Locust] Starting Coordina AI load test — target: 50 concurrent users")


class CoordinaUser(HttpUser):
    """
    Simulates a team member interacting with the Coordina AI API.
    Mix of read-heavy (state, analytics) and occasional write (task update).
    """
    wait_time = between(0.5, 2.0)   # think time between requests

    def on_start(self):
        """Create a dedicated project for this virtual user."""
        resp = self.client.post(
            "/api/projects/",
            json={"name": f"LoadTest Project {random.randint(1000, 9999)}"},
            name="/api/projects/ [setup]",
        )
        if resp.status_code == 201:
            self.project_id = resp.json()["id"]
            # Add a member
            self.client.post(
                "/api/teams/",
                json={"project_id": self.project_id, "name": "Load Tester", "skills": ["testing"]},
                name="/api/teams/ [setup]",
            )
        else:
            self.project_id = None

    # ── Read-heavy tasks (high frequency) ───────────────────────────

    @task(5)
    def get_workflow_state(self):
        if not self.project_id:
            return
        self.client.get(
            f"/api/workflow/{self.project_id}/state",
            name="/api/workflow/[id]/state",
        )

    @task(4)
    def get_analytics_overview(self):
        if not self.project_id:
            return
        self.client.get(
            f"/api/analytics/project/{self.project_id}/overview",
            name="/api/analytics/project/[id]/overview",
        )

    @task(3)
    def list_tasks(self):
        if not self.project_id:
            return
        self.client.get(
            f"/api/tasks/project/{self.project_id}",
            name="/api/tasks/project/[id]",
        )

    @task(3)
    def list_members(self):
        if not self.project_id:
            return
        self.client.get(
            f"/api/teams/project/{self.project_id}",
            name="/api/teams/project/[id]",
        )

    @task(2)
    def get_decision_log(self):
        if not self.project_id:
            return
        self.client.get(
            f"/api/workflow/{self.project_id}/decisions?limit=10",
            name="/api/workflow/[id]/decisions",
        )

    @task(2)
    def health_check(self):
        self.client.get("/health", name="/health")

    # ── Write tasks (lower frequency) ───────────────────────────────

    @task(1)
    def run_risk_check(self):
        """Trigger risk detection — involves Redis read + GLM call (mocked in load env)."""
        if not self.project_id:
            return
        self.client.post(
            f"/api/workflow/{self.project_id}/risk-check",
            name="/api/workflow/[id]/risk-check",
        )

    @task(1)
    def update_task_status(self):
        """Simulate a team member marking a task as in-progress."""
        if not self.project_id:
            return
        # First get tasks, then update one if available
        resp = self.client.get(
            f"/api/tasks/project/{self.project_id}",
            name="/api/tasks/project/[id] [write setup]",
        )
        if resp.status_code == 200:
            tasks = resp.json()
            if tasks:
                task_id = tasks[0]["id"]
                self.client.patch(
                    f"/api/tasks/{task_id}",
                    json={"status": "in_progress", "completion_pct": random.randint(10, 90)},
                    name="/api/tasks/[id] PATCH",
                )