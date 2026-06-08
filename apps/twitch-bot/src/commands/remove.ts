import { sendChatMessage } from '../api/chat.js';
import { messages } from '../messages.js';
import type { QueueProvider } from '../providers/queue-provider.js';
import type { ChatMessageEvent } from '../types.js';

export const handleRemoveCommand = async (
  event: ChatMessageEvent,
  provider: QueueProvider
): Promise<void> => {
  const parts = event.message.text.trim().split(/\s+/);
  const pogoUsername = parts[1];

  if (!pogoUsername) {
    await sendChatMessage(messages.removeUsage(event.chatter_user_login));
    return;
  }

  const removed = await provider.removeByPogoUsername(pogoUsername);

  if (removed) {
    await sendChatMessage(messages.removeSuccess(pogoUsername));
  } else {
    await sendChatMessage(messages.removeNotFound(pogoUsername));
  }
};
