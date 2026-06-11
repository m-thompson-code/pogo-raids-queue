// ─────────────────────────────────────────────────────────────────────────────
// Message flags
//
// Each flag independently characterises one aspect of a chat message.
// runDetectables (detectables/main.ts) combines them to decide what to say.
// All functions accept an already-lowercased, trimmed string.
// ─────────────────────────────────────────────────────────────────────────────

import { FRIEND_CODE_RAW, formatFriendCode } from '../friend-code.js';

/** Matches messages that include a pleading word. */
export const BEGGING_PATTERNS = [
  /\b(please|plz|pls)\b/,
];

/** True if the message contains a pleading/begging word. */
export const isBegging = (lower: string): boolean =>
  BEGGING_PATTERNS.some((p) => p.test(lower));

// ─────────────────────────────────────────────────────────────────────────────

/** Matches messages where the user is explicitly requesting to be added/invited. */
export const REQUESTING_PATTERNS = [
  // "add me/my" / "invite me/my" / "add <username>" / "invite <username>"
  /\b(add|invite)\s+(me|my|[a-z0-9_]{3,})\b/,
  /\bput\s+(me|my)\s+(in|on)\b/,
  /\bget\s+(me|my)?\s*in\b/,
  /\badded\s+to\b/,
  /\bsign\s+(me|my)\s+up\b/,
  /\bjoin\s+(the\s+)?(raid|queue)\b/,
  /\bmy\s+code\s+is\b/,
  // "username for pokemon" shorthand — e.g. "3moo5u for groupon" or "3moo5u for the groupon" (optional plz/pls/please suffix)
  /^\S{3,}\s+for\s+(the\s+)?\S{3,}(\s+(plz|pls|please))?\s*$/,
];

/** True if the message is explicitly requesting to be added or invited to the raid. */
export const isRequesting = (lower: string): boolean => {
  if (/\b(not|won't|wont|never)\s+(join|joining)\b/.test(lower)) return false;
  if (/\badd\s+(me|you|them)\s+back\b/.test(lower)) return false;
  return REQUESTING_PATTERNS.some((p) => p.test(lower));
};

// ─────────────────────────────────────────────────────────────────────────────

/** Matches messages where the user is asking how to join. */
export const ASKING_QUESTION_PATTERNS = [
  /\bhow\s+(do\s+i|can\s+i|to)\b/,
  /\bcan\s+(i|u)\s+join\b/,
  /\bwhat'?s?\s+(your|the|is)\s+(\w+\s+)?code\b/,
];

/** True if the message is asking how to participate in the raid. */
export const isAskingQuestion = (lower: string): boolean =>
  ASKING_QUESTION_PATTERNS.some((p) => p.test(lower));

// ─────────────────────────────────────────────────────────────────────────────

/** Matches the word "code", "fc", "friend request", or a literal Pokémon GO friend code (12 digits or 3×4 digits). */
export const CODE_PATTERNS = [
  /\bcode\b/,
  /\bfc\b/,
  /\bfriend\s+request\b/,
  /\b\d{12}\b/,
  /\b\d{4}\s\d{4}\s\d{4}\b/,
];

/** The broadcaster's own code in both formats, pre-built for fast exclusion. */
const BROADCASTER_CODE_FORMATTED = formatFriendCode().toLowerCase();
const BROADCASTER_CODE_RAW = FRIEND_CODE_RAW.toLowerCase();

// ─────────────────────────────────────────────────────────────────────────────

/** Matches messages that mention joining a queue or list. */
export const QUEUE_PATTERNS = [
  /\b(join|queue|que|list)\b/,
];

/** True if the message mentions joining, a queue, or a list. */
export const involvesQueue = (lower: string): boolean =>
  QUEUE_PATTERNS.some((p) => p.test(lower));

// ─────────────────────────────────────────────────────────────────────────────

/** Matches messages that mention a raid or queue. */
export const RAID_PATTERNS = [
  /\b(raid|queue|que)\b/,
];

/** True if the message mentions a raid or queue. */
export const involvesRaid = (lower: string): boolean =>
  RAID_PATTERNS.some((p) => p.test(lower));

// ─────────────────────────────────────────────────────────────────────────────

/**
 * True if the message mentions the word "code" or contains a literal friend code,
 * but only when it is NOT the broadcaster's own code (which is already known).
 */
export const involvesCode = (lower: string): boolean => {
  if (lower.includes(BROADCASTER_CODE_FORMATTED) || lower.includes(BROADCASTER_CODE_RAW)) return false;
  return CODE_PATTERNS.some((p) => p.test(lower));
};
