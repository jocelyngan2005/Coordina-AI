"""Cog for welcome and onboarding"""

import discord
from discord.ext import commands

class Welcome(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_guild_join(self, guild: discord.Guild):
        """Send welcome message when bot joins a server"""
        # Try to find a general or first text channel
        target_channel = discord.utils.find(
            lambda c: c.name in ["general", "announcements", "welcome"],
            guild.text_channels
        ) or (guild.text_channels[0] if guild.text_channels else None)

        if not target_channel or not target_channel.permissions_for(guild.me).send_messages:
            return

        embed = discord.Embed(
            title="👋 Welcome to Coordina-AI Bot",
            description="✨ Your personal project coordination assistant is here! Let's keep your team synced and crushing goals together.",
            color=discord.Color.blue()
        )

        embed.add_field(
            name="🚀 Quick Setup (2 minutes)",
            value="**Admins** 👑\n1. `/sync-project` — Connect your server to a project\n2. `/verify-all` — Send invites to your team\n\n**Everyone else** 💪\n1. `/assign-role` — Tell us who you are\n2. `/my-tasks` — See what's on your plate",
            inline=False
        )

        embed.add_field(
            name="📋 Essential Commands",
            value="`/my-tasks` — Your task list\n"
                  "`/update-progress` — Share your wins 🎯\n"
                  "`/mark-complete` — Finish strong ✅\n"
                  "`/progress-report` — Team overview 📊",
            inline=False
        )

        embed.add_field(
            name="🤖 We've Got Your Back",
            value="✓ Daily reminders keep everyone on track\n"
                  "✓ Automatic activity tracking\n"
                  "✓ Real-time updates to your project\n"
                  "✓ Spotlights inactive members (gently!)",
            inline=False
        )

        embed.set_footer(
            text="Need help? Type /help anytime • Let's make great things happen! 🎉"
        )

        try:
            await target_channel.send(embed=embed)
        except Exception as e:
            print(f"Failed to send welcome message: {e}")

    @discord.app_commands.command(
        name="help",
        description="Show all available commands and how to use them"
    )
    async def help_command(self, interaction: discord.Interaction):
        """Show help message"""
        embed = discord.Embed(
            title="📚 Coordina-AI Bot Help",
            description="Master these commands to keep your project humming! 🎯",
            color=discord.Color.blue()
        )

        embed.add_field(
            name="👑 For Admins",
            value="`/sync-project` — Pick your project (one-time setup!)\n"
                  "`/current-project` — See what you're working on\n"
                  "`/verify-all` — Invite your whole team",
            inline=False
        )

        embed.add_field(
            name="💪 For Everyone",
            value="`/assign-role` — Connect your Discord to your profile\n"
                  "`/my-tasks` — See your assignments & deadlines\n"
                  "`/update-progress` — Share your progress (0-100%)\n"
                  "`/mark-complete` — Celebrate finishing tasks! 🎉",
            inline=False
        )

        embed.add_field(
            name="📊 Team Insights",
            value="`/progress-report` — See the big picture\n"
                  "  • Tasks done vs pending\n"
                  "  • Team completion %\n"
                  "  • Visual progress bar",
            inline=False
        )

        embed.add_field(
            name="🤖 Automated Goodness",
            value="**Daily at 10pm** → \"How's it going?\" check-in\n"
                  "**Every 2 hours** → Spotlights anyone quiet for 2+ days\n"
                  "**Real-time** → All updates sync instantly",
            inline=False
        )

        embed.add_field(
            name="💡 Pro Tips",
            value="✓ Use task names (case-insensitive) or task IDs\n"
                  "✓ `mark-complete` = `/update-progress 100`\n"
                  "✓ All progress updates = instant risk alerts",
            inline=False
        )

        embed.set_footer(text="Questions? We're here to help! Type a command for details 💬")

        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot):
    await bot.add_cog(Welcome(bot))
