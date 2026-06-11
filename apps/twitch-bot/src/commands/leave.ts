import { sendChatMessage } from '../api/chat.js';
import { messages } from '../messages.js';
import { unmarkInQueueByTwitchId, isFirestoreListenerActive } from '../detectables/shared.js';
import { queue } from '../providers/queue.js';
import type { ChatMessageEvent } from '../types.js';

export const handleLeaveCommand = async (
  event: ChatMessageEvent
): Promise<void> => {
  let pogoUsername: string | null;
  try {
    pogoUsername = await queue.removeByTwitchId(event.chatter_user_id);
    if (!isFirestoreListenerActive()) unmarkInQueueByTwitchId(event.chatter_user_id);
  } catch {
    pogoUsername = null;
    unmarkInQueueByTwitchId(event.chatter_user_id);
  }
  await sendChatMessage(messages.leaveRemoved(pogoUsername ?? event.chatter_user_login));
};
