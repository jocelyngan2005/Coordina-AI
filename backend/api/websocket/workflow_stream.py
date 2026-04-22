"""
api/websocket/workflow_stream.py

Real-time WebSocket endpoint.
Clients connect to /ws/projects/{project_id} to receive live
workflow stage updates as the GLM engine processes them.
"""

import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from api.websocket.connection_manager import connection_manager
from orchestrator.event_bus import event_bus, WorkflowEvent
from core.logger import logger

ws_router = APIRouter()


@ws_router.websocket("/projects/{project_id}")
async def project_ws(project_id: str, websocket: WebSocket):
    """
    WebSocket connection for a project.

    Messages sent to the client:
        { "type": "workflow_event", "event_type": str, "payload": dict }
        { "type": "ping" }
        { "type": "error", "message": str }

    Messages accepted from the client:
        { "type": "ping" }
        { "type": "subscribe" }   (implicit on connect)
    """
    await connection_manager.connect(project_id, websocket)

    # Subscribe to Redis pub/sub for this project in a background task
    async def on_event(event: WorkflowEvent):
        await connection_manager.broadcast(
            project_id=project_id,
            message={
                "type": "workflow_event",
                "event_type": event.event_type,
                "payload": event.payload,
                "timestamp": event.timestamp,
            },
        )

    subscription_task = asyncio.create_task(
        event_bus.subscribe(project_id, on_event)
    )

    # Send welcome message
    await connection_manager.send_personal(websocket, {
        "type": "connected",
        "project_id": project_id,
        "message": "Connected to Coordina AI workflow stream.",
    })

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                if data.get("type") == "ping":
                    await connection_manager.send_personal(websocket, {"type": "pong"})
            except json.JSONDecodeError:
                await connection_manager.send_personal(websocket, {
                    "type": "error",
                    "message": "Invalid JSON received.",
                })

    except WebSocketDisconnect:
        connection_manager.disconnect(project_id, websocket)
        subscription_task.cancel()
        logger.info(f"[WS] Project {project_id} WebSocket closed.")