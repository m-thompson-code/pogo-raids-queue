import { sendChatMessage } from '../chat.js';
import type { QueueProvider } from '../providers/queue-provider.js';
import type { ChatMessageEvent } from '../types.js';

export const handleRemoveCommand = async (
  event: ChatMessageEvent,
  provider: QueueProvider
): Promise<void> => {
  const parts = event.message.text.trim().split(/\s+/);
  const pogoUsername = parts[1];
  const chatter = `@${event.chatter_user_login}`;

  if (!pogoUsername) {
    await sendChatMessage(`${chatter} Usage: !remove <pogo_username>`);
    return;
  }

  const removed = await provider.removeByPogoUsername(pogoUsername);

  if (removed) {
    await sendChatMessage(`${pogoUsername} has been removed from the queue.`);
  } else {
    await sendChatMessage(`${pogoUsername} was not found in the queue.`);
  }
};
