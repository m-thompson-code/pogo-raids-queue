import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '../core/firebase.js';
import type { RaidParams } from '../core/types.js';

/**
 * Adds or updates the user's entry in the `raidQueue` collection.
 *
 * - If the user is not yet in the queue, creates the document and sets
 *   `joinedAt` to the current server timestamp.
 * - If the user is already in the queue, updates only their profile fields
 *   (username, pogo name, badges) without touching `joinedAt`, preserving
 *   their original position in the queue order.
 *
 * Uses a transaction to make the check-then-write atomic.
 *
 * @param params - Data extracted from the Twitch chat event
 */
export const addToQueue = async (params: RaidParams): Promise<void> => {
  const queueRef = getDb().collection('raidQueue').doc(params.twitchUserId);

  await getDb().runTransaction(async (transaction) => {
    const existing = await transaction.get(queueRef);

    const profileFields = {
      twitchUserId: params.twitchUserId,
      twitchUsername: params.twitchUsername,
      pogoUsername: params.pogoUsername,
      isSubscriber: params.isSubscriber,
      isVip: params.isVip,
    };

    if (!existing.exists) {
      transaction.set(queueRef, {
        ...profileFields,
        status: 'joined',
        joinedAt: FieldValue.serverTimestamp(),
      });
    } else {
      transaction.update(queueRef, profileFields);
    }
  });
};

/**
 * Deletes all documents in the `raidQueue` collection.
 *
 * Intended to be called by a moderator via the `!clear` command to reset
 * the queue between raid sessions.
 */
export const clearQueue = async (): Promise<void> => {
  const snapshot = await getDb().collection('raidQueue').get();
  await Promise.all(snapshot.docs.map((d) => d.ref.delete()));
};

/**
 * Returns all `raidQueue` documents ordered by `joinedAt` ascending.
 * Each entry's Firestore Timestamp is converted to a plain JS Date.
 */
export const getQueue = async (): Promise<
  Array<{
    twitchUserId: string;
    twitchUsername: string;
    pogoUsername: string;
    isSubscriber: boolean;
    isVip: boolean;
    status: 'joined' | 'invited' | 'copied';
    joinedAt: Date;
  }>
> => {
  const snapshot = await getDb()
    .collection('raidQueue')
    .orderBy('joinedAt', 'asc')
    .get();
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      twitchUserId: data['twitchUserId'] as string,
      twitchUsername: data['twitchUsername'] as string,
      pogoUsername: data['pogoUsername'] as string,
      isSubscriber: data['isSubscriber'] as boolean,
      isVip: data['isVip'] as boolean,
      status: (data['status'] as 'joined' | 'invited' | 'copied') ?? 'joined',
      joinedAt: (data['joinedAt']?.toDate?.() ?? new Date()) as Date,
    };
  });
};

/**
 * Adds a manual entry to the `raidQueue` with only a pogo username.
 * Uses a synthetic Twitch User ID of `manual-<pogoUsername>` so the same
 * pogo name cannot occupy more than one slot. No user record is created.
 *
 * @param pogoUsername - The Pokémon GO username to add
 */
export const addManualToQueue = async (pogoUsername: string): Promise<void> => {
  const syntheticId = `manual-${pogoUsername}`;
  const queueRef = getDb().collection('raidQueue').doc(syntheticId);

  await getDb().runTransaction(async (transaction) => {
    const existing = await transaction.get(queueRef);
    if (!existing.exists) {
      transaction.set(queueRef, {
        twitchUserId: syntheticId,
        twitchUsername: '',
        pogoUsername,
        isSubscriber: false,
        isVip: false,
        status: 'joined',
        joinedAt: FieldValue.serverTimestamp(),
      });
    }
  });
};

/**
 * Removes the raidQueue document for the given Twitch user ID.
 * No-op if the document does not exist.
 * Returns the pogo username of the removed entry, or null if not found.
 */
export const removeFromQueueByTwitchId = async (
  twitchUserId: string,
): Promise<string | null> => {
  const ref = getDb().collection('raidQueue').doc(twitchUserId);
  const doc = await ref.get();
  const pogoUsername = doc.exists
    ? ((doc.data()?.['pogoUsername'] as string) ?? null)
    : null;
  await ref.delete();
  return pogoUsername;
};

/**
 * Removes the first raidQueue entry whose `pogoUsername` matches (case-insensitive).
 * Returns true if an entry was deleted, false if none was found.
 */
export const removeFromQueueByPogoUsername = async (
  pogoUsername: string,
): Promise<boolean> => {
  const snapshot = await getDb().collection('raidQueue').get();
  const match = snapshot.docs.find(
    (d) =>
      (d.data()['pogoUsername'] as string)?.toLowerCase() ===
      pogoUsername.toLowerCase(),
  );
  if (!match) return false;
  await match.ref.delete();
  return true;
};

/**
 * Subscribes to real-time changes on the `raidQueue` collection.
 *
 * Calls `onSnapshot` with the full current set of entries whenever any
 * document is added, modified, or deleted — allowing callers to keep
 * in-memory state in sync with Firestore.
 *
 * Returns the unsubscribe function.
 */
export const subscribeToQueue = (
  callback: (entries: Array<{ twitchUserId: string; pogoUsername: string; status: 'joined' | 'invited' | 'copied' }>) => void,
  onError?: (error: Error) => void,
): (() => void) => {
  return getDb().collection('raidQueue').onSnapshot((snapshot) => {
    const entries = snapshot.docs.map((d) => ({
      twitchUserId: d.data()['twitchUserId'] as string,
      pogoUsername: d.data()['pogoUsername'] as string,
      status: (d.data()['status'] as 'joined' | 'invited' | 'copied') ?? 'joined',
    }));
    callback(entries);
  }, onError);
};

/**
 * Updates the `status` field of a single raidQueue entry.
 */
export const updateQueueEntryStatus = async (
  twitchUserId: string,
  status: 'joined' | 'invited' | 'copied',
): Promise<void> => {
  await getDb().collection('raidQueue').doc(twitchUserId).update({ status });
};
