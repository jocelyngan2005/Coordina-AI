"""Database utilities for Discord bot"""

import sys
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import importlib.util

from config import DB_URL
from models import Base

# Try to load backend's AsyncSessionLocal
AsyncSessionLocal = None
try:
    backend_db_path = Path(__file__).parent.parent / "core" / "database.py"
    spec = importlib.util.spec_from_file_location("backend_database", backend_db_path)
    if spec and spec.loader:
        # Temporarily add backend to path for core.database imports
        backend_path = str(Path(__file__).parent.parent)
        sys.path.insert(0, backend_path)
        try:
            db_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(db_module)
            AsyncSessionLocal = db_module.AsyncSessionLocal
        finally:
            sys.path.remove(backend_path)
except Exception:
    pass

# Create engine and session factory
try:
    # Try to import backend settings for DATABASE_URL
    backend_config_path = Path(__file__).parent.parent / "core" / "config.py"
    spec = importlib.util.spec_from_file_location("backend_config", backend_config_path)
    if spec and spec.loader:
        backend_path = str(Path(__file__).parent.parent)
        sys.path.insert(0, backend_path)
        try:
            config_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(config_module)
            settings = config_module.settings
            engine = create_async_engine(settings.DATABASE_URL, echo=False)
        finally:
            sys.path.remove(backend_path)
    else:
        raise Exception("Could not load backend config")
except Exception:
    # Fallback to local config
    engine = create_async_engine(DB_URL, echo=False)

SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Ensure AsyncSessionLocal is available
if not AsyncSessionLocal:
    AsyncSessionLocal = SessionLocal


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """Dependency injection for database session"""
    async with SessionLocal() as session:
        yield session


async def get_backend_db():
    """Get a session from the backend's AsyncSessionLocal"""
    async with AsyncSessionLocal() as session:
        yield session
