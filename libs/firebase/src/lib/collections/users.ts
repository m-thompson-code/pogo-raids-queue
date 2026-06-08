import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '../core/firebase.js';
import type { RaidParams } from '../core/types.js';

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
 * Finds a user in the `users` collection by Twitch user ID and either
 * increments their `strikes` count by 1, or sets it to an explicit value.
 *
 * Returns the updated strike count.
 *
 * @param twitchUsername - The Twitch username to store
 * @param twitchUserId   - The Twitch user ID (document key)
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
