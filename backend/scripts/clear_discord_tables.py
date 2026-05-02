"""
clear_discord_tables.py
───────────────────────
Clears all rows from the three Discord integration tables:
  • discord_guild_configs
  • discord_user_mappings
  • member_setup_progress

Run from the repo root (or the backend/ directory):
    python backend/scripts/clear_discord_tables.py

The script reads the same DATABASE_URL that the bot uses (via .env or
the backend's core/config.py) so no extra config is needed.
"""

import asyncio
import sys
from pathlib import Path

# ── Allow imports from backend/ and discord_bot/ ─────────────────────────────
REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
BOT_DIR = BACKEND_DIR / "discord_bot"

for p in (str(BACKEND_DIR), str(BOT_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

# ── Resolve DATABASE_URL (mirrors db.py logic) ────────────────────────────────
DATABASE_URL: str | None = None

try:
    import importlib.util
    config_path = BACKEND_DIR / "core" / "config.py"
    spec = importlib.util.spec_from_file_location("backend_config", config_path)
    if spec and spec.loader:
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        DATABASE_URL = mod.settings.DATABASE_URL
except Exception:
    pass

if not DATABASE_URL:
    # Fallback: read from discord_bot/.env
    from dotenv import load_dotenv
    import os
    load_dotenv(BOT_DIR / ".env")
    DATABASE_URL = os.getenv("DB_URL", "postgresql+asyncpg://user:password@localhost/coordina_ai")

# ── Tables to clear ───────────────────────────────────────────────────────────
TABLES = [
    "discord_user_mappings",
    "member_setup_progress",
    "discord_guild_configs",   # last — others may reference it
]

# ── Main ──────────────────────────────────────────────────────────────────────
async def main():
    print("\n⚠️  This will DELETE ALL ROWS from the following tables:")
    for t in TABLES:
        print(f"   • {t}")

    confirm = input("\nType 'yes' to confirm: ").strip().lower()
    if confirm != "yes":
        print("Aborted — no changes made.")
        return

    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text

    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        for table in TABLES:
            await conn.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;"))
            print(f"   ✅ Cleared: {table}")

    await engine.dispose()
    print("\n✔ Done. All Discord integration tables have been cleared.\n")


if __name__ == "__main__":
    asyncio.run(main())
