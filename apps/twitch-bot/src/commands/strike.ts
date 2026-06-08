import { sendChatMessage } from '../chat.js';
import { messages } from '../messages.js';
import { strikeUser } from '@pogo-raid-system/firebase';
import { getTwitchUserId } from '../twitch-api.js';
import type { ChatMessageEvent } from '../types.js';

/**
 * Handles the `!strike` chat command (privileged only).
 *
 * Usage:
 *   !strike <twitch_username>          — increments strikes by 1
 *   !strike <twitch_username> <value>  — sets strikes to the given value
 *
 * The leading '@' on the username is stripped if present.
 */
export const handleStrikeCommand = async (
  event: ChatMessageEvent
): Promise<void> => {
  const parts = event.message.text.trim().split(/\s+/);
  // parts[0] = '!strike', parts[1] = username, parts[2] = optional value
  const rawTarget = parts[1];
  const chatter = event.chatter_user_login;

  if (!rawTarget) {
    await sendChatMessage(messages.strikeUsage(chatter));
    return;
  }

  const target = rawTarget.replace(/^@/, '');
  const rawValue = parts[2]?.trim();
  const isExplicitValue = rawValue !== undefined && rawValue !== '' && /^\d+$/.test(rawValue);
  const setValue = isExplicitValue ? parseInt(rawValue, 10) : undefined;

  if (isExplicitValue && setValue! < 0) {
    await sendChatMessage(messages.strikeUsage(chatter));
    return;
  }

  const twitchUserId = await getTwitchUserId(target);

  if (!twitchUserId) {
    await sendChatMessage(messages.strikeNotFound(chatter, target));
    return;
  }

  const count = await strikeUser(target, twitchUserId, setValue);

  await sendChatMessage(messages.strikeConfirm(target, count));
};
