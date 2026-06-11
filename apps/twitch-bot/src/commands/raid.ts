import { sendChatMessage } from '../api/chat.js';
import { messages } from '../messages.js';
import { isQueueOpen } from '../queue-state.js';
import { markRaidSuccess, isFirstTimeChatter } from '../detectables/shared.js';
import { getUser } from '@pogo-raid-system/firebase';
import type { QueueProvider } from '../providers/queue-provider.js';
import type { ChatMessageEvent } from '../types.js';

/** In-memory cache of twitchUserId → pogoUsername to avoid repeat DB reads. */
const pogoUsernameCache = new Map<string, string>();

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

  const cachedUsername = pogoUsernameCache.get(event.chatter_user_id);

  if (!pogoUsername) {
    const resolvedUsername = cachedUsername ?? (await getUser(event.chatter_user_id))?.pogoUsername;
    if (resolvedUsername) {
      const raidParams = {
        twitchUserId: event.chatter_user_id,
        twitchUsername: event.chatter_user_login,
        pogoUsername: resolvedUsername,
        isSubscriber: event.badges.some(
          (b) => b.set_id === 'subscriber' || b.set_id === 'premium' || b.set_id === 'founder'
        ),
        isVip: event.badges.some((b) => b.set_id === 'vip'),
      };
      await Promise.all([provider.upsertUser(raidParams), provider.addToQueue(raidParams)]);
      pogoUsernameCache.set(event.chatter_user_id, resolvedUsername);
      markRaidSuccess(event.chatter_user_id);
      await sendChatMessage(messages.raidAdded(resolvedUsername));
    } else {
      await sendChatMessage(messages.raidMissingUsername(event.chatter_user_login));
    }
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
    isSubscriber: event.badges.some(
      (b) => b.set_id === 'subscriber' || b.set_id === 'premium' || b.set_id === 'founder'
    ),
    isVip: event.badges.some((b) => b.set_id === 'vip'),
  };

  await Promise.all([provider.upsertUser(raidParams), provider.addToQueue(raidParams)]);

  const isNewlyCached = !cachedUsername;
  const firstTime = isFirstTimeChatter(event);
  pogoUsernameCache.set(event.chatter_user_id, pogoUsername);
  markRaidSuccess(event.chatter_user_id);
  const msg = firstTime
    ? messages.raidAddedFirstTime(pogoUsername)
    : isNewlyCached
      ? messages.raidAddedUsernameSaved(pogoUsername)
      : messages.raidAdded(pogoUsername);
  await sendChatMessage(msg);
};

