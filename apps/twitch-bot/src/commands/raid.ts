import { sendChatMessage } from '../api/chat.js';
import { messages } from '../messages.js';
import { isQueueOpen } from '../queue-state.js';
import { markRaidSuccess, isFirstTimeChatter, markInQueue, isInQueue, isFirestoreListenerActive, getQueueEntryStatus, setQueueEntryStatus } from '../detectables/shared.js';
import { getUser } from '@pogo-raid-system/firebase';
import { queue } from '../providers/queue.js';
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
  event: ChatMessageEvent
): Promise<void> => {
  const parts = event.message.text.trim().split(/\s+/);
  // parts[0] = '!raid' (any casing), parts[1] = pogo username (optional, preserve original case)
  // Treat args that contain zero alphanumeric characters (e.g. invisible Unicode) as absent.
  const rawArg = parts[1];
  const pogoUsername = rawArg && /[a-zA-Z0-9]/.test(rawArg) ? rawArg : undefined;

  if (!isQueueOpen()) {
    await sendChatMessage(messages.raidQueueClosed(event.chatter_user_login));
    return;
  }

  const cachedUsername = pogoUsernameCache.get(event.chatter_user_id);

  if (!pogoUsername) {
    if (isInQueue(event.chatter_user_id)) {
      if (getQueueEntryStatus(event.chatter_user_id) === 'invited') {
        try {
          await queue.setEntryStatus(event.chatter_user_id, 'joined');
          if (!isFirestoreListenerActive()) setQueueEntryStatus(event.chatter_user_id, 'joined');
        } catch {
          setQueueEntryStatus(event.chatter_user_id, 'joined');
        }
        const pogo = pogoUsernameCache.get(event.chatter_user_id) ?? event.chatter_user_login;
        await sendChatMessage(messages.raidRejoinedQueue(pogo));
      } else {
        await sendChatMessage(messages.raidAlreadyInQueue);
      }
      return;
    }
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
      try {
        await Promise.all([queue.upsertUser(raidParams), queue.addToQueue(raidParams)]);
        if (!isFirestoreListenerActive()) markInQueue(event.chatter_user_id, resolvedUsername);
      } catch {
        markInQueue(event.chatter_user_id, resolvedUsername);
      }
      pogoUsernameCache.set(event.chatter_user_id, resolvedUsername);
      markRaidSuccess(event.chatter_user_id);
      await sendChatMessage(messages.raidAdded(resolvedUsername));
    } else {
      await sendChatMessage(messages.raidMissingUsername(event.chatter_user_login));
    }
    return;
  }

  if (isInQueue(event.chatter_user_id)) {
    if (getQueueEntryStatus(event.chatter_user_id) === 'invited') {
      try {
        await queue.setEntryStatus(event.chatter_user_id, 'joined');
        if (!isFirestoreListenerActive()) setQueueEntryStatus(event.chatter_user_id, 'joined');
      } catch {
        setQueueEntryStatus(event.chatter_user_id, 'joined');
      }
      await sendChatMessage(messages.raidRejoinedQueue(pogoUsername));
    } else {
      await sendChatMessage(messages.raidAlreadyInQueue);
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

  const isNewlyCached = !cachedUsername;
  const firstTime = isFirstTimeChatter(event);
  try {
    await Promise.all([queue.upsertUser(raidParams), queue.addToQueue(raidParams)]);
    if (!isFirestoreListenerActive()) markInQueue(event.chatter_user_id, pogoUsername);
  } catch {
    markInQueue(event.chatter_user_id, pogoUsername);
  }
  pogoUsernameCache.set(event.chatter_user_id, pogoUsername);
  markRaidSuccess(event.chatter_user_id);
  const msg = firstTime
    ? messages.raidAddedFirstTime(pogoUsername)
    : isNewlyCached
      ? messages.raidAddedUsernameSaved(pogoUsername)
      : messages.raidAdded(pogoUsername);
  await sendChatMessage(msg);
};

