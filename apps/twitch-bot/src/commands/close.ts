import { sendChatMessage } from '../chat.js';
import { closeQueue } from '../queue-state.js';
import type { QueueProvider } from '../providers/queue-provider.js';
import type { ChatMessageEvent } from '../types.js';

/**
 * Handles the `!close` chat command.
 *
 * Marks the raid queue as closed so new `!raid` entries are rejected.
 * Replies in chat confirming the queue is closed.
 *
 * @param event    - The `channel.chat.message` event
 * @param provider - Unused directly but kept consistent with other command signatures
 */
export const handleCloseCommand = async (
  event: ChatMessageEvent,
  _provider: QueueProvider
): Promise<void> => {
  closeQueue();
  await sendChatMessage(
    `@${event.chatter_user_login} The raid queue is now closed.`
  );
};
