/**
 * In-memory queue state.
 *
 * Resets to `open` every time the bot process starts.
 * Does not persist to the database — the streamer controls this at runtime
 * via the `!open` and `!close` chat commands.
 */
let queueOpen = true;

/** Returns true if the raid queue is currently accepting new entries. */
export const isQueueOpen = (): boolean => queueOpen;

/** Opens the queue, allowing users to join via `!raid`. */
export const openQueue = (): void => {
  queueOpen = true;
};

/** Closes the queue, preventing new entries via `!raid`. */
export const closeQueue = (): void => {
  queueOpen = false;
};
