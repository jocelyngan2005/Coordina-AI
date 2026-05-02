"""Utility functions for Discord bot"""

import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone
from db import SessionLocal, AsyncSessionLocal
from models import DiscordGuildConfig, DiscordUserMapping, MemberSetupProgress
from sqlalchemy import select
import importlib.util

# Load Task model from backend
Task = None
try:
    backend_path = str(Path(__file__).parent.parent)
    sys.path.insert(0, backend_path)
    try:
        backend_task_path = Path(__file__).parent.parent / "models" / "task.py"
        spec = importlib.util.spec_from_file_location("backend_task", backend_task_path)
        if spec and spec.loader:
            task_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(task_module)
            Task = task_module.Task
    finally:
        sys.path.remove(backend_path)
except Exception as e:
    # Task model not available, operations will be disabled
    pass

async def get_project_id_for_guild(guild_id: int) -> str | None:
    """Get project ID for a Discord guild"""
    async with SessionLocal() as session:
        result = await session.execute(
            select(DiscordGuildConfig.project_id).where(DiscordGuildConfig.guild_id == guild_id)
        )
        return result.scalar_one_or_none()

async def get_member_id_for_discord_user(guild_id: int, discord_user_id: int) -> str | None:
    """Get project member ID for a Discord user"""
    async with SessionLocal() as session:
        result = await session.execute(
            select(DiscordUserMapping.member_id).where(
                (DiscordUserMapping.guild_id == guild_id) &
                (DiscordUserMapping.discord_user_id == discord_user_id)
            )
        )
        return result.scalar_one_or_none()

async def set_guild_project(guild_id: int, project_id: str):
    """Set the project for a guild"""
    async with SessionLocal() as session:
        existing = await session.execute(
            select(DiscordGuildConfig).where(DiscordGuildConfig.guild_id == guild_id)
        )
        config = existing.scalar_one_or_none()

        if config:
            config.project_id = project_id
        else:
            config = DiscordGuildConfig(guild_id=guild_id, project_id=project_id)
            session.add(config)

        await session.commit()

async def map_discord_user(guild_id: int, discord_user_id: int, member_id: str):
    """Map a Discord user to a project member"""
    async with SessionLocal() as session:
        existing = await session.execute(
            select(DiscordUserMapping).where(
                (DiscordUserMapping.guild_id == guild_id) &
                (DiscordUserMapping.discord_user_id == discord_user_id)
            )
        )
        mapping = existing.scalar_one_or_none()

        if mapping:
            mapping.member_id = member_id
        else:
            mapping = DiscordUserMapping(
                guild_id=guild_id,
                discord_user_id=discord_user_id,
                member_id=member_id
            )
            session.add(mapping)

        await session.commit()

async def mark_user_verified(guild_id: int, discord_user_id: int):
    """Mark a Discord user as verified"""
    async with SessionLocal() as session:
        result = await session.execute(
            select(DiscordUserMapping).where(
                (DiscordUserMapping.guild_id == guild_id) &
                (DiscordUserMapping.discord_user_id == discord_user_id)
            )
        )
        mapping = result.scalar_one_or_none()
        if mapping:
            mapping.is_verified = True
            await session.commit()

async def update_user_activity(guild_id: int, discord_user_id: int):
    """Update last activity timestamp for a Discord user"""
    async with SessionLocal() as session:
        result = await session.execute(
            select(DiscordUserMapping).where(
                (DiscordUserMapping.guild_id == guild_id) &
                (DiscordUserMapping.discord_user_id == discord_user_id)
            )
        )
        mapping = result.scalar_one_or_none()
        if mapping:
            mapping.last_activity_at = datetime.now(timezone.utc)
            await session.commit()

async def get_inactive_users(guild_id: int, threshold_days: int) -> list[dict]:
    """Get users inactive for more than threshold days"""
    async with SessionLocal() as session:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=threshold_days)
        result = await session.execute(
            select(DiscordUserMapping).where(
                (DiscordUserMapping.guild_id == guild_id) &
                (DiscordUserMapping.is_verified == True) &
                ((DiscordUserMapping.last_activity_at == None) |
                 (DiscordUserMapping.last_activity_at < cutoff_date))
            )
        )
        mappings = result.scalars().all()
        return [
            {
                "discord_user_id": m.discord_user_id,
                "member_id": m.member_id,
                "last_activity_at": m.last_activity_at
            }
            for m in mappings
        ]

async def get_verified_users(guild_id: int) -> list[int]:
    """Get all verified Discord user IDs in a guild"""
    async with SessionLocal() as session:
        result = await session.execute(
            select(DiscordUserMapping.discord_user_id).where(
                (DiscordUserMapping.guild_id == guild_id) &
                (DiscordUserMapping.is_verified == True)
            )
        )
        return result.scalars().all()


async def get_verified_member_ids(guild_id: int) -> list[str]:
    """Get all verified project member IDs in a guild"""
    async with SessionLocal() as session:
        result = await session.execute(
            select(DiscordUserMapping.member_id).where(
                (DiscordUserMapping.guild_id == guild_id) &
                (DiscordUserMapping.is_verified == True)
            )
        )
        return result.scalars().all()


async def store_setup_progress_message(guild_id: int, project_id: str, message_id: int, channel_id: int):
    """Store the member setup progress message ID"""
    async with SessionLocal() as session:
        existing = await session.execute(
            select(MemberSetupProgress).where(
                (MemberSetupProgress.guild_id == guild_id) &
                (MemberSetupProgress.project_id == project_id)
            )
        )
        progress = existing.scalar_one_or_none()

        if progress:
            progress.message_id = message_id
            progress.channel_id = channel_id
        else:
            progress = MemberSetupProgress(
                guild_id=guild_id,
                project_id=project_id,
                message_id=message_id,
                channel_id=channel_id
            )
            session.add(progress)

        await session.commit()


async def get_setup_progress_message(guild_id: int, project_id: str) -> tuple[int, int] | None:
    """Get the member setup progress message ID and channel ID"""
    async with SessionLocal() as session:
        result = await session.execute(
            select(MemberSetupProgress.message_id, MemberSetupProgress.channel_id).where(
                (MemberSetupProgress.guild_id == guild_id) &
                (MemberSetupProgress.project_id == project_id)
            )
        )
        return result.first()


async def get_member_name_for_id(member_id: str) -> str | None:
    """Fetch a member's display name from the API given their UUID."""
    try:
        from api_client import api_client
        member = await api_client.get_member(member_id)
        return member.get("name")
    except Exception as e:
        print(f"[WARN] Could not fetch member name for {member_id}: {e}")
        return None


def filter_tasks_for_member(
    tasks: list[dict],
    member_id: str,
    member_name: str | None,
    member_ordinal: int | None = None,   # 1-based position of member in project (M1=1, M2=2…)
) -> list[dict]:
    """
    Return tasks assigned to the given member.

    The AI planner stores one of three formats in `assigned_to`:
      1. Ordinal placeholder  e.g. "M1", "M2"  ← most common from GLM output
      2. Member display name  e.g. "Jocelyn Gan"
      3. Member UUID          e.g. "1dcdbd18-4bc..."
    We check all three so any AI output format is handled.
    """
    # Build the ordinal label this member maps to (e.g. ordinal=1 → "M1")
    ordinal_label = f"M{member_ordinal}" if member_ordinal is not None else None

    def _matches(task: dict) -> bool:
        assigned = task.get("assigned_to") or []
        if not isinstance(assigned, list):
            assigned = [assigned]
        for entry in assigned:
            entry_str = str(entry).strip()
            if entry_str == member_id:                                   # UUID match
                return True
            if member_name and entry_str.lower() == member_name.lower(): # name match
                return True
            if ordinal_label and entry_str.upper() == ordinal_label:     # M1/M2 match
                return True
        return False

    return [t for t in tasks if _matches(t)]


async def get_tasks_for_project(project_id: str) -> list[dict]:
    """Get all tasks for a project from the API"""
    try:
        from api_client import api_client
        tasks = await api_client.get_tasks(project_id)
        # Convert to dict format if needed
        return [t if isinstance(t, dict) else t.model_dump() for t in tasks]
    except Exception as e:
        print(f"[ERROR] Failed to fetch tasks: {e}")
        return []


async def get_member_tasks(project_id: str, member_id: str) -> list[dict]:
    """
    Fetch all tasks for a project and return only those assigned to member_id.

    Resolves assignments by UUID, display name, AND ordinal M-label (M1/M2…)
    so all AI planner output formats are handled in one place.
    """
    from api_client import api_client

    # Fetch tasks and member list concurrently
    import asyncio
    tasks_coro = get_tasks_for_project(project_id)
    members_coro = _get_project_members_safe(project_id)
    tasks, members = await asyncio.gather(tasks_coro, members_coro)

    # Resolve member's display name
    member_name: str | None = None
    member_ordinal: int | None = None
    for i, m in enumerate(members, start=1):   # members are ordered by joined_at
        if m.get("id") == member_id:
            member_name = m.get("name")
            member_ordinal = i
            break

    print(
        f"[DEBUG] get_member_tasks: project={project_id} member={member_id} "
        f"name={member_name!r} ordinal=M{member_ordinal} total_tasks={len(tasks)}"
    )

    matched = filter_tasks_for_member(tasks, member_id, member_name, member_ordinal)
    print(f"[DEBUG] get_member_tasks: matched {len(matched)} task(s)")
    return matched


async def _get_project_members_safe(project_id: str) -> list[dict]:
    """Fetch project members, returning an empty list on error."""
    try:
        from api_client import api_client
        return await api_client.get_project_members(project_id)
    except Exception as e:
        print(f"[WARN] Could not fetch members for project {project_id}: {e}")
        return []


async def update_task_in_db(task_id: str, update_data: dict) -> dict | None:
    """Update a task in the database"""
    if not Task:
        return None

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Task).where(Task.id == task_id)
        )
        task = result.scalar_one_or_none()
        if not task:
            return None

        # Update fields
        if "status" in update_data:
            task.status = update_data["status"]
        if "completion_pct" in update_data:
            task.completion_pct = update_data["completion_pct"]
        if "assignee_id" in update_data:
            task.assignee_id = update_data["assignee_id"]

        await session.commit()

        return {
            "id": task.id,
            "title": task.title,
            "status": task.status.value if task.status else "pending",
            "completion_pct": task.completion_pct,
        }
