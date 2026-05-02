"""Main Discord bot entry point"""

import discord
from discord.ext import commands
import logging
import os
from pathlib import Path
from config import DISCORD_TOKEN
from db import init_db

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Bot intents
intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)


@bot.event
async def on_ready():
    """Bot is ready"""
    logger.info(f"Bot logged in as {bot.user}")

    # Sync commands with Discord
    try:
        synced = await bot.tree.sync()
        logger.info(f"Synced {len(synced)} command(s)")
    except Exception as e:
        logger.error(f"Failed to sync commands: {e}")

    # Initialize database
    try:
        await init_db()
        logger.info("Database initialized")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

    # Initialize scheduler if available
    try:
        scheduler_cog = bot.get_cog("Scheduler")
        if scheduler_cog:
            await scheduler_cog.cog_load()
    except Exception as e:
        logger.error(f"Failed to initialize scheduler: {e}")


async def load_cogs():
    """Load all cogs from the cogs directory"""
    cogs_dir = Path(__file__).parent / "cogs"
    for cog_file in cogs_dir.glob("*.py"):
        if cog_file.name.startswith("_"):
            continue

        cog_name = cog_file.stem
        try:
            await bot.load_extension(f"cogs.{cog_name}")
            logger.info(f"Loaded cog: {cog_name}")
        except Exception as e:
            logger.error(f"Failed to load cog {cog_name}: {e}")


async def main():
    """Start the bot"""
    async with bot:
        # Load cogs
        await load_cogs()

        # Start the bot
        await bot.start(DISCORD_TOKEN)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
