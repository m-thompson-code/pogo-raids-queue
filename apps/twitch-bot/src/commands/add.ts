import { sendChatMessage } from '../chat.js';
import type { QueueProvider } from '../providers/queue-provider.js';
import type { ChatMessageEvent } from '../types.js';

/**
 * Handles the `!add` chat command (privileged only).
 *
 * Expected usage: `!add <pogo_username>`
 *
 * Creates a manual queue entry with no associated Twitch account.
 * If the pogo username is already in the queue under a manual entry, it
 * is silently ignored (no duplicate). If no username is provided, a
 * usage reminder is sent.
 *
 * @param event    - The `channel.chat.message` event
 * @param provider - The queue provider to write to
 */
export const handleAddCommand = async (
  event: ChatMessageEvent,
  provider: QueueProvider
): Promise<void> => {
  const parts = event.message.text.trim().split(/\s+/);
  // parts[0] = '!add', rest joined and split by comma to support multiple usernames
  const rawArg = parts.slice(1).join('');
  const chatter = `@${event.chatter_user_login}`;

  if (!rawArg) {
    await sendChatMessage(`${chatter} Usage: !add <pogo_username>[,<pogo_username>...]`);
    return;
  }

  const usernames = rawArg.split(',').map((u) => u.trim()).filter(Boolean);

  await Promise.all(usernames.map((u) => provider.addManual(u)));

  const listed = usernames.join(', ');
  const noun = usernames.length === 1 ? 'has' : 'have';
  await sendChatMessage(`${chatter} ${listed} ${noun} been added to the queue.`);
};
