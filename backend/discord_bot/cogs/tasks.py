"""Cog for task management commands"""

import discord
from discord.ext import commands
from utils import (
    get_project_id_for_guild,
    get_member_id_for_discord_user,
    update_user_activity,
    get_tasks_for_project,
    update_task_in_db,
    get_member_name_for_id,
    filter_tasks_for_member,
    get_member_tasks,
)

class Tasks(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @discord.app_commands.command(
        name="my-tasks",
        description="View your assigned tasks"
    )
    async def my_tasks(self, interaction: discord.Interaction):
        """Show user's assigned tasks"""
        await interaction.response.defer()

        try:
            project_id = await get_project_id_for_guild(interaction.guild_id)
            if not project_id:
                await interaction.followup.send(
                    "⚠️ No project synced! Ask an admin to run `/sync-project` first.",
                    ephemeral=True
                )
                return

            member_id = await get_member_id_for_discord_user(interaction.guild_id, interaction.user.id)
            if not member_id:
                await interaction.followup.send(
                    "🙋 You haven't set up your profile yet! Use `/assign-role` to get started.",
                    ephemeral=True
                )
                return

            # Update activity
            await update_user_activity(interaction.guild_id, interaction.user.id)

            # Fetch tasks assigned to this member (resolves UUID / name / M1-label)
            user_tasks = await get_member_tasks(project_id, member_id)

            if not user_tasks:
                await interaction.followup.send(
                    "✨ You're all caught up! No tasks assigned right now.\n"
                    "Check back later or ask your admin to assign you some work! 📋",
                    ephemeral=True
                )
                return

            embed = discord.Embed(
                title="📋 Your Task List",
                description=f"You've got {len(user_tasks)} task(s) to tackle! 💪",
                color=discord.Color.blue()
            )

            for task in user_tasks:
                status_emoji = {
                    "done": "✅",
                    "in_progress": "⏳",
                    "pending": "📋",
                    "backlog": "📦"
                }.get(task.get("status"), "❓")

                field_value = (
                    f"{status_emoji} {task.get('status', 'unknown').upper()}\n"
                    f"🎯 **Priority**: {task.get('priority', 'medium').title()}\n"
                    f"📊 **Progress**: {task.get('completion_pct', 0)}%"
                )

                if task.get("due_date"):
                    field_value += f"\n⏰ **Due**: {task.get('due_date')}"

                embed.add_field(
                    name=task.get("title", "Untitled"),
                    value=field_value,
                    inline=False
                )

            await interaction.followup.send(embed=embed, ephemeral=True)

        except Exception as e:
            await interaction.followup.send(
                f"😕 Couldn't load your tasks: {str(e)}\n"
                f"Try again in a moment!",
                ephemeral=True
            )

    @discord.app_commands.command(
        name="mark-complete",
        description="Mark a task as complete"
    )
    @discord.app_commands.describe(task_name="The name or ID of the task")
    async def mark_complete(self, interaction: discord.Interaction, task_name: str):
        """Mark a task as done"""
        await interaction.response.defer()

        try:
            project_id = await get_project_id_for_guild(interaction.guild_id)
            if not project_id:
                await interaction.followup.send(
                    "⚠️ No project synced! Ask an admin to run `/sync-project` first.",
                    ephemeral=True
                )
                return

            member_id = await get_member_id_for_discord_user(interaction.guild_id, interaction.user.id)
            if not member_id:
                await interaction.followup.send(
                    "🙋 You need to set up your profile first! Use `/assign-role`.",
                    ephemeral=True
                )
                return

            # Get all tasks and resolve member identity for assignment matching
            tasks = await get_member_tasks(project_id, member_id)

            # Find task by title or ID
            task = None
            task_name_lower = task_name.lower()
            for t in tasks:
                if task_name_lower in t.get("title", "").lower() or task_name == t.get("id"):
                    task = t
                    break

            if not task:
                await interaction.followup.send(
                    f"🔍 Couldn't find a task matching '{task_name}'.\n"
                    f"Try `/my-tasks` to see the exact names!",
                    ephemeral=True
                )
                return


            # Update task status in database
            await update_task_in_db(task.get("id"), {
                "status": "done",
                "completion_pct": 100,
                "assignee_id": member_id
            })

            # Update activity
            await update_user_activity(interaction.guild_id, interaction.user.id)

            await interaction.followup.send(
                f"🎉 **YES!** Task **{task.get('title')}** is DONE! 🚀\n"
                f"Great work crushing that task! Keep the momentum going! 💪",
                ephemeral=True
            )

        except Exception as e:
            await interaction.followup.send(
                f"😕 Couldn't mark that task complete: {str(e)}\n"
                f"Try again in a moment!",
                ephemeral=True
            )

    @discord.app_commands.command(
        name="update-progress",
        description="Update progress on a task"
    )
    @discord.app_commands.describe(
        task_name="The name or ID of the task",
        progress="Completion percentage (0-100)"
    )
    async def update_progress(self, interaction: discord.Interaction, task_name: str, progress: int):
        """Update task progress"""
        await interaction.response.defer()

        try:
            if progress < 0 or progress > 100:
                await interaction.followup.send(
                    "⚠️ Progress must be between 0-100%. Try again!",
                    ephemeral=True
                )
                return

            project_id = await get_project_id_for_guild(interaction.guild_id)
            if not project_id:
                await interaction.followup.send(
                    "⚠️ No project synced! Ask an admin to run `/sync-project` first.",
                    ephemeral=True
                )
                return

            member_id = await get_member_id_for_discord_user(interaction.guild_id, interaction.user.id)
            if not member_id:
                await interaction.followup.send(
                    "🙋 You need to set up your profile first! Use `/assign-role`.",
                    ephemeral=True
                )
                return

            tasks = await get_tasks_for_project(project_id)
            member_name = await get_member_name_for_id(member_id)

            task = None
            task_name_lower = task_name.lower()
            for t in tasks:
                if task_name_lower in t.get("title", "").lower() or task_name == t.get("id"):
                    task = t
                    break

            if not task:
                await interaction.followup.send(
                    f"🔍 Couldn't find a task matching '{task_name}'.\n"
                    f"Try `/my-tasks` to see the exact names!",
                    ephemeral=True
                )
                return

            # Check if user is assigned (UUID, name, or M-label)
            user_tasks_check = await get_member_tasks(project_id, member_id)
            assigned_ids = {t.get("id") for t in user_tasks_check}
            if task.get("id") not in assigned_ids:
                await interaction.followup.send(
                    "⛔ You're not assigned to this task!\n"
                    "Ask your admin to assign it to you if you need it.",
                    ephemeral=True
                )
                return

            # Determine status based on progress
            status = "done" if progress == 100 else "in_progress" if progress > 0 else "pending"

            await update_task_in_db(task.get("id"), {
                "status": status,
                "completion_pct": progress,
                "assignee_id": member_id
            })

            await update_user_activity(interaction.guild_id, interaction.user.id)

            await interaction.followup.send(
                f"✨ **{task.get('title')}** is now {progress}% complete!\n"
                f"Keep crushing it! 💪",
                ephemeral=True
            )

        except Exception as e:
            await interaction.followup.send(
                f"😕 Couldn't update progress: {str(e)}\n"
                f"Try again in a moment!",
                ephemeral=True
            )


async def setup(bot):
    await bot.add_cog(Tasks(bot))
