import type { QueueProvider, QueueEntry, RaidParams } from './queue-provider.js';

/** In-memory user record (superset of QueueEntry with raid tracking) */
interface UserRecord extends RaidParams {
  lastRaided: Date;
  raidCount: number;
}

/**
 * Fully in-memory implementation of `QueueProvider`.
 * State is lost when the bot process restarts — no database required.
 */
export class InMemoryQueueProvider implements QueueProvider {
  private readonly users = new Map<string, UserRecord>();
  private readonly queue = new Map<string, QueueEntry>();

  async upsertUser(params: RaidParams): Promise<void> {
    const existing = this.users.get(params.twitchUserId);
    this.users.set(params.twitchUserId, {
      ...params,
      lastRaided: new Date(),
      raidCount: (existing?.raidCount ?? 0) + 1,
    });
  }

  async addToQueue(params: RaidParams): Promise<void> {
    const existing = this.queue.get(params.twitchUserId);

    if (existing) {
      // Already in queue — update profile fields, preserve joinedAt
      this.queue.set(params.twitchUserId, {
        ...params,
        joinedAt: existing.joinedAt,
      });
    } else {
      this.queue.set(params.twitchUserId, {
        ...params,
        joinedAt: new Date(),
      });
    }
  }

  async clearQueue(): Promise<void> {
    this.queue.clear();
  }

  async getQueue(): Promise<QueueEntry[]> {
    return [...this.queue.values()].sort(
      (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime()
    );
  }

  async addManual(pogoUsername: string): Promise<void> {
    const syntheticId = `manual-${pogoUsername}`;
    if (!this.queue.has(syntheticId)) {
      this.queue.set(syntheticId, {
        twitchUserId: syntheticId,
        twitchUsername: '',
        pogoUsername,
        isSubscriber: false,
        isVip: false,
        joinedAt: new Date(),
      });
    }
  }

  async removeByTwitchId(twitchUserId: string): Promise<void> {
    this.queue.delete(twitchUserId);
  }

  async removeByPogoUsername(pogoUsername: string): Promise<boolean> {
    for (const [id, entry] of this.queue) {
      if (entry.pogoUsername.toLowerCase() === pogoUsername.toLowerCase()) {
        this.queue.delete(id);
        return true;
      }
    }
    return false;
  }
}
