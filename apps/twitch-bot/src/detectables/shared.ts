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

// ─────────────────────────────────────────────────────────────────────────────
// In-memory queue membership tracking
// ─────────────────────────────────────────────────────────────────────────────

const queuedTwitchUserIds = new Set<string>();
/** Reverse map for pogo-username-based removal (e.g. !remove). */
const queuePogoToTwitchId = new Map<string, string>();
/** Tracks the current status of each queued user. */
const queueEntryStatuses = new Map<string, 'joined' | 'invited'>();

export const markInQueue = (twitchUserId: string, pogoUsername: string, status: 'joined' | 'invited' = 'joined'): void => {
  queuedTwitchUserIds.add(twitchUserId);
  queuePogoToTwitchId.set(pogoUsername.toLowerCase(), twitchUserId);
  queueEntryStatuses.set(twitchUserId, status);
};

export const unmarkInQueueByTwitchId = (twitchUserId: string): void => {
  queuedTwitchUserIds.delete(twitchUserId);
  queueEntryStatuses.delete(twitchUserId);
  for (const [pogo, id] of queuePogoToTwitchId) {
    if (id === twitchUserId) { queuePogoToTwitchId.delete(pogo); break; }
  }
};

export const unmarkInQueueByPogoUsername = (pogoUsername: string): void => {
  const twitchUserId = queuePogoToTwitchId.get(pogoUsername.toLowerCase());
  if (twitchUserId) {
    queuedTwitchUserIds.delete(twitchUserId);
    queuePogoToTwitchId.delete(pogoUsername.toLowerCase());
    queueEntryStatuses.delete(twitchUserId);
  }
};

export const clearQueueMemory = (): void => {
  queuedTwitchUserIds.clear();
  queuePogoToTwitchId.clear();
  queueEntryStatuses.clear();
};

/** Populates in-memory queue state from Firestore on startup. */
export const hydrateQueueMemory = (entries: Array<{ twitchUserId: string; pogoUsername: string; status?: 'joined' | 'invited' }>): void => {
  clearQueueMemory();
  for (const entry of entries) {
    markInQueue(entry.twitchUserId, entry.pogoUsername, entry.status ?? 'joined');
  }
};

export const isInQueue = (twitchUserId: string): boolean =>
  queuedTwitchUserIds.has(twitchUserId);

export const getQueueEntryStatus = (twitchUserId: string): 'joined' | 'invited' | undefined =>
  queueEntryStatuses.get(twitchUserId);

export const setQueueEntryStatus = (twitchUserId: string, status: 'joined' | 'invited'): void => {
  queueEntryStatuses.set(twitchUserId, status);
};

// ─────────────────────────────────────────────────────────────────────────────
// Firestore listener health
// ─────────────────────────────────────────────────────────────────────────────

/**
 * True once the Firestore queue listener has successfully received its first
 * snapshot. Set to false if the listener reports an error.
 *
 * Used by command handlers to decide whether to update local state directly
 * (Firestore down) or let the listener handle it (Firestore healthy).
 */
let firestoreListenerActive = false;

export const setFirestoreListenerActive = (active: boolean): void => {
  firestoreListenerActive = active;
};

export const isFirestoreListenerActive = (): boolean => firestoreListenerActive;
