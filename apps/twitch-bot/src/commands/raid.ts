import { sendChatMessage } from '../chat.js';
import { isQueueOpen } from '../queue-state.js';
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
  const chatter = `@${event.chatter_user_login}`;

  if (!isQueueOpen()) {
    await sendChatMessage(
      `${chatter} Raids are closed, try again after they are open.`
    );
    return;
  }

  if (!pogoUsername) {
    await sendChatMessage(
      `${chatter} You forgot your pogo username: !raid your_pogo_username`
    );
    return;
  }

  if (pogoUsername.includes(',')) {
    await sendChatMessage(
      `${chatter} Your pogo username includes an invalid character.`
    );
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

  await sendChatMessage(`${chatter} You are added to the queue`);
};

