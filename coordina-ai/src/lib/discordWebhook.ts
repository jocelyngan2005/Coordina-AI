/** Posts a plain-text message to a Discord channel via an incoming webhook.
 *
 * Set VITE_DISCORD_WEBHOOK_URL in your .env file to enable.
 * If the variable is absent the call is a no-op (safe for local dev without Discord).
 *
 * Discord's webhook endpoint allows cross-origin requests from browsers, so no
 * backend proxy is required.
 */
export async function sendDiscordMessage(content: string): Promise<void> {
  const webhookUrl = import.meta.env.VITE_DISCORD_WEBHOOK_URL as string | undefined;

  if (!webhookUrl) {
    console.warn(
      '[Discord] VITE_DISCORD_WEBHOOK_URL is not set — webhook call skipped.',
    );
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      console.error(`[Discord] Webhook returned ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error('[Discord] Webhook request failed:', err);
  }
}
