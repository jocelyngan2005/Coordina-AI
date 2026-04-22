"""
orchestrator/event_bus.py

Lightweight async pub/sub event bus using Redis.
Agents publish events; frontend and other agents can subscribe.
"""

import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Callable, Awaitable

from core.redis_client import get_redis
from core.logger import logger

CHANNEL_PREFIX = "coordina:events:"


@dataclass
class WorkflowEvent:
    project_id: str
    event_type: str
    payload: dict
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class EventBus:
    """
    Publishes workflow events to a Redis pub/sub channel per project.
    The WebSocket layer subscribes to these channels to push updates to the frontend.
    """

    def channel(self, project_id: str) -> str:
        return f"{CHANNEL_PREFIX}{project_id}"

    async def publish(self, event: WorkflowEvent) -> None:
        redis = get_redis()
        message = json.dumps(asdict(event), ensure_ascii=False)
        await redis.publish(self.channel(event.project_id), message)
        logger.debug(f"[EventBus] Published '{event.event_type}' for project {event.project_id}")

    async def subscribe(
        self,
        project_id: str,
        callback: Callable[[WorkflowEvent], Awaitable[None]],
    ) -> None:
        """Subscribe to a project's event stream. Runs until cancelled."""
        redis = get_redis()
        pubsub = redis.pubsub()
        await pubsub.subscribe(self.channel(project_id))
        logger.info(f"[EventBus] Subscribed to project {project_id}")

        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    event = WorkflowEvent(**data)
                    await callback(event)
                except Exception as e:
                    logger.error(f"[EventBus] Error processing message: {e}")


event_bus = EventBus()