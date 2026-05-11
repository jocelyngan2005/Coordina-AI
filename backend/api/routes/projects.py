"""api/routes/projects.py"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.exceptions import not_found
from models.project import Project
from schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter()


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(payload: ProjectCreate, db: AsyncSession = Depends(get_db)):
    try:
        project = Project(**payload.model_dump())
        db.add(project)
        await db.flush()
        await db.refresh(project)
        return project
    except Exception as e:
        import traceback
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=traceback.format_exc())


@router.get("/", response_model=list[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db)):
    stmt = select(Project).options(selectinload(Project.members)).order_by(Project.created_at.desc())
    result = await db.execute(stmt)
    projects = result.scalars().all()
    
    for project in projects:
        if project.team_size is None:
            project.team_size = len(project.members)
            
    return projects


from sqlalchemy.orm import selectinload

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    # Use select with selectinload to get members for team_size calculation
    stmt = select(Project).where(Project.id == project_id).options(selectinload(Project.members))
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    
    if not project:
        raise not_found(f"Project '{project_id}' not found.")
    
    # If team_size is not set in DB, use the count of members
    if project.team_size is None:
        project.team_size = len(project.members)
        
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, payload: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise not_found(f"Project '{project_id}' not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await db.flush()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise not_found(f"Project '{project_id}' not found.")
    await db.delete(project)