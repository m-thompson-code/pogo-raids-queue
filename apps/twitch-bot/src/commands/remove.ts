import { sendChatMessage } from '../api/chat.js';
import { messages } from '../messages.js';
import { unmarkInQueueByPogoUsername, isFirestoreListenerActive } from '../detectables/shared.js';
import { queue } from '../providers/queue.js';
import type { ChatMessageEvent } from '../types.js';

export const handleRemoveCommand = async (
  event: ChatMessageEvent
): Promise<void> => {
  const parts = event.message.text.trim().split(/\s+/);
  const pogoUsername = parts[1];

  if (!pogoUsername) {
    await sendChatMessage(messages.removeUsage(event.chatter_user_login));
    return;
  }

  let removed: boolean;
  try {
    removed = await queue.removeByPogoUsername(pogoUsername);
    if (removed && !isFirestoreListenerActive()) unmarkInQueueByPogoUsername(pogoUsername);
  } catch {
    removed = false;
    unmarkInQueueByPogoUsername(pogoUsername);
  }

  if (removed) {
    await sendChatMessage(messages.removeSuccess(pogoUsername));
  } else {
    await sendChatMessage(messages.removeNotFound(pogoUsername));
  }
};
