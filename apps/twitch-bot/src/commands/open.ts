import { sendChatMessage } from '../chat.js';
import { messages } from '../messages.js';
import { openQueue } from '../queue-state.js';
import type { QueueProvider } from '../providers/queue-provider.js';
import type { ChatMessageEvent } from '../types.js';

/**
 * Handles the `!open` chat command.
 *
 * Marks the raid queue as open so users can join via `!raid`.
 * Replies in chat confirming the queue is open.
 *
 * @param event    - The `channel.chat.message` event
 * @param provider - Unused directly but kept consistent with other command signatures
 */
export const handleOpenCommand = async (
  event: ChatMessageEvent,
  _provider: QueueProvider
): Promise<void> => {
  openQueue();
  await sendChatMessage(messages.openSuccess(event.chatter_user_login));
};
