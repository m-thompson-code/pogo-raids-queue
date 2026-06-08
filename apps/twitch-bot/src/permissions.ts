import { config } from './config.js';
import type { ChatMessageEvent } from './types.js';

/**
 * Returns true if the chatter is allowed to run privileged commands.
 *
 * Permitted roles:
 * - Broadcaster (the channel owner — matched by Twitch User ID)
 * - Moderator (holds a `moderator` badge)
 *
 * @param event - The `channel.chat.message` event to inspect
 */
export const isPrivileged = (event: ChatMessageEvent): boolean => {
  const isBroadcaster = event.chatter_user_id === config.chatChannelUserId;
  const isModerator = event.badges.some((b) => b.set_id === 'moderator');
  return isBroadcaster || isModerator;
};
