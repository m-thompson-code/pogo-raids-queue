import { sendChatMessage } from '../api/chat.js';
import { messages } from '../messages.js';
import type { QueueProvider } from '../providers/queue-provider.js';
import type { ChatMessageEvent } from '../types.js';

const GROUP_SIZE = 5;

/**
 * Handles the `!groups` chat command.
 *
 * Like `!list` but formats the queue as groups of 5, separated by " — ".
 * Example: "GroupA1,GroupA2,GroupA3,GroupA4,GroupA5 — GroupB1,GroupB2..."
 */
export const handleGroupsCommand = async (
  _event: ChatMessageEvent,
  provider: QueueProvider
): Promise<void> => {
  const queue = await provider.getQueue();

  if (queue.length === 0) {
    await sendChatMessage(messages.listEmpty());
    return;
  }

  const names = queue.map((entry) => entry.pogoUsername);
  const groups: string[] = [];

  for (let i = 0; i < names.length; i += GROUP_SIZE) {
    groups.push(names.slice(i, i + GROUP_SIZE).join(', '));
  }

  await sendChatMessage(groups.join(' — '));
};
