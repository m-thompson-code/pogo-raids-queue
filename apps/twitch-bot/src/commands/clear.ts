import { sendChatMessage } from '../api/chat.js';
import { messages } from '../messages.js';
import { clearQueueMemory } from '../detectables/shared.js';
import { queue } from '../providers/queue.js';
import type { ChatMessageEvent } from '../types.js';

export const handleClearCommand = async (
  event: ChatMessageEvent
): Promise<void> => {
  try {
    await queue.clearQueue();
  } catch {
    // Continue even if Firestore clear fails
  }
  clearQueueMemory();
  await sendChatMessage(messages.clearSuccess(event.chatter_user_login));
};
