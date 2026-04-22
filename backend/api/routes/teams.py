"""api/routes/teams.py"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.exceptions import not_found
from memory.activity_tracker import activity_tracker
from models.member import Member
from schemas.member import MemberCreate, MemberResponse, MemberUpdate

router = APIRouter()


@router.post("/", response_model=MemberResponse, status_code=201)
async def add_member(payload: MemberCreate, db: AsyncSession = Depends(get_db)):
    member = Member(**payload.model_dump())
    db.add(member)
    await db.flush()
    await db.refresh(member)
    await activity_tracker.record(
        project_id=member.project_id,
        member_id=member.id,
        activity_type="member_joined",
    )
    return member


@router.get("/project/{project_id}", response_model=list[MemberResponse])
async def list_members(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Member).where(Member.project_id == project_id).order_by(Member.joined_at)
    )
    return result.scalars().all()


@router.get("/{member_id}", response_model=MemberResponse)
async def get_member(member_id: str, db: AsyncSession = Depends(get_db)):
    member = await db.get(Member, member_id)
    if not member:
        raise not_found(f"Member '{member_id}' not found.")
    return member


@router.patch("/{member_id}", response_model=MemberResponse)
async def update_member(
    member_id: str,
    payload: MemberUpdate,
    db: AsyncSession = Depends(get_db),
):
    member = await db.get(Member, member_id)
    if not member:
        raise not_found(f"Member '{member_id}' not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(member, field, value)
    await db.flush()
    await db.refresh(member)
    return member


@router.get("/{member_id}/activity")
async def get_member_activity(member_id: str, db: AsyncSession = Depends(get_db)):
    member = await db.get(Member, member_id)
    if not member:
        raise not_found(f"Member '{member_id}' not found.")
    last_activity = await activity_tracker.get_member_last_activity(
        project_id=member.project_id,
        member_id=member_id,
    )
    counts = await activity_tracker.get_contribution_counts(project_id=member.project_id)
    return {
        "member_id": member_id,
        "last_activity_at": last_activity,
        "total_events": counts.get(member_id, 0),
    }


@router.delete("/{member_id}", status_code=204)
async def remove_member(member_id: str, db: AsyncSession = Depends(get_db)):
    member = await db.get(Member, member_id)
    if not member:
        raise not_found(f"Member '{member_id}' not found.")
    await db.delete(member)