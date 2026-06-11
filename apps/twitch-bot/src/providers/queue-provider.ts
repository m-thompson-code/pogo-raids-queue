/** Parameters needed to register or update a raid entry */
export interface RaidParams {
  twitchUserId: string;
  twitchUsername: string;
  pogoUsername: string;
  isSubscriber: boolean;
  isVip: boolean;
}

/** A single entry in the raid queue, ordered by `joinedAt` */
export interface QueueEntry {
  twitchUserId: string;
  twitchUsername: string;
  pogoUsername: string;
  isSubscriber: boolean;
  isVip: boolean;
  status: 'joined' | 'invited';
  joinedAt: Date;
}

/**
 * Abstraction over the queue and user store.
 * Implementations can be swapped without touching command logic.
 */
export interface QueueProvider {
  /**
   * Creates or updates the persistent user record.
   * Increments raid count on every call.
   */
  upsertUser(params: RaidParams): Promise<void>;

  /**
   * Adds the user to the queue if not already present.
   * If already present, updates their profile fields only — `joinedAt` is
   * never changed so their position in the queue is preserved.
   */
  addToQueue(params: RaidParams): Promise<void>;

  /** Removes all entries from the queue. */
  clearQueue(): Promise<void>;

  /** Returns all queue entries ordered by `joinedAt` ascending. */
  getQueue(): Promise<QueueEntry[]>;

  /**
   * Adds a manual entry to the queue with only a pogo username.
   * No Twitch account is associated. Uses a synthetic ID based on the pogo
   * username so the same name cannot be added twice.
   */
  addManual(pogoUsername: string): Promise<void>;

  /** Removes the entry for the given Twitch user ID. Returns the pogo username if found, null otherwise. */
  removeByTwitchId(twitchUserId: string): Promise<string | null>;

  /**
   * Removes the first queue entry whose `pogoUsername` matches (case-insensitive).
   * Returns true if an entry was removed, false if not found.
   */
  removeByPogoUsername(pogoUsername: string): Promise<boolean>;

  /** Updates the status field of a single queue entry. */
  setEntryStatus(twitchUserId: string, status: 'joined' | 'invited'): Promise<void>;
}
