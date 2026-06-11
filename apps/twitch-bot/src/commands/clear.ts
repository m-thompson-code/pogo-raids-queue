import { sendChatMessage } from '../api/chat.js';
import { messages } from '../messages.js';
import { clearQueueMemory, isFirestoreListenerActive } from '../detectables/shared.js';
import { queue } from '../providers/queue.js';
import type { ChatMessageEvent } from '../types.js';

export const handleClearCommand = async (
  event: ChatMessageEvent
): Promise<void> => {
  try {
    await queue.clearQueue();
    if (!isFirestoreListenerActive()) clearQueueMemory();
  } catch {
    clearQueueMemory();
  }
  await sendChatMessage(messages.clearSuccess(event.chatter_user_login));
};
