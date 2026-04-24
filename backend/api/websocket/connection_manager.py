"""
api/websocket/connection_manager.py

WebSocket connection registry and broadcast manager.
Tracks active client connections and handles multi-client messaging.
"""

from typing import Dict, Set
from fastapi import WebSocket
from core.logger import logger


class ConnectionManager:
    """
    Manages WebSocket connections for real-time workflow updates.
    
    Connections are organized by project_id:
    {
        "proj-123": {websocket1, websocket2, ...},
        "proj-456": {websocket3, ...},
    }
    """

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, project_id: str, websocket: WebSocket):
        """Accept a new WebSocket connection for a project."""
        await websocket.accept()
        
        if project_id not in self.active_connections:
            self.active_connections[project_id] = set()
        
        self.active_connections[project_id].add(websocket)
        logger.info(f"[WS] Client connected to project {project_id}. Total: {len(self.active_connections[project_id])}")

    def disconnect(self, project_id: str, websocket: WebSocket):
        """Remove a WebSocket connection."""
        if project_id in self.active_connections:
            self.active_connections[project_id].discard(websocket)
            
            # Cleanup empty sets
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]
                logger.info(f"[WS] Last client disconnected from project {project_id}")
            else:
                logger.info(f"[WS] Client disconnected from project {project_id}. Remaining: {len(self.active_connections[project_id])}")

    async def send_personal(self, websocket: WebSocket, message: dict):
        """Send a message to a single client."""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"[WS] Failed to send personal message: {e}")

    async def broadcast(self, project_id: str, message: dict):
        """Broadcast a message to all clients connected to a project."""
        if project_id not in self.active_connections:
            return
        
        disconnected = set()
        for websocket in self.active_connections[project_id]:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.warning(f"[WS] Client disconnection detected during broadcast: {e}")
                disconnected.add(websocket)
        
        # Clean up dead connections
        for ws in disconnected:
            self.active_connections[project_id].discard(ws)
        
        if disconnected:
            logger.debug(f"[WS] Cleaned up {len(disconnected)} dead connections for project {project_id}")


# Singleton instance
connection_manager = ConnectionManager()