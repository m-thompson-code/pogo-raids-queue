import { ChatMessageEvent } from '../types.js';
import { sendChatMessage } from '../api/chat.js';
import { messages } from '../messages.js';
import { getSpamWindowMs, setSpamWindowSeconds } from '../persisted-settings.js';

// ─────────────────────────────────────────────────────────────────────────────
// Spam detection
//
// Tracks recent non-command messages per user. If the same (normalised)
// message is sent `SPAM_THRESHOLD` or more times within `SPAM_WINDOW_MS`,
// a warning is sent in chat (at most once per `WARN_COOLDOWN_MS` per user).
// ─────────────────────────────────────────────────────────────────────────────

const SPAM_THRESHOLD = 3;
const WARN_COOLDOWN_MS = 60_000;

/** Update the spam detection window. Pass 0 to disable. Persists to disk. */
export const setSpamWindow = (ms: number): void => {
  setSpamWindowSeconds(ms / 1000);
  if (ms === 0) userRecords.clear();
};

interface UserRecord {
  /** Normalised text of the last seen message (used to detect repeated content) */
  lastNorm: string;
  /** Timestamps (ms) of recent messages that matched the current normalised text */
  recentTimestamps: number[];
  lastWarnedAt: number;
}

const userRecords = new Map<string, UserRecord>();

const normalise = (text: string): string =>
  text
    // Strip emoji (Unicode Emoji block ranges) and other symbol categories
    .replace(/\p{Emoji}/gu, '')
    // Strip non-letter, non-digit characters (punctuation, special chars)
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Check whether the given non-command message constitutes spam.
 * Sends a chat warning if the threshold is reached.
 * Returns `true` if spam was detected (caller may choose to suppress further handling).
 */
export const checkSpam = (event: ChatMessageEvent): boolean => {
  if (getSpamWindowMs() === 0) return false;

  const userId = event.chatter_user_id;
  const now = Date.now();
  const norm = normalise(event.message.text);

  // Nothing meaningful left after stripping — don't track
  if (norm.length === 0) return false;

  let record = userRecords.get(userId);
  if (!record) {
    record = { lastNorm: '', recentTimestamps: [], lastWarnedAt: 0 };
    userRecords.set(userId, record);
  }

  // Evict timestamps outside the window
  record.recentTimestamps = record.recentTimestamps.filter(
    (ts) => now - ts < getSpamWindowMs()
  );

  // Reset window when the message content changes
  if (record.lastNorm !== norm) {
    record.lastNorm = norm;
    record.recentTimestamps = [];
  }

  record.recentTimestamps.push(now);

  if (record.recentTimestamps.length >= SPAM_THRESHOLD) {
    if (now - record.lastWarnedAt >= WARN_COOLDOWN_MS) {
      record.lastWarnedAt = now;
      sendChatMessage(messages.spamWarning(event.chatter_user_login));
    }
    return true;
  }

  return false;
};
