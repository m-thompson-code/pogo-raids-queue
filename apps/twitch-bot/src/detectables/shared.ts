import type { ChatMessageEvent } from '../types.js';

/** Twitch user IDs that have successfully used !raid this session. */
export const successfulRaiders = new Set<string>();

/** Called by the raid command handler after a successful queue entry. */
export const markRaidSuccess = (twitchUserId: string): void => {
  successfulRaiders.add(twitchUserId);
  firstTimeChatters.delete(twitchUserId);
};

/** Removes the successful-raider flag, e.g. after a strike. */
export const unmarkRaidSuccess = (twitchUserId: string): void => {
  successfulRaiders.delete(twitchUserId);
};

export const isPrivilegedUser = (event: ChatMessageEvent): boolean =>
  event.badges.some((b) => b.set_id === 'broadcaster' || b.set_id === 'moderator');

export const firstTimeChatters = new Set<string>();
export const markFirstTimeChatter = (twitchUserId: string): void => { firstTimeChatters.add(twitchUserId); };
export const unmarkFirstTimeChatter = (twitchUserId: string): void => { firstTimeChatters.delete(twitchUserId); };
export const isFirstTimeChatter = (event: ChatMessageEvent): boolean =>
  firstTimeChatters.has(event.chatter_user_id);
