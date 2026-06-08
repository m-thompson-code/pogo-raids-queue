import type { Timestamp } from 'firebase-admin/firestore';

/**
 * Persisted user record, keyed by Twitch User ID in the `users` collection.
 * Updated every time the user issues a `!raid` command.
 */
export interface RaidUser {
  /** Twitch numeric User ID — used as the document key */
  twitchUserId: string;
  /** Twitch display/login name */
  twitchUsername: string;
  /** Pokémon GO in-game username provided with the !raid command */
  pogoUsername: string;
  /** Whether the user holds a subscriber badge at time of command */
  isSubscriber: boolean;
  /** Whether the user holds a VIP badge at time of command */
  isVip: boolean;
  /** Timestamp of the most recent !raid command from this user */
  lastRaided: Timestamp;
  /** Total number of times this user has issued the !raid command */
  raidCount: number;
}

/**
 * A short-lived queue entry in the `raidQueue` collection.
 * Keyed by Twitch User ID. Intentionally omits `raidCount` — that metric
 * lives only on the `users` document.
 */
export interface QueueEntry {
  twitchUserId: string;
  twitchUsername: string;
  pogoUsername: string;
  isSubscriber: boolean;
  isVip: boolean;
  /** Timestamp when the user joined (or re-joined) the current queue */
  joinedAt: Timestamp;
}
