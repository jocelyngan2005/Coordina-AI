"""
edge_cases package — specialized handlers for edge cases and recovery.
"""

from edge_cases.ambiguity_resolver import AmbiguityResolver
from edge_cases.deadline_recovery import DeadlineRecovery
from edge_cases.inactivity_detector import InactivityDetector
from edge_cases.missing_data_handler import MissingDataHandler

__all__ = [
    "AmbiguityResolver",
    "DeadlineRecovery",
    "InactivityDetector",
    "MissingDataHandler",
]
