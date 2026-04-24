"""
tests/performance/test_response_time.py

NFR-01: API response time tests.
Verifies that read-only endpoints respond within 800ms p95
under sequential single-user load (100 requests).

Run:
    pytest tests/performance/test_response_time.py -v -s

Requirements:
    pip install httpx pytest pytest-asyncio
    Backend running at http://localhost:8000
"""

import time
import statistics
import pytest
import httpx

BASE_URL = "http://localhost:8000"
PROJECT_ID = "perf-test-001"   # pre-seeded or created in setup
ITERATIONS = 100
P95_THRESHOLD_MS = 800
P50_THRESHOLD_MS = 400


# ── helpers ─────────────────────────────────────────────────────────

def percentile(data: list[float], p: int) -> float:
    sorted_data = sorted(data)
    index = int(len(sorted_data) * p / 100)
    return sorted_data[min(index, len(sorted_data) - 1)]


# ── fixtures ─────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def client():
    return httpx.Client(base_url=BASE_URL, timeout=5.0)


@pytest.fixture(scope="module")
def project_id(client):
    """Create a project once, reuse across all perf tests."""
    resp = client.post("/api/projects/", json={"name": "Perf Test Project"})
    if resp.status_code == 201:
        return resp.json()["id"]
    # If already exists (re-run), list and grab first
    resp = client.get("/api/projects/")
    projects = resp.json()
    if projects:
        return projects[0]["id"]
    pytest.skip("Could not create or find a project for performance testing.")


# ── NFR-01: response time ────────────────────────────────────────────

class TestResponseTime:

    def _measure(self, client: httpx.Client, url: str, n: int = ITERATIONS) -> list[float]:
        """Send n sequential requests; return list of response times in ms."""
        times = []
        errors = 0
        for _ in range(n):
            t0 = time.perf_counter()
            try:
                resp = client.get(url)
                elapsed_ms = (time.perf_counter() - t0) * 1000
                if resp.status_code < 500:
                    times.append(elapsed_ms)
                else:
                    errors += 1
            except Exception:
                errors += 1
        assert errors == 0, f"{errors} requests failed on {url}"
        return times

    def test_workflow_state_p95_under_800ms(self, client, project_id):
        """GET /api/workflow/{id}/state — should be fast (Redis read)."""
        times = self._measure(client, f"/api/workflow/{project_id}/state")
        p50 = percentile(times, 50)
        p95 = percentile(times, 95)
        p99 = percentile(times, 99)
        print(f"\n  /workflow/state  p50={p50:.0f}ms  p95={p95:.0f}ms  p99={p99:.0f}ms")
        assert p95 < P95_THRESHOLD_MS, f"p95 {p95:.0f}ms exceeds {P95_THRESHOLD_MS}ms threshold"
        assert p50 < P50_THRESHOLD_MS, f"p50 {p50:.0f}ms exceeds {P50_THRESHOLD_MS}ms threshold"

    def test_analytics_overview_p95_under_800ms(self, client, project_id):
        """GET /api/analytics/project/{id}/overview — DB + Redis read."""
        times = self._measure(client, f"/api/analytics/project/{project_id}/overview")
        p95 = percentile(times, 95)
        print(f"\n  /analytics/overview  p95={p95:.0f}ms")
        assert p95 < P95_THRESHOLD_MS

    def test_projects_list_p95_under_800ms(self, client, project_id):
        """GET /api/projects/ — simple DB select."""
        times = self._measure(client, "/api/projects/")
        p95 = percentile(times, 95)
        print(f"\n  /projects/  p95={p95:.0f}ms")
        assert p95 < P95_THRESHOLD_MS

    def test_decision_log_p95_under_800ms(self, client, project_id):
        """GET /api/workflow/{id}/decisions — Redis lrange."""
        times = self._measure(client, f"/api/workflow/{project_id}/decisions")
        p95 = percentile(times, 95)
        print(f"\n  /workflow/decisions  p95={p95:.0f}ms")
        assert p95 < P95_THRESHOLD_MS

    def test_health_check_under_100ms(self, client, project_id):
        """GET /health — should be near-instant."""
        times = self._measure(client, "/health", n=50)
        p95 = percentile(times, 95)
        print(f"\n  /health  p95={p95:.0f}ms")
        assert p95 < 100, f"Health check p95 {p95:.0f}ms — server may be overloaded"

    def test_summary_report(self, client, project_id):
        """Print a full summary table; does not assert (informational)."""
        endpoints = [
            f"/api/workflow/{project_id}/state",
            f"/api/analytics/project/{project_id}/overview",
            "/api/projects/",
            "/health",
        ]
        print(f"\n{'Endpoint':<50} {'p50':>8} {'p95':>8} {'p99':>8}")
        print("-" * 78)
        for url in endpoints:
            times = self._measure(client, url, n=30)
            print(f"  {url:<48} {percentile(times,50):>6.0f}ms {percentile(times,95):>6.0f}ms {percentile(times,99):>6.0f}ms")