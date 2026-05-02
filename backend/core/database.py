"""
core/database.py — async SQLAlchemy engine and session factory.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=50,
    max_overflow=50,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def init_db():
    """Create all tables on startup (dev only — use Alembic in production)."""
    from models import (  # noqa
        project,
        task,
        member,
        document,
        decision_log,
        workflow_event,
        goal,
        rubric,
        milestone,
        role_assignment,
        contribution_balance,
        meeting_agenda,
        accountability_pair,
        activity_event,
        detected_risk,
        risk_report,
        submission_checklist,
        submission_report,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields a DB session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise