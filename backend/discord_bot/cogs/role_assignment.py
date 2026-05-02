"""Cog for role assignment and user verification"""

import discord
from discord.ext import commands
from api_client import api_client
from utils import (
    get_project_id_for_guild,
    get_member_id_for_discord_user,
    map_discord_user,
    mark_user_verified,
    get_verified_users,
    get_verified_member_ids,
    store_setup_progress_message,
    get_setup_progress_message,
    get_member_name_for_id,
    filter_tasks_for_member,
    get_member_tasks,
)


class RoleAssignment(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def build_member_list_embed(self, guild_id: int, project_id: str, project_name: str, members: list):
        """Build the member tracking embed"""
        verified_member_ids = await get_verified_member_ids(guild_id)

        member_list = ""
        unverified_members = []

        for member in members:
            member_id = member.get("id")
            member_name = member.get("name", "Unnamed")

            if member_id in verified_member_ids:
                member_list += f"✅ {member_name}\n"
            else:
                member_list += f"⏳ {member_name}\n"
                unverified_members.append(member)

        embed = discord.Embed(
            title=f"👥 {project_name} — Team Member Setup",
            description=f"**{len(members)} members** in this project. Let's get everyone set up! 🚀",
            color=discord.Color.blue()
        )

        embed.add_field(
            name="Status",
            value=member_list if member_list else "No members yet",
            inline=False
        )

        remaining_count = len(unverified_members)
        if remaining_count > 0:
            embed.set_footer(
                text=f"⏳ {remaining_count} member(s) need to pick their profile"
            )
        else:
            embed.set_footer(text="✅ All members have been set up! Great work!")

        return embed, unverified_members

    @discord.app_commands.command(
        name="assign-role",
        description="Assign yourself a role in the project"
    )
    async def assign_role(self, interaction: discord.Interaction):
        """Assign user to a project member and role"""
        await interaction.response.defer()

        try:
            project_id = await get_project_id_for_guild(interaction.guild_id)
            if not project_id:
                await interaction.followup.send(
                    "⚠️ No project synced yet! Ask an admin to run `/sync-project` first.",
                    ephemeral=True
                )
                return

            # Get project info and members
            project = await api_client.get_project(project_id)
            members = await api_client.get_project_members(project_id)

            if not members:
                await interaction.followup.send(
                    "📭 No members found in this project yet. Ask your admin to add team members!",
                    ephemeral=True
                )
                return

            # Build the tracking embed
            embed, unverified = await self.build_member_list_embed(
                interaction.guild_id,
                project_id,
                project.get("name", "Project"),
                members
            )

            # Create member select options
            member_options = [
                discord.SelectOption(label=m.get("name", "Unnamed"), value=m.get("id"))
                for m in members[:25]
            ]

            from cogs.views import MemberSelect
            view = MemberSelect(member_options, self.bot, interaction.guild_id, project_id)

            # Check if tracking message already exists
            progress_data = await get_setup_progress_message(interaction.guild_id, project_id)

            if progress_data:
                # Update existing message
                message_id, channel_id = progress_data
                try:
                    channel = self.bot.get_channel(channel_id)
                    if channel:
                        message = await channel.fetch_message(message_id)
                        await message.edit(embed=embed)
                except:
                    # Message not found, create new one
                    msg = await interaction.channel.send(embed=embed)
                    await store_setup_progress_message(
                        interaction.guild_id,
                        project_id,
                        msg.id,
                        interaction.channel_id
                    )
            else:
                # Create new tracking message
                msg = await interaction.channel.send(embed=embed)
                await store_setup_progress_message(
                    interaction.guild_id,
                    project_id,
                    msg.id,
                    interaction.channel_id
                )

            # Send dropdown in a followup message
            await interaction.followup.send(
                "👤 **Pick your profile below to get started:**",
                view=view,
                ephemeral=False
            )

        except Exception as e:
            await interaction.followup.send(
                f"😕 Couldn't assign your role: {str(e)}\n"
                f"Try again or contact your admin!",
                ephemeral=True
            )

    @discord.app_commands.command(
        name="verify-all",
        description="(Admin) Notify all verified users about their tasks"
    )
    async def verify_all(self, interaction: discord.Interaction):
        """Notify all verified users of their tasks"""
        # Check if user is admin
        if not interaction.user.guild_permissions.administrator:
            await interaction.response.send_message(
                "👑 Only admins can use this command!",
                ephemeral=True
            )
            return

        try:
            project_id = await get_project_id_for_guild(interaction.guild_id)
            if not project_id:
                await interaction.response.send_message(
                    "⚠️ No project synced! Use `/sync-project` first.",
                    ephemeral=True
                )
                return

            verified_user_ids = await get_verified_users(interaction.guild_id)
            if not verified_user_ids:
                await interaction.response.send_message(
                    "📭 No verified users yet. Have team members use `/assign-role` first!",
                    ephemeral=True
                )
                return

            await interaction.response.defer(ephemeral=True)

            # Send DM to each verified user with their tasks
            notified = 0
            for discord_user_id in verified_user_ids:
                try:
                    member_id = await get_member_id_for_discord_user(interaction.guild_id, discord_user_id)
                    if not member_id:
                        continue

                    user = await self.bot.fetch_user(discord_user_id)

                    # Fetch tasks assigned to this member (UUID / name / M-label)
                    user_tasks = await get_member_tasks(project_id, member_id)

                    if user_tasks:
                        embed = discord.Embed(
                            title="📋 Your Assigned Tasks",
                            description=f"You've got {len(user_tasks)} task(s) to tackle! 💪",
                            color=discord.Color.green()
                        )
                        for task in user_tasks:
                            status_emoji = {
                                "done": "✅",
                                "in_progress": "⏳",
                                "pending": "📋",
                                "backlog": "📦"
                            }.get(task.get("status"), "❓")

                            embed.add_field(
                                name=task.get("title", "Untitled"),
                                value=f"{status_emoji} **Status**: {task.get('status', 'unknown')}\n"
                                      f"🎯 **Priority**: {task.get('priority', 'medium')}\n",
                                inline=False
                            )
                        embed.set_footer(text="Use /my-tasks in the server to see full details! 📊")
                        await user.send(embed=embed)
                        notified += 1
                except:
                    pass

            await interaction.followup.send(
                f"📧 **Notified {notified} team members!**\n"
                f"They've received their task assignments via DM. Let's go! 🚀",
                ephemeral=True
            )

        except Exception as e:
            await interaction.followup.send(
                f"😕 Couldn't send notifications: {str(e)}\n"
                f"Try again in a moment!",
                ephemeral=True
            )


async def setup(bot):
    await bot.add_cog(RoleAssignment(bot))
