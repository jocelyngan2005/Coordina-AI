"""
Coordina AI — Backend Entry Point
FastAPI application factory with lifespan management.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.router import api_router
from api.websocket.workflow_stream import ws_router
from core.config import settings
from core.database import init_db
from core.logger import logger
from core.redis_client import init_redis, close_redis


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    logger.info("Starting Coordina AI backend...")
    await init_db()
    await init_redis()
    logger.info("Database and Redis connections established.")
    yield
    await close_redis()
    logger.info("Coordina AI backend shut down.")


app = FastAPI(
    title="Coordina AI",
    description="Autonomous AI Teammate & Workflow Orchestrator",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.include_router(ws_router, prefix="/ws")


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "coordina-ai-backend"}