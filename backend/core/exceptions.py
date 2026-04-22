"""
core/exceptions.py — domain-specific exception hierarchy.
"""

from fastapi import HTTPException


class CoordinaBaseError(Exception):
    """Root exception for all Coordina errors."""
    pass


class ProjectNotFoundError(CoordinaBaseError):
    pass


class WorkflowExecutionError(CoordinaBaseError):
    pass


class GLMReasoningError(CoordinaBaseError):
    pass


class AmbiguousInputError(CoordinaBaseError):
    """Raised when GLM detects insufficient context to proceed."""
    def __init__(self, message: str, clarification_questions: list[str]):
        super().__init__(message)
        self.clarification_questions = clarification_questions


class InsufficientDataError(CoordinaBaseError):
    pass


class AgentTimeoutError(CoordinaBaseError):
    pass


# HTTP helpers
def not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=404, detail=detail)


def bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=400, detail=detail)


def internal_error(detail: str) -> HTTPException:
    return HTTPException(status_code=500, detail=detail)