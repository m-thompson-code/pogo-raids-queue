import { sendChatMessage } from '../api/chat.js';
import { messages } from '../messages.js';
import { queue } from '../providers/queue.js';
import type { ChatMessageEvent } from '../types.js';

const GROUP_SIZE = 5;

/**
 * Handles the `!groups` chat command.
 *
 * Like `!list` but formats the queue as groups of 5, separated by " — ".
 * Example: "GroupA1,GroupA2,GroupA3,GroupA4,GroupA5 — GroupB1,GroupB2..."
 */
export const handleGroupsCommand = async (
  _event: ChatMessageEvent
): Promise<void> => {
  const entries = await queue.getQueue();

  if (entries.length === 0) {
    await sendChatMessage(messages.listEmpty());
    return;
  }

  const names = entries.map((entry) => entry.pogoUsername);
  const groups: string[] = [];

  for (let i = 0; i < names.length; i += GROUP_SIZE) {
    groups.push(names.slice(i, i + GROUP_SIZE).join(', '));
  }

  await sendChatMessage(groups.join(' — '));
};
