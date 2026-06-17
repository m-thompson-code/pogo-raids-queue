import { sendChatMessage } from '../api/chat.js';
import { setStrictMode, isStrictMode } from '../persisted-settings.js';
import type { ChatMessageEvent } from '../types.js';

/**
 * Handles the `!strict` command (privileged only).
 *
 * Usage:
 *   !strict on   — enables strict mode (duplicate !raid triggers strikes/timeout)
 *   !strict off  — disables strict mode (duplicate !raid shows a simple notice)
 */
export const handleStrictCommand = async (event: ChatMessageEvent): Promise<void> => {
  const parts = event.message.text.trim().split(/\s+/);
  const arg = parts[1]?.toLowerCase();

  if (arg !== 'on' && arg !== 'off') {
    await sendChatMessage(`@${event.chatter_user_login} Usage: !strict <on|off>. Currently: ${isStrictMode() ? 'on' : 'off'}.`);
    return;
  }

  const enable = arg === 'on';
  setStrictMode(enable);
  await sendChatMessage(`@${event.chatter_user_login} Strict mode is now ${enable ? 'on' : 'off'}.`);
};
