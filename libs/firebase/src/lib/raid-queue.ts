import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from './firebase.js';

/** Parameters derived from a Twitch chat message event for a !raid command */
export interface RaidParams {
  twitchUserId: string;
  twitchUsername: string;
  pogoUsername: string;
  isSubscriber: boolean;
  isVip: boolean;
}

/**
 * Upserts a user document in the `users` collection.
 *
 * - Creates the document if it does not exist.
 * - Merges on subsequent calls so only provided fields are overwritten.
 * - `raidCount` is atomically incremented by 1 on every call.
 * - `lastRaided` is set to the current server timestamp.
 *
 * @param params - Data extracted from the Twitch chat event
 */
export const upsertUser = async (params: RaidParams): Promise<void> => {
  const userRef = getDb().collection('users').doc(params.twitchUserId);

  await getDb().runTransaction(async (transaction) => {
    const existing = await transaction.get(userRef);

    const fields = {
      twitchUserId: params.twitchUserId,
      twitchUsername: params.twitchUsername,
      pogoUsername: params.pogoUsername,
      isSubscriber: params.isSubscriber,
      isVip: params.isVip,
      lastRaided: FieldValue.serverTimestamp(),
      raidCount: FieldValue.increment(1),
    };

    if (!existing.exists) {
      transaction.set(userRef, {
        ...fields,
        createdAt: FieldValue.serverTimestamp(),
      });
    } else {
      const update: Record<string, unknown> = { ...fields };
      if (!existing.data()?.['createdAt']) {
        update['createdAt'] = FieldValue.serverTimestamp();
      }
      transaction.update(userRef, update);
    }
  });
};

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
export const getQueue = async (): Promise<Array<{
  twitchUserId: string;
  twitchUsername: string;
  pogoUsername: string;
  isSubscriber: boolean;
  isVip: boolean;
  joinedAt: Date;
}>> => {
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
      joinedAt: (data['joinedAt']?.toDate?.() ?? new Date()) as Date,
    };
  });
};

/**
 * Adds a manual entry to the `raidQueue` with only a pogo username.
 * Uses a synthetic Twitch User ID of `manual-<pogoUsername>` so the same
 * pogo name cannot occupy more than one slot.  No user record is created.
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
        joinedAt: FieldValue.serverTimestamp(),
      });
    }
  });
};

/**
 * Finds a user in the `users` collection by Twitch username (case-insensitive)
 * and either increments their `strikes` count by 1, or sets it to an explicit value.
 *
 * Returns true if the user was found and updated, false otherwise.
 *
 * @param twitchUsername - The Twitch username to look up (with or without @)
 * @param value          - If provided, sets strikes to this value; otherwise increments by 1
 */
export const strikeUser = async (
  twitchUsername: string,
  twitchUserId: string,
  value?: number
): Promise<number> => {
  const docRef = getDb().collection('users').doc(twitchUserId);
  await docRef.set(
    {
      twitchUserId,
      twitchUsername: twitchUsername.replace(/^@/, '').toLowerCase(),
      strikes: value !== undefined ? value : FieldValue.increment(1),
    },
    { merge: true }
  );
  const updated = await docRef.get();
  return (updated.data()?.['strikes'] as number) ?? 0;
};

/**
 * Removes the raidQueue document for the given Twitch user ID.
 * No-op if the document does not exist.
 */
export const removeFromQueueByTwitchId = async (twitchUserId: string): Promise<string | null> => {
  const ref = getDb().collection('raidQueue').doc(twitchUserId);
  const doc = await ref.get();
  const pogoUsername = doc.exists ? (doc.data()?.['pogoUsername'] as string) ?? null : null;
  await ref.delete();
  return pogoUsername;
};

/**
 * Removes the first raidQueue entry whose `pogoUsername` matches (case-insensitive).
 * Returns true if an entry was deleted, false if none was found.
 */
export const removeFromQueueByPogoUsername = async (pogoUsername: string): Promise<boolean> => {
  const snapshot = await getDb().collection('raidQueue').get();
  const match = snapshot.docs.find(
    (d) => (d.data()['pogoUsername'] as string)?.toLowerCase() === pogoUsername.toLowerCase()
  );
  if (!match) return false;
  await match.ref.delete();
  return true;
};
