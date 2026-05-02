"""Discord bot configuration"""

import os
from dotenv import load_dotenv

load_dotenv()

# Discord bot settings
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
DISCORD_PREFIX = os.getenv("DISCORD_PREFIX", "!")

# API settings
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

# Database settings
DB_URL = os.getenv("DB_URL", "postgresql+asyncpg://user:password@localhost/coordina_ai")

# Timezone for scheduling
TIMEZONE = os.getenv("TIMEZONE", "UTC")

# Daily check-in time (format: HH:MM, 24-hour)
DAILY_CHECKIN_TIME = os.getenv("DAILY_CHECKIN_TIME", "22:00")

# Inactivity threshold (days)
INACTIVITY_THRESHOLD_DAYS = int(os.getenv("INACTIVITY_THRESHOLD_DAYS", "2"))
