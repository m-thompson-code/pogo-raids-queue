import { sendChatMessage } from '../chat.js';
import { messages } from '../messages.js';
import { isQueueOpen } from '../queue-state.js';
import { markRaidSuccess } from './hints.js';
import type { QueueProvider } from '../providers/queue-provider.js';
import type { ChatMessageEvent } from '../types.js';

/**
 * Handles the `!raid` chat command.
 *
 * Expected usage: `!raid <pogo_username>`
 *
 * On a valid command (pogo username provided):
 *   1. Upserts the user record, incrementing their raid count.
 *   2. Adds or updates their entry in the queue. If already present,
 *      updates profile fields only — `joinedAt` is preserved.
 *   3. Replies in chat mentioning the user.
 *
 * If the queue is closed or no pogo username is provided, replies with
 * the appropriate message.
 *
 * @param event    - The `channel.chat.message` event
 * @param provider - The queue provider to write to
 */
export const handleRaidCommand = async (
  event: ChatMessageEvent,
  provider: QueueProvider
): Promise<void> => {
  const parts = event.message.text.trim().split(/\s+/);
  // parts[0] = '!raid' (any casing), parts[1] = pogo username (optional, preserve original case)
  const pogoUsername = parts[1];

  if (!isQueueOpen()) {
    await sendChatMessage(messages.raidQueueClosed(event.chatter_user_login));
    return;
  }

  if (!pogoUsername) {
    await sendChatMessage(messages.raidMissingUsername(event.chatter_user_login));
    return;
  }

  if (!/^[a-zA-Z0-9]+$/.test(pogoUsername)) {
    await sendChatMessage(messages.raidInvalidUsername(event.chatter_user_login));
    return;
  }

  const raidParams = {
    twitchUserId: event.chatter_user_id,
    twitchUsername: event.chatter_user_login,
    pogoUsername,
    isSubscriber: event.badges.some((b) => b.set_id === 'subscriber'),
    isVip: event.badges.some((b) => b.set_id === 'vip'),
  };

  await Promise.all([provider.upsertUser(raidParams), provider.addToQueue(raidParams)]);

  markRaidSuccess(event.chatter_user_id);
  await sendChatMessage(messages.raidAdded(event.chatter_user_login));
};

