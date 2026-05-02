import discord
from api_client import api_client
from utils import (
    map_discord_user,
    mark_user_verified,
    get_setup_progress_message,
    get_project_id_for_guild,
    get_verified_member_ids,
    get_member_name_for_id,
    filter_tasks_for_member,
    get_member_tasks,
)


class MemberSelect(discord.ui.View):
    def __init__(self, member_options, bot=None, guild_id=None, project_id=None):
        super().__init__()
        self.bot = bot
        self.guild_id = guild_id
        self.project_id = project_id
        self.members_dict = {opt.value: opt.label for opt in member_options}

        select = discord.ui.Select(
            placeholder="Choose your project persona...",
            options=member_options,
            min_values=1,
            max_values=1
        )
        select.callback = self.member_select
        self.add_item(select)

    async def member_select(self, interaction: discord.Interaction):
        member_id = self.children[0].values[0]
        member_name = self.members_dict.get(member_id, "Unknown")

        discord_user_id = interaction.user.id
        guild_id = interaction.guild_id

        # Map Discord user to member
        await map_discord_user(guild_id, discord_user_id, member_id)

        # Mark as verified
        await mark_user_verified(guild_id, discord_user_id)

        # Get and display tasks in ephemeral message
        try:
            project_id = await get_project_id_for_guild(guild_id)
            if project_id:
                # Fetch tasks assigned to this member (UUID / name / M-label)
                user_tasks = await get_member_tasks(project_id, member_id)

                # Build response embed with tasks
                embed = discord.Embed(
                    title=f"✅ Profile Linked: {member_name}",
                    description="Here are your assigned tasks:",
                    color=discord.Color.green()
                )

                if user_tasks:
                    for task in user_tasks:
                        status_emoji = {
                            "done": "✅",
                            "in_progress": "⏳",
                            "pending": "📋",
                            "backlog": "📦"
                        }.get(task.get("status"), "❓")

                        field_value = (
                            f"{status_emoji} **Status**: {task.get('status', 'unknown')}\n"
                            f"🎯 **Priority**: {task.get('priority', 'medium')}\n"
                            f"📊 **Progress**: {task.get('completion_pct', 0)}%"
                        )

                        if task.get("due_date"):
                            field_value += f"\n⏰ **Due**: {task.get('due_date')}"

                        embed.add_field(
                            name=task.get("title", "Untitled"),
                            value=field_value,
                            inline=False
                        )
                else:
                    embed.description = "No tasks assigned to you yet. Check back later!"

                embed.set_footer(text="Use /my-tasks to view details anytime 📋")
                await interaction.response.send_message(embed=embed, ephemeral=True)
            else:
                await interaction.response.send_message(
                    f"✅ Linked to: **{member_name}**",
                    ephemeral=True
                )
        except Exception as e:
            await interaction.response.send_message(
                f"✅ Linked to: **{member_name}**",
                ephemeral=True
            )
            print(f"Error fetching tasks: {e}")

        # Update tracking message
        if self.bot and self.guild_id and self.project_id:
            try:
                progress_data = await get_setup_progress_message(self.guild_id, self.project_id)
                if progress_data:
                    message_id, channel_id = progress_data
                    channel = self.bot.get_channel(channel_id)
                    if channel:
                        try:
                            message = await channel.fetch_message(message_id)

                            # Get current verified members
                            verified_member_ids = await get_verified_member_ids(self.guild_id)

                            # Get all members
                            project = await api_client.get_project(self.project_id)
                            members = await api_client.get_project_members(self.project_id)

                            # Build updated member list
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
                                title=f"👥 {project.get('name')} — Team Member Setup",
                                description=f"**{len(members)} members** total. Everyone pick your profile below! 🚀",
                                color=discord.Color.blue()
                            )
                            embed.add_field(
                                name="Status",
                                value=member_list if member_list else "No members yet",
                                inline=False
                            )

                            remaining_count = len(unverified_members)
                            if remaining_count > 0:
                                unverified_names = [m.get("name", "Unnamed") for m in unverified_members]
                                remaining_text = ", ".join(unverified_names)
                                embed.add_field(
                                    name=f"⏳ Waiting on ({remaining_count})",
                                    value=f"**{remaining_text}** — Your turn! 👇",
                                    inline=False
                                )
                                embed.set_footer(text=f"⏳ {remaining_count} member(s) still need to pick")
                            else:
                                embed.set_footer(text="✅ All members have been set up! Great work!")

                            await message.edit(embed=embed)

                            # Send mention message only if someone just picked
                            if remaining_count > 0:
                                unverified_names = [m.get("name", "Unnamed") for m in unverified_members]
                                remaining_text = ", ".join(unverified_names)
                                mention_message = (
                                    f"👉 {remaining_text} — Your turn to pick! ⬆️"
                                )
                                await message.reply(mention_message, mention_author=False)
                        except Exception as e:
                            print(f"Error updating tracking message: {e}")
            except Exception as e:
                print(f"Error in tracking update: {e}")
