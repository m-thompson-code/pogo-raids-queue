import { sendChatMessage } from '../chat.js';
import { messages } from '../messages.js';
import type { QueueProvider } from '../providers/queue-provider.js';
import type { ChatMessageEvent } from '../types.js';

export const handleLeaveCommand = async (
  event: ChatMessageEvent,
  provider: QueueProvider
): Promise<void> => {
  const pogoUsername = await provider.removeByTwitchId(event.chatter_user_id);
  await sendChatMessage(messages.leaveRemoved(pogoUsername ?? event.chatter_user_login));
};
