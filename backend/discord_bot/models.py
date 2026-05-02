"""Database models for Discord bot"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Integer, BigInteger, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship, declarative_base

Base = declarative_base()


class DiscordGuildConfig(Base):
    """Maps Discord guild to a project"""
    __tablename__ = "discord_guild_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    guild_id: Mapped[int] = mapped_column(BigInteger, nullable=False, unique=True)
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class DiscordUserMapping(Base):
    """Maps Discord user to project member"""
    __tablename__ = "discord_user_mappings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    guild_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    discord_user_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    member_id: Mapped[str] = mapped_column(String(36), nullable=False)

    # Track verification status
    is_verified: Mapped[bool] = mapped_column(default=False)

    # Track last activity in Discord
    last_activity_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class MemberSetupProgress(Base):
    """Tracks member setup progress for a project in a guild"""
    __tablename__ = "member_setup_progress"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    guild_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    message_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    channel_id: Mapped[int] = mapped_column(BigInteger, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
