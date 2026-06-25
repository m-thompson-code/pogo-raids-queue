import { sendChatMessage } from '../api/chat.js';
import { messages } from '../messages.js';
import { isQueueOpen } from '../queue-state.js';
import { markRaidSuccess, isFirstTimeChatter, markInQueue, isInQueue, isFirestoreListenerActive, getQueueEntryStatus, unmarkRaidSuccess, markFirstTimeChatter, unmarkInQueueByTwitchId, getQueuedPogoUsername } from '../detectables/shared.js';
import { getUser, strikeUser } from '@pogo-raid-system/firebase';
import { queue } from '../providers/queue.js';
import { isStrictMode } from '../persisted-settings.js';
import type { ChatMessageEvent } from '../types.js';

/** In-memory cache of twitchUserId → pogoUsername to avoid repeat DB reads. */
const pogoUsernameCache = new Map<string, string>();
const RAID_TIMEOUT_MS = 10 * 60 * 1000;
const RAID_REPEAT_WINDOW_MS = 2 * 60 * 1000;
/** Users who have been moved to timedOutQueue this session. Prevents the
 * timeout-remaining flow from being hidden by a stale local queue state. */
const timedOutUsers = new Set<string>();
const lastRaidCommandAt = new Map<string, number>();

export const __resetRaidRepeatWindowForTests = (): void => {
  lastRaidCommandAt.clear();
  timedOutUsers.clear();
};

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
  const now = Date.now();
  const lastRaidAt = lastRaidCommandAt.get(event.chatter_user_id) ?? 0;
  const repeatedWithinWindow = now - lastRaidAt < RAID_REPEAT_WINDOW_MS;

  const parts = event.message.text.trim().split(/\s+/);
  // parts[0] = '!raid' (any casing), parts[1] = pogo username (optional, preserve original case)
  // Treat args that contain zero alphanumeric characters (e.g. invisible Unicode) as absent.
  const rawArg = parts[1];
  const pogoUsername = rawArg && /[a-zA-Z0-9]/.test(rawArg) ? rawArg : undefined;

  if (!isQueueOpen()) {
    await sendChatMessage(messages.raidQueueClosed(event.chatter_user_login));
    return;
  }

  lastRaidCommandAt.set(event.chatter_user_id, now);

  const cachedUsername = pogoUsernameCache.get(event.chatter_user_id);
  const getStoredPogoUsername = async (): Promise<string | undefined> => {
    const queuedUsername = getQueuedPogoUsername(event.chatter_user_id);
    if (queuedUsername) return queuedUsername;
    if (cachedUsername) return cachedUsername;
    const resolvedUsername = (await getUser(event.chatter_user_id))?.pogoUsername;
    if (resolvedUsername) pogoUsernameCache.set(event.chatter_user_id, resolvedUsername);
    return resolvedUsername;
  };

  const isSamePogoUsername = (left: string, right: string): boolean =>
    left.toLowerCase() === right.toLowerCase();

  const raidTimeoutRemainingMs = (timedOutAt: unknown): number => {
    if (!timedOutAt) return 0;
    let timedOutMs: number | null = null;
    if (typeof timedOutAt === 'object' && timedOutAt !== null && 'toDate' in timedOutAt) {
      timedOutMs = (timedOutAt as { toDate: () => Date }).toDate().getTime();
    } else if (timedOutAt instanceof Date) {
      timedOutMs = timedOutAt.getTime();
    }
    if (timedOutMs === null) return 0;
    const remaining = RAID_TIMEOUT_MS - (Date.now() - timedOutMs);
    return remaining > 0 ? remaining : 0;
  };

  // If a user is back in the queue (e.g. restored by host/UI), clear stale
  // local timeout tracking once their persisted timeout has ended/been removed.
  if (isInQueue(event.chatter_user_id) && timedOutUsers.has(event.chatter_user_id)) {
    const timeoutRemainingMs = raidTimeoutRemainingMs((await getUser(event.chatter_user_id))?.timedOutAt);
    if (timeoutRemainingMs <= 0) {
      timedOutUsers.delete(event.chatter_user_id);
    }
  }

  const buildRaidParams = (resolvedPogoUsername: string) => ({
    twitchUserId: event.chatter_user_id,
    twitchUsername: event.chatter_user_login,
    pogoUsername: resolvedPogoUsername,
    isSubscriber: event.badges.some(
      (b) => b.set_id === 'subscriber' || b.set_id === 'founder'
    ),
    isVip: event.badges.some((b) => b.set_id === 'vip'),
  });

  const strikeForForgotJoined = async (resolvedPogoUsername: string): Promise<void> => {
    const strikeCount = await strikeUser(
      event.chatter_user_login,
      event.chatter_user_id
    );
    unmarkRaidSuccess(event.chatter_user_id);
    markFirstTimeChatter(event.chatter_user_id);

    if (strikeCount >= 3) {
      const raidParams = buildRaidParams(resolvedPogoUsername);
      timedOutUsers.add(event.chatter_user_id);
      try {
        await Promise.all([
          queue.removeByTwitchId(event.chatter_user_id),
          queue.addToTimedOutQueue(raidParams),
        ]);
      } finally {
        if (!isFirestoreListenerActive()) {
          unmarkInQueueByTwitchId(event.chatter_user_id);
        }
      }
    }

    await sendChatMessage(messages.raidForgotJoinedStrike(strikeCount));
  };

  const upsertAndAddToQueue = async (resolvedPogoUsername: string): Promise<'queued' | 'timedOut'> => {
    const raidParams = buildRaidParams(resolvedPogoUsername);
    const user = await getUser(event.chatter_user_id);
    const remainingMs = raidTimeoutRemainingMs(user?.timedOutAt);

    if (remainingMs > 0) {
      timedOutUsers.add(event.chatter_user_id);
      await Promise.all([
        queue.removeByTwitchId(event.chatter_user_id),
        queue.addToTimedOutQueue(raidParams),
      ]);
      if (!isFirestoreListenerActive()) {
        unmarkInQueueByTwitchId(event.chatter_user_id);
      }
      await sendChatMessage(messages.raidTimedOut(event.chatter_user_login, remainingMs));
      return 'timedOut';
    }

    try {
      await Promise.all([queue.upsertUser(raidParams), queue.addToQueue(raidParams)]);
      await queue.removeFromTimedOutQueue(event.chatter_user_id);
      timedOutUsers.delete(event.chatter_user_id);
      if (!isFirestoreListenerActive()) markInQueue(event.chatter_user_id, resolvedPogoUsername);
    } catch {
      markInQueue(event.chatter_user_id, resolvedPogoUsername);
    }

    return 'queued';
  };

  if (!pogoUsername) {
    if (isInQueue(event.chatter_user_id) && !timedOutUsers.has(event.chatter_user_id)) {
      if (repeatedWithinWindow && getQueueEntryStatus(event.chatter_user_id) !== 'invited') {
        await sendChatMessage(messages.raidAlreadyInQueue);
        return;
      }
      const pogo = await getStoredPogoUsername();
      if (!pogo) {
        await sendChatMessage(messages.raidMissingUsername(event.chatter_user_login));
        return;
      }
      if (getQueueEntryStatus(event.chatter_user_id) === 'invited') {
        await sendChatMessage(messages.raidAlreadyJoined);
      } else if (isStrictMode()) {
        await strikeForForgotJoined(pogo);
      } else {
        await sendChatMessage(messages.raidAlreadyInQueue);
      }
      return;
    }
    const resolvedUsername = await getStoredPogoUsername();
    if (resolvedUsername) {
      const queueResult = await upsertAndAddToQueue(resolvedUsername);
      if (queueResult === 'timedOut') return;
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

  if (isInQueue(event.chatter_user_id) && !timedOutUsers.has(event.chatter_user_id)) {
    const previousPogoUsername = await getStoredPogoUsername();
    const sameUsername = previousPogoUsername ? isSamePogoUsername(previousPogoUsername, pogoUsername) : false;

    if (getQueueEntryStatus(event.chatter_user_id) === 'invited') {
      await sendChatMessage(messages.raidAlreadyJoined);
    } else {
      if (sameUsername) {
        if (repeatedWithinWindow) {
          await sendChatMessage(messages.raidAlreadyInQueue);
          return;
        }
        if (isStrictMode()) {
          await strikeForForgotJoined(previousPogoUsername ?? pogoUsername);
        } else {
          await sendChatMessage(messages.raidAlreadyInQueue);
        }
        return;
      }

      const queueResult = await upsertAndAddToQueue(pogoUsername);
      if (queueResult === 'timedOut') return;
      pogoUsernameCache.set(event.chatter_user_id, pogoUsername);
      await sendChatMessage(messages.raidUsernameUpdated(pogoUsername, previousPogoUsername));
    }
    return;
  }

  const raidParams = {
    ...buildRaidParams(pogoUsername),
  };

  const user = await getUser(event.chatter_user_id);
  const remainingMsFresh = raidTimeoutRemainingMs(user?.timedOutAt);
  if (remainingMsFresh > 0) {
    timedOutUsers.add(event.chatter_user_id);
    await Promise.all([
      queue.removeByTwitchId(event.chatter_user_id),
      queue.addToTimedOutQueue(raidParams),
    ]);
    if (!isFirestoreListenerActive()) {
      unmarkInQueueByTwitchId(event.chatter_user_id);
    }
    await sendChatMessage(messages.raidTimedOut(event.chatter_user_login, remainingMsFresh));
    return;
  }

  const isNewlyCached = !cachedUsername;
  const firstTime = isFirstTimeChatter(event);
  try {
    await Promise.all([queue.upsertUser(raidParams), queue.addToQueue(raidParams)]);
    await queue.removeFromTimedOutQueue(event.chatter_user_id);
    timedOutUsers.delete(event.chatter_user_id);
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

