import { sendChatMessage } from '../chat.js';
import type { QueueProvider } from '../providers/queue-provider.js';
import type { ChatMessageEvent } from '../types.js';

export const handleLeaveCommand = async (
  event: ChatMessageEvent,
  provider: QueueProvider
): Promise<void> => {
  await provider.removeByTwitchId(event.chatter_user_id);
  await sendChatMessage(`@${event.chatter_user_login} has been removed from the queue.`);
};
