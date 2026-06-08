import {
  upsertUser as firestoreUpsertUser,
  addToQueue as firestoreAddToQueue,
  clearQueue as firestoreClearQueue,
  getQueue as firestoreGetQueue,
  addManualToQueue as firestoreAddManualToQueue,
  removeFromQueueByTwitchId as firestoreRemoveByTwitchId,
  removeFromQueueByPogoUsername as firestoreRemoveByPogoUsername,
} from '@pogo-raid-system/firebase';
import type { QueueProvider, QueueEntry, RaidParams } from './queue-provider.js';

/**
 * Firestore-backed implementation of `QueueProvider`.
 * Persists user records and queue entries across bot restarts.
 */
export class FirestoreQueueProvider implements QueueProvider {
  async upsertUser(params: RaidParams): Promise<void> {
    await firestoreUpsertUser(params);
  }

  async addToQueue(params: RaidParams): Promise<void> {
    await firestoreAddToQueue(params);
  }

  async clearQueue(): Promise<void> {
    await firestoreClearQueue();
  }

  async getQueue(): Promise<QueueEntry[]> {
    return firestoreGetQueue();
  }

  async addManual(pogoUsername: string): Promise<void> {
    await firestoreAddManualToQueue(pogoUsername);
  }

  async removeByTwitchId(twitchUserId: string): Promise<string | null> {
    return firestoreRemoveByTwitchId(twitchUserId);
  }

  async removeByPogoUsername(pogoUsername: string): Promise<boolean> {
    return firestoreRemoveByPogoUsername(pogoUsername);
  }
}
