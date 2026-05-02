"""Discord bot configuration"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Explicitly load the backend .env (one level up from discord_bot/)
load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

# Discord bot settings
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
DISCORD_PREFIX = os.getenv("DISCORD_PREFIX", "!")

# API settings
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

# Database settings — use DATABASE_URL to match backend/.env key
DB_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost/coordina_ai")

# Timezone for scheduling
TIMEZONE = os.getenv("TIMEZONE", "UTC")

# Daily check-in time (format: HH:MM, 24-hour)
DAILY_CHECKIN_TIME = os.getenv("DAILY_CHECKIN_TIME", "22:00")

# Inactivity threshold (days)
INACTIVITY_THRESHOLD_DAYS = int(os.getenv("INACTIVITY_THRESHOLD_DAYS", "2"))
