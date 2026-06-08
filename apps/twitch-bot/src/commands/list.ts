import { sendChatMessage } from '../chat.js';
import type { QueueProvider } from '../providers/queue-provider.js';
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
  event: ChatMessageEvent,
  provider: QueueProvider
): Promise<void> => {
  const queue = await provider.getQueue();

  if (queue.length === 0) {
    await sendChatMessage(`The queue is empty`);
    return;
  }

  const names = queue.map((entry) => entry.pogoUsername).join(',');
  await sendChatMessage(names);
};
