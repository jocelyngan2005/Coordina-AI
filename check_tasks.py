"""Diagnostic script to check tasks and assigned_to values in the database"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from backend.core.config import settings
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, text
from backend.models.task import Task

async def check_tasks():
    """Check tasks in database"""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with AsyncSessionLocal() as session:
            # Count all tasks
            result = await session.execute(select(Task))
            tasks = result.scalars().all()

            print(f"\n📊 Total tasks in database: {len(tasks)}\n")

            if not tasks:
                print("❌ No tasks found in database!")
                return

            # Show details of each task
            for i, task in enumerate(tasks, 1):
                print(f"Task {i}:")
                print(f"  ID: {task.id}")
                print(f"  Title: {task.title}")
                print(f"  Project ID: {task.project_id}")
                print(f"  Status: {task.status}")
                print(f"  Assigned To: {task.assigned_to}")
                print(f"  Assigned To Type: {type(task.assigned_to)}")
                print(f"  Assigned To Length: {len(task.assigned_to) if task.assigned_to else 0}")
                print(f"  Assignee ID: {task.assignee_id}")
                print()

            # Raw SQL query to see what's in the database
            print("\n🔍 Raw SQL check:")
            result = await session.execute(text("SELECT id, title, assigned_to FROM tasks LIMIT 5;"))
            rows = result.fetchall()
            for row in rows:
                print(f"  ID: {row[0]}, Title: {row[1]}, assigned_to: {row[2]}")

    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_tasks())
