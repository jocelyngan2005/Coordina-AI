"""
edge_cases/missing_data_handler.py

Handles incomplete or missing project data gracefully.
Estimates missing fields using GLM reasoning and flags uncertainty.
"""

from typing import Any
from core.logger import logger


class MissingDataHandler:
    """
    Called when required fields (e.g. deadline, rubric, team members)
    are absent. Provides safe defaults and uncertainty flags so
    the workflow can continue without crashing.
    """

    SAFE_DEFAULTS = {
        "deadline_date": "14 days from today",
        "team_size": 3,
        "document_type": "brief",
        "rubric_criteria": [],
        "members": [],
    }

    def fill_defaults(self, context: dict[str, Any]) -> dict[str, Any]:
        """
        Fill in missing keys with safe defaults.
        Returns (filled_context, list_of_filled_keys).
        """
        filled_keys = []
        for key, default in self.SAFE_DEFAULTS.items():
            if key not in context or context[key] is None:
                context[key] = default
                filled_keys.append(key)
                logger.warning(f"[MissingDataHandler] '{key}' was missing — using default: {default!r}")

        context["_filled_defaults"] = filled_keys
        context["_data_completeness"] = round(
            (len(self.SAFE_DEFAULTS) - len(filled_keys)) / len(self.SAFE_DEFAULTS), 2
        )
        return context

    def get_uncertainty_flags(self, filled_keys: list[str]) -> list[str]:
        messages = {
            "deadline_date": "No deadline specified — estimated at 14 days. Please confirm.",
            "team_size": "Team size unknown — defaulting to 3 members.",
            "rubric_criteria": "No rubric provided — grading priorities cannot be verified.",
            "members": "No team members added — role assignment skipped.",
        }
        return [messages[k] for k in filled_keys if k in messages]


missing_data_handler = MissingDataHandler()