"""
core/redis_client.py — async Redis client for stateful memory.
"""

import redis.asyncio as aioredis
from core.config import settings
from core.logger import logger

_redis: aioredis.Redis | None = None


async def init_redis():
    global _redis
    _redis = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )
    await _redis.ping()
    logger.info("Redis connection established.")


async def close_redis():
    global _redis
    if _redis:
        await _redis.aclose()


def get_redis() -> aioredis.Redis:
    if _redis is None:
        raise RuntimeError("Redis has not been initialised. Call init_redis() first.")
    return _redis