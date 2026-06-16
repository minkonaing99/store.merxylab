/**
 * Telegram owner-alert helper.
 *
 * When TELEGRAM_BOT_TOKEN + TELEGRAM_OWNER_CHAT_ID are unset, this is a no-op.
 * Failures are swallowed so the caller's transactional success path is never blocked
 * by an external service outage.
 */

const API = 'https://api.telegram.org'

export async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID
  if (!token || !chatId) return

  try {
    await fetch(`${API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
  } catch {
    // Owner alert is best-effort; do not surface to caller.
  }
}
