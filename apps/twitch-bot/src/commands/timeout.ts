import { sendChatMessage } from '../api/chat.js';
import { messages } from '../messages.js';
import { getTwitchUserId } from '../api/twitch-api.js';
import { queue } from '../providers/queue.js';
import { getUser, strikeUser } from '@pogo-raid-system/firebase';
import { isFirestoreListenerActive, unmarkInQueueByTwitchId } from '../detectables/shared.js';
import type { ChatMessageEvent } from '../types.js';

/**
 * Moves a user into the timed-out queue and sets timedOutAt via strikes.
 */
export const timeoutByUsername = async (
  rawTarget: string,
  chatter: string,
): Promise<void> => {
  const target = rawTarget.replace(/^@/, '');
  const twitchUserId = await getTwitchUserId(target);

  if (!twitchUserId) {
    await sendChatMessage(messages.timeoutNotFound(chatter, target));
    return;
  }

  const user = await getUser(twitchUserId);
  if (!user?.pogoUsername) {
    await sendChatMessage(messages.timeoutNotFound(chatter, target));
    return;
  }

  const raidParams = {
    twitchUserId,
    twitchUsername: user.twitchUsername ?? target,
    pogoUsername: user.pogoUsername,
    isSubscriber: Boolean(user.isSubscriber),
    isVip: Boolean(user.isVip),
  };

  await Promise.all([
    strikeUser(target, twitchUserId, 3),
    queue.removeByTwitchId(twitchUserId),
    queue.addToTimedOutQueue(raidParams),
  ]);

  if (!isFirestoreListenerActive()) {
    unmarkInQueueByTwitchId(twitchUserId);
  }

  await sendChatMessage(messages.timeoutSuccess(target));
};

/**
 * Handles the `!timeout` chat command (privileged only).
 * Usage: `!timeout <twitch_username>`
 */
export const handleTimeoutCommand = async (
  event: ChatMessageEvent,
): Promise<void> => {
  const parts = event.message.text.trim().split(/\s+/);
  const rawTarget = parts[1];
  const chatter = event.chatter_user_login;

  if (!rawTarget) {
    await sendChatMessage(messages.timeoutUsage(chatter));
    return;
  }

  await timeoutByUsername(rawTarget, chatter);
};
