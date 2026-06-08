import { sendChatMessage } from '../chat.js';
import { messages } from '../messages.js';
import { setSpamWindow } from '../spam-detection.js';
import type { ChatMessageEvent } from '../types.js';

/**
 * Handles `!spamwindow <seconds>`.
 * Sets the spam-detection sliding window. 0 disables spam detection.
 */
export const handleSpamWindowCommand = async (
  event: ChatMessageEvent
): Promise<void> => {
  const parts = event.message.text.trim().split(/\s+/);
  const raw = parts[1]?.trim();
  const seconds = raw !== undefined ? parseInt(raw, 10) : NaN;

  if (isNaN(seconds) || seconds < 0) {
    await sendChatMessage(
      `@${event.chatter_user_login} Usage: !spamwindow <seconds> (0 = off)`
    );
    return;
  }

  setSpamWindow(seconds * 1000);
  await sendChatMessage(messages.spamWindowSet(event.chatter_user_login, seconds));
};
