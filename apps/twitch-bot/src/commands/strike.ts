import { sendChatMessage } from '../api/chat.js';
import { messages } from '../messages.js';
import { strikeUser } from '@pogo-raid-system/firebase';
import { getTwitchUserId } from '../api/twitch-api.js';
import type { ChatMessageEvent } from '../types.js';

/**
 * Looks up a Twitch user by username, increments (or sets) their strike count,
 * and sends a confirmation message in chat.
 *
 * @param rawTarget  - The Twitch username to strike (leading '@' is stripped)
 * @param chatter    - The login of the person who triggered the strike (for error replies)
 * @param setValue   - If provided, sets strikes to this value; otherwise increments by 1
 */
export const strikeByUsername = async (
  rawTarget: string,
  chatter: string,
  setValue?: number
): Promise<void> => {
  const target = rawTarget.replace(/^@/, '');

  const twitchUserId = await getTwitchUserId(target);

  if (!twitchUserId) {
    await sendChatMessage(messages.strikeNotFound(chatter, target));
    return;
  }

  const count = await strikeUser(target, twitchUserId, setValue);

  await sendChatMessage(messages.strikeConfirm(target, count));
};

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

  const rawValue = parts[2]?.trim();
  const isExplicitValue = rawValue !== undefined && rawValue !== '' && /^\d+$/.test(rawValue);
  const setValue = isExplicitValue ? parseInt(rawValue, 10) : undefined;

  if (isExplicitValue && setValue! < 0) {
    await sendChatMessage(messages.strikeUsage(chatter));
    return;
  }

  await strikeByUsername(rawTarget, chatter, setValue);
};
