# Coordina-AI Discord Bot

A Discord bot that syncs with the Coordina-AI backend to manage projects, tasks, and team coordination.

## Features

- **Project Sync** — Link Discord servers to Coordina-AI projects
- **Role Assignment** — Map Discord users to project members and assign roles
- **Task Management** — View assigned tasks and update progress
- **Daily Check-ins** — Automatic reminders if the group is silent
- **Inactivity Tracking** — Detect inactive users and notify the risk agent

## Setup

### 1. Prerequisites

- Python 3.10+
- Discord Bot Token (create at [Discord Developer Portal](https://discord.com/developers/applications))
- PostgreSQL database (shared with your main Coordina-AI backend)
- Running Coordina-AI API server

### 2. Installation

```bash
cd backend/discord_bot
pip install -r requirements.txt
```

### 3. Configuration

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Edit `.env`:
- `DISCORD_TOKEN` — Your Discord bot token
- `API_BASE_URL` — URL of your Coordina-AI API (default: http://localhost:8000)
- `DB_URL` — PostgreSQL connection string
- `DAILY_CHECKIN_TIME` — Time for daily check-in (HH:MM format, 24-hour)
- `INACTIVITY_THRESHOLD_DAYS` — Days of inactivity before user flagged (default: 2)

### 4. Run the Bot

```bash
python main.py
```

## Commands

### Admin Commands

- `/sync-project` — Set which Coordina-AI project the server is working on
- `/current-project` — Show the current project
- `/verify-all` — Notify all verified users of their assigned tasks
- `/progress-report` — Show overall project progress

### User Commands

- `/assign-role` — Assign yourself to a project member and role
- `/my-tasks` — View your assigned tasks
- `/mark-complete <task_name>` — Mark a task as complete
- `/update-progress <task_name> <percentage>` — Update task progress

## Architecture

### Cogs

1. **project_setup.py** — Project synchronization and selection
2. **role_assignment.py** — User verification and role assignment
3. **tasks.py** — Task viewing and status updates
4. **scheduler.py** — Scheduled tasks (daily check-in, inactivity detection)

### Database

The bot uses SQLAlchemy with the following custom tables:

- `discord_guild_configs` — Maps Discord guilds to projects
- `discord_user_mappings` — Maps Discord users to project members

### API Integration

The bot communicates with the Coordina-AI backend via REST API:

- Projects: `/api/projects`, `/api/projects/{id}`
- Tasks: `/api/tasks/project/{project_id}`, `/api/tasks/{id}`
- Members: `/api/teams/projects/{project_id}/members`
- Roles: `/api/teams/projects/{project_id}/roles`

## How It Works

### Workflow

1. **Admin Setup**
   - Use `/sync-project` to link the Discord server to a project
   - Project data is fetched from the Coordina-AI API

2. **User Verification**
   - Users run `/assign-role`
   - They select their member profile from the project
   - They select their role (Lead, Coordinator, Contributor, etc.)
   - Discord user is mapped to project member

3. **Task Management**
   - Users see tasks via `/my-tasks`
   - Update progress with `/update-progress` or `/mark-complete`
   - Bot tracks activity in `discord_user_mappings.last_activity_at`

4. **Daily Check-in**
   - At the configured time (default 22:00), bot checks for recent activity
   - If the group has been silent for 4+ hours, sends a check-in message
   - Prompts users to update task progress

5. **Inactivity Detection**
   - Every 2 hours, bot checks for inactive users
   - Users inactive for `INACTIVITY_THRESHOLD_DAYS` are flagged
   - Logged for risk detection system

## Troubleshooting

### Bot doesn't respond to commands

1. Ensure bot has "Use Application Commands" permission
2. Verify `DISCORD_TOKEN` is correct
3. Check bot is synced to the guild: `guild.me.guild_permissions.administrator`

### API connection errors

1. Verify `API_BASE_URL` is correct and API is running
2. Check database connectivity
3. View logs for specific errors

### Database errors

1. Ensure PostgreSQL is running
2. Verify `DB_URL` connection string
3. Check migrations have been applied

## Development

### Adding New Commands

Create a new cog in `cogs/` and add it to the cog loader in `main.py`:

```python
# cogs/my_feature.py
from discord.ext import commands
import discord

class MyFeature(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @discord.app_commands.command(name="my-command")
    async def my_command(self, interaction: discord.Interaction):
        await interaction.response.send_message("Hello!")

async def setup(bot):
    await bot.add_cog(MyFeature(bot))
```

### Extending the Scheduler

Edit `cogs/scheduler.py` to add new scheduled tasks:

```python
self.scheduler.add_job(
    self.my_task,
    CronTrigger(hour=12, minute=0, timezone=TIMEZONE),
    id="my_task_id"
)
```

## License

Same as Coordina-AI main project.
