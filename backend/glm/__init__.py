"""
glm package — GLM reasoning engine integration.
"""

from glm.client import GLMClient
from glm.reasoning_engine import ReasoningEngine

glm_client = GLMClient()
reasoning_engine = ReasoningEngine()

__all__ = ["GLMClient", "ReasoningEngine", "glm_client", "reasoning_engine"]
