import { sendChatMessage } from '../api/chat.js';
import { messages } from '../messages.js';
import { queue } from '../providers/queue.js';
import type { ChatMessageEvent } from '../types.js';

/**
 * Handles the `!list` chat command.
 *
 * Fetches the current raid queue ordered by `joinedAt` and posts the pogo
 * usernames in a single chat message. If the queue is empty, says so.
 *
 * @param event    - The `channel.chat.message` event
 * @param provider - The queue provider to read from
 */
export const handleListCommand = async (
  event: ChatMessageEvent
): Promise<void> => {
  const entries = await queue.getQueue();

  if (entries.length === 0) {
    await sendChatMessage(messages.listEmpty());
    return;
  }

  const names = entries.map((entry) => entry.pogoUsername).join(',');
  await sendChatMessage(names);
};
