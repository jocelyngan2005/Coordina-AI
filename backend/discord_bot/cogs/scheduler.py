"""Cog for scheduling and background tasks"""

import discord
from discord.ext import commands, tasks
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging
from datetime import datetime, timedelta, timezone
from config import DAILY_CHECKIN_TIME, TIMEZONE, INACTIVITY_THRESHOLD_DAYS
from api_client import api_client
from utils import (
    get_project_id_for_guild,
    get_inactive_users,
    get_verified_users,
    get_member_id_for_discord_user
)

logger = logging.getLogger(__name__)

class Scheduler(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.scheduler = None
        self.initialized = False

    async def cog_load(self):
        """Start the scheduler"""
        if self.initialized:
            return

        self.scheduler = AsyncIOScheduler()

        # Parse DAILY_CHECKIN_TIME (format: HH:MM)
        hour, minute = map(int, DAILY_CHECKIN_TIME.split(":"))

        # Schedule daily check-in
        self.scheduler.add_job(
            self.daily_checkin,
            CronTrigger(hour=hour, minute=minute, timezone=TIMEZONE),
            id="daily_checkin"
        )

        # Schedule inactivity check (every 2 hours)
        self.scheduler.add_job(
            self.check_inactivity,
            CronTrigger(hour="*/2", timezone=TIMEZONE),
            id="inactivity_check"
        )

        self.scheduler.start()
        self.initialized = True
        logger.info("Scheduler started")

    async def cog_unload(self):
        """Stop the scheduler"""
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown()

    async def daily_checkin(self):
        """Check if group has been silent and ask for progress"""
        logger.info("Running daily check-in")

        for guild in self.bot.guilds:
            try:
                project_id = await get_project_id_for_guild(guild.id)
                if not project_id:
                    continue

                # Get all verified users in guild
                verified_user_ids = await get_verified_users(guild.id)
                if not verified_user_ids:
                    continue

                # Check for channel activity (simplified: look for recent messages from verified users)
                has_recent_activity = False
                cutoff_time = datetime.now(timezone.utc) - timedelta(hours=4)

                for channel in guild.text_channels:
                    try:
                        async for message in channel.history(after=cutoff_time, limit=50):
                            if message.author.id in verified_user_ids and not message.author.bot:
                                has_recent_activity = True
                                break
                    except:
                        pass

                    if has_recent_activity:
                        break

                # If silent, ask for progress
                if not has_recent_activity:
                    embed = discord.Embed(
                        title="📊 Daily Check-in",
                        description="Hey team! 👋 We haven't heard from anyone in a while. How's progress looking?",
                        color=discord.Color.orange()
                    )
                    embed.add_field(
                        name="Quick Update",
                        value="📋 `/my-tasks` — See your assignments\n"
                              "📈 `/update-progress` — Share wins! 🎯\n"
                              "💬 Or just post a quick status update here",
                        inline=False
                    )
                    embed.set_footer(text="We're just making sure everyone's on track! ✨")

                    # Find a general channel or use the first text channel
                    target_channel = discord.utils.find(
                        lambda c: c.name in ["general", "progress", "status"],
                        guild.text_channels
                    ) or guild.text_channels[0]

                    if target_channel and target_channel.permissions_for(guild.me).send_messages:
                        await target_channel.send(embed=embed)

            except Exception as e:
                logger.error(f"Error in daily check-in for guild {guild.id}: {e}")

    async def check_inactivity(self):
        """Check for inactive users and report to risk agent"""
        logger.info("Running inactivity check")

        for guild in self.bot.guilds:
            try:
                project_id = await get_project_id_for_guild(guild.id)
                if not project_id:
                    continue

                inactive_users = await get_inactive_users(guild.id, INACTIVITY_THRESHOLD_DAYS)
                if not inactive_users:
                    continue

                # Log inactive users to API for risk detection
                for user_data in inactive_users:
                    try:
                        discord_user_id = user_data["discord_user_id"]
                        member_id = user_data["member_id"]

                        # You can call an API endpoint to log this
                        # For now, we'll just log it
                        logger.warning(
                            f"Inactive user detected: "
                            f"Discord={discord_user_id}, Member={member_id}, "
                            f"Project={project_id}, "
                            f"Last activity={user_data['last_activity_at']}"
                        )

                        # TODO: Call API endpoint to record inactive user for risk detection
                        # await api_client.report_inactivity(member_id, project_id)

                    except Exception as e:
                        logger.error(f"Error processing inactive user: {e}")

            except Exception as e:
                logger.error(f"Error in inactivity check for guild {guild.id}: {e}")

    @discord.app_commands.command(
        name="progress-report",
        description="View group's overall progress"
    )
    async def progress_report(self, interaction: discord.Interaction):
        """Show overall project progress"""
        await interaction.response.defer()

        try:
            project_id = await get_project_id_for_guild(interaction.guild_id)
            if not project_id:
                await interaction.followup.send(
                    "⚠️ No project synced yet! Ask an admin to set one up first.",
                    ephemeral=True
                )
                return

            tasks = await api_client.get_tasks(project_id)

            if not tasks:
                await interaction.followup.send(
                    "📭 No tasks in this project yet. Add some to get started!",
                    ephemeral=True
                )
                return

            # Calculate progress
            total_tasks = len(tasks)
            done_tasks = sum(1 for t in tasks if t.get("status") == "done")
            in_progress = sum(1 for t in tasks if t.get("status") == "in_progress")
            pending = sum(1 for t in tasks if t.get("status") == "pending")

            avg_completion = sum(t.get("completion_pct", 0) for t in tasks) / total_tasks if total_tasks > 0 else 0

            embed = discord.Embed(
                title="📊 Team Progress Report",
                description="Here's how the team is crushing it! 💪",
                color=discord.Color.green()
            )

            embed.add_field(
                name="📈 Task Breakdown",
                value=f"✅ **Done**: {done_tasks}\n⏳ **In Progress**: {in_progress}\n📋 **Pending**: {pending}\n📦 **Total**: {total_tasks}",
                inline=False
            )

            embed.add_field(
                name="🎯 Overall Completion",
                value=f"**{avg_completion:.1f}%**",
                inline=True
            )

            # Progress bar
            filled = int(avg_completion / 10)
            bar = "█" * filled + "░" * (10 - filled)
            embed.add_field(
                name="Progress",
                value=f"`{bar}` {avg_completion:.0f}%",
                inline=False
            )

            embed.set_footer(text="Keep pushing! Every task completed is progress! 🚀")

            await interaction.followup.send(embed=embed)

        except Exception as e:
            await interaction.followup.send(
                f"😕 Couldn't generate the report: {str(e)}\n"
                f"Try again in a moment!",
                ephemeral=True
            )


async def setup(bot):
    await bot.add_cog(Scheduler(bot))
