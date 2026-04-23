"""
DEPRECATED: This file has been renamed to redis_client.py
Please import from core.redis_client instead.

This file is kept for backwards compatibility but will be removed.
"""

# Re-export from the new module for compatibility
from core.redis_client import init_redis, close_redis, get_redis

__all__ = ["init_redis", "close_redis", "get_redis"]