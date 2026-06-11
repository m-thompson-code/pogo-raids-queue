import { sendChatMessage } from '../api/chat.js';
import { setHintCooldownSeconds } from '../persisted-settings.js';
import type { ChatMessageEvent } from '../types.js';

/**
 * Handles the `!hintcooldown <seconds>` command.
 * Sets how long (in seconds) before the same user gets hinted again.
 */
export const handleHintCooldownCommand = async (
  event: ChatMessageEvent
): Promise<void> => {
  const parts = event.message.text.trim().split(/\s+/);
  const raw = parts[1]?.trim();
  const seconds = raw !== undefined ? parseInt(raw, 10) : NaN;

  if (isNaN(seconds) || seconds < 0) {
    await sendChatMessage(
      `@${event.chatter_user_login} Usage: !hintcooldown <seconds>`
    );
    return;
  }

  setHintCooldownSeconds(seconds);
  await sendChatMessage(
    `@${event.chatter_user_login} Hint cooldown set to ${seconds} second${seconds === 1 ? '' : 's'}.`
  );
};
