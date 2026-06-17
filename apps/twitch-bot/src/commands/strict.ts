import { sendChatMessage } from '../api/chat.js';
import { setStrictMode, isStrictMode } from '../persisted-settings.js';
import { setUiStrictMode } from '@pogo-raid-system/firebase';
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
  try {
    await setUiStrictMode(enable);
  } catch (error) {
    // Keep local bot behavior correct even if Firestore write fails.
    console.error('Failed to sync strict mode to settings/ui:', error);
  }
  await sendChatMessage(`@${event.chatter_user_login} Strict mode is now ${enable ? 'on' : 'off'}.`);
};
