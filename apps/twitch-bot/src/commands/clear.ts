import { sendChatMessage } from '../chat.js';
import type { QueueProvider } from '../providers/queue-provider.js';
import type { ChatMessageEvent } from '../types.js';

/**
 * Handles the `!clear` chat command.
 *
 * Removes all entries from the raid queue and replies in chat confirming.
 *
 * @param event    - The `channel.chat.message` event
 * @param provider - The queue provider to clear
 */
export const handleClearCommand = async (
  event: ChatMessageEvent,
  provider: QueueProvider
): Promise<void> => {
  await provider.clearQueue();
  await sendChatMessage(
    `@${event.chatter_user_login} The raid queue has been cleared.`
  );
};
