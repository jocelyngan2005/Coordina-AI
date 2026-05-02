"""Cog for project setup and synchronization"""

import discord
from discord.ext import commands
from api_client import api_client
from utils import (
    set_guild_project,
    get_project_id_for_guild,
    store_setup_progress_message,
    get_setup_progress_message,
    get_verified_member_ids
)

class ProjectSetup(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @discord.app_commands.command(
        name="sync-project",
        description="Set which project this server is working on"
    )
    async def sync_project(self, interaction: discord.Interaction):
        """Select a project for the server"""
        try:
            projects = await api_client.get_projects()

            if not projects:
                await interaction.response.send_message(
                    "😔 Hmm, no projects found in the system yet.\n"
                    "Ask your admin to create a project first!",
                    ephemeral=True
                )
                return

            # Create select options
            options = [
                discord.SelectOption(label=p.get("name", "Unnamed"), value=p.get("id"))
                for p in projects[:25]  # Discord limit
            ]

            # Create view with select menu
            class ProjectSelect(discord.ui.View):
                def __init__(self, cog):
                    super().__init__()
                    self.cog = cog

                @discord.ui.select(
                    placeholder="Choose a project...",
                    options=options,
                    min_values=1,
                    max_values=1
                )
                async def project_select(self, select_interaction: discord.Interaction, select: discord.ui.Select):
                    project_id = select.values[0]
                    await set_guild_project(interaction.guild_id, project_id)

                    # Fetch project details
                    project = await api_client.get_project(project_id)
                    members = await api_client.get_project_members(project_id)

                    # Build tracking embed
                    member_list = ""
                    for member in members:
                        member_list += f"⏳ {member.get('name', 'Unnamed')}\n"

                    embed = discord.Embed(
                        title=f"👥 {project.get('name')} — Team Member Setup",
                        description=f"**{len(members)} members** total. Everyone pick your profile below! 🚀",
                        color=discord.Color.blue()
                    )
                    embed.add_field(
                        name="Status",
                        value=member_list if member_list else "No members yet",
                        inline=False
                    )
                    embed.set_footer(text=f"⏳ {len(members)} member(s) need to pick their profile")

                    # Show member selection dropdown with tracking embed
                    if members:
                        member_options = [
                            discord.SelectOption(label=m.get("name", "Unnamed"), value=m.get("id"))
                            for m in members[:25]
                        ]
                        from cogs.views import MemberSelect
                        role_view = MemberSelect(member_options, self.cog.bot, interaction.guild_id, project_id)

                        # Post tracking message with dropdown attached
                        tracking_msg = await select_interaction.channel.send(embed=embed, view=role_view)
                        await store_setup_progress_message(
                            interaction.guild_id,
                            project_id,
                            tracking_msg.id,
                            select_interaction.channel_id
                        )

                    await select_interaction.response.defer()

            view = ProjectSelect(self)
            await interaction.response.send_message(
                "🎯 **Project Setup** — Pick the project you're working on:\n"
                "(Only admins can do this, so choose wisely!)",
                view=view,
                ephemeral=False
            )

        except Exception as e:
            await interaction.response.send_message(
                f"😕 Oops! Had trouble syncing: {str(e)}\n"
                f"Contact your admin if this keeps happening.",
                ephemeral=True
            )

    @discord.app_commands.command(
        name="current-project",
        description="Show the current project for this server"
    )
    async def current_project(self, interaction: discord.Interaction):
        """Show current project"""
        try:
            project_id = await get_project_id_for_guild(interaction.guild_id)

            if not project_id:
                await interaction.response.send_message(
                    "⚠️ No project synced yet! Ask an admin to run `/sync-project` first.",
                    ephemeral=True
                )
                return

            project = await api_client.get_project(project_id)
            embed = discord.Embed(
                title="📌 Your Current Project",
                description=project.get("description", "No description yet"),
                color=discord.Color.blue()
            )
            embed.add_field(name="🎯 Name", value=project.get("name"), inline=False)
            embed.add_field(name="📊 Status", value=project.get("status", "Unknown"), inline=True)
            embed.add_field(name="👥 Team Size", value=str(project.get("team_size", "N/A")) + " members", inline=True)

            await interaction.response.send_message(embed=embed, ephemeral=True)

        except Exception as e:
            await interaction.response.send_message(
                f"😕 Couldn't fetch project info: {str(e)}\n"
                f"Try again in a moment!",
                ephemeral=True
            )


async def setup(bot):
    await bot.add_cog(ProjectSetup(bot))
