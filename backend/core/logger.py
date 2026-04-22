"""
core/logger.py — structured logging via Loguru.
"""

import sys
from loguru import logger

logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level}</level> | <cyan>{name}</cyan> - {message}",
    level="DEBUG",
    colorize=True,
)
logger.add(
    "logs/coordina_{time:YYYY-MM-DD}.log",
    rotation="1 day",
    retention="7 days",
    level="INFO",
    serialize=True,
)

__all__ = ["logger"]