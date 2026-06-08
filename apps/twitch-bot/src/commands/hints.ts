import { sendChatMessage } from '../chat.js';
import { messages } from '../messages.js';
import { isQueueOpen } from '../queue-state.js';
import { getHintCooldownMs, setHintCooldownSeconds } from '../persisted-settings.js';
import type { ChatMessageEvent } from '../types.js';

// Patterns: user knows they want to join but isn't using the command
export const ADD_REQUEST_PATTERNS = [
  /\badd\s+me\b/,
  /\bplz\s+add\b/,
  /\bpls\s+add\b/,
  /\bplease\s+add\b/,
  /\bcan\s+(you|u|someone|sum1)\s+add\b/,
  /\bput\s+me\s+(in|on)\b/,
  /\bsign\s+me\s+up\b/,
  /\binvite\s+me\b/,
  // "username for pokemon" or "username for pokemon plz"
  /^\S+\s+for\s+\S+(\s+(plz|pls|please))?\s*$/,
];

// Patterns: user is asking how to join (needs the full flow)
export const HOW_TO_JOIN_PATTERNS = [
  /\bcan\s+(i|i)\s+join\b/,
  /\bjoin\s+(the\s+)?(raid|queue)\b/,
  /\bhow\s+(do\s+i|can\s+i)\s+join\b/,
];

/** Returns true if the message looks like a "just add me" request. */
export const isAddRequest = (text: string): boolean =>
  ADD_REQUEST_PATTERNS.some((pattern) => pattern.test(text.trim().toLowerCase()));

/** Returns true if the message looks like a "how do I join" question. */
export const isHowToJoinRequest = (text: string): boolean =>
  HOW_TO_JOIN_PATTERNS.some((pattern) => pattern.test(text.trim().toLowerCase()));

/** Returns true if the message matches either join request type. */
export const isJoinRequest = (text: string): boolean =>
  isAddRequest(text) || isHowToJoinRequest(text);

// Patterns that suggest someone is asking for the raid friend code
export const CODE_REQUEST_PATTERNS = [
  /\bwhat('?s|\s+is)\s+the\s+code\b/,
  /\bthe\s+code\??$/,
  /\bcode\s*\??$/,
  /\bcan\s+(i|u|we)\s+(get|have|see)\s+the\s+code\b/,
  /\bsend\s+(the\s+)?code\b/,
  /\bgive\s+(me\s+)?the\s+code\b/,
  // Exclude "friend code please" (user wants streamer to accept, not asking for the code)
  /(?<!friend )\bcode\s+(please|pls|plz)\b/,
];

// Patterns where the user is sharing their own code expecting the streamer to add them
export const STREAMER_ADD_REQUEST_PATTERNS = [
  /\b(invite|add)\s+me\b.*\d{4,}/,
];

/** Returns true if the message text looks like a request for the raid code. */
export const isCodeRequest = (text: string): boolean =>
  CODE_REQUEST_PATTERNS.some((pattern) => pattern.test(text.trim().toLowerCase()));

/** Returns true if the user is sharing their own friend code expecting the streamer to add them. */
export const isStreamerAddRequest = (text: string): boolean =>
  STREAMER_ADD_REQUEST_PATTERNS.some((pattern) => pattern.test(text.trim().toLowerCase()));

/** Returns true if either code-related pattern matches (used to suppress join hints). */
export const isAnyCodeRelated = (text: string): boolean =>
  isCodeRequest(text) || isStreamerAddRequest(text);

// Global cooldowns — once a hint fires, no one can trigger it again until the cooldown expires
let lastJoinHintAt = 0;
let lastCodeHintAt = 0;

/** Twitch user IDs that have successfully used !raid this session. */
const successfulRaiders = new Set<string>();

/** Called by the raid command handler after a successful queue entry. */
export const markRaidSuccess = (twitchUserId: string): void => {
  successfulRaiders.add(twitchUserId);
};

/**
 * Handles the `!hintcooldown <seconds>` command.
 * Sets how long (in seconds) before the same user gets hinted again.
 */
export const handleHintCooldownCommand = async (
  event: ChatMessageEvent
): Promise<void> => {
  const parts = event.message.text.trim().split(/\s+/);
  const raw = parts[1]?.trim();
  const seconds = raw !== undefined ? parseInt(raw, 10) : NaN;

  if (isNaN(seconds) || seconds < 0) {
    await sendChatMessage(
      `@${event.chatter_user_login} Usage: !hintcooldown <seconds>`
    );
    return;
  }

  setHintCooldownSeconds(seconds);
  await sendChatMessage(
    `@${event.chatter_user_login} Hint cooldown set to ${seconds} second${seconds === 1 ? '' : 's'}.`
  );
};

/**
 * Checks if a non-command message looks like a queue join request
 * and nudges the user toward !raid if so.
 */
export const maybeHintRaidCommand = async (event: ChatMessageEvent): Promise<void> => {
  if (!isQueueOpen()) return;
  if (successfulRaiders.has(event.chatter_user_id)) return;

  const text = event.message.text.trim();
  const lower = text.toLowerCase();

  // Let maybeHintCode handle messages that look like a code request
  if (isAnyCodeRelated(lower)) return;

  if (isHowToJoinRequest(lower)) {
    const now = Date.now();
    if (now - lastJoinHintAt < getHintCooldownMs()) return;
    lastJoinHintAt = now;
    await sendChatMessage(messages.hintHowToJoin(event.chatter_user_login));
  } else if (isAddRequest(lower)) {
    const now = Date.now();
    if (now - lastJoinHintAt < getHintCooldownMs()) return;
    lastJoinHintAt = now;
    await sendChatMessage(messages.hintRaidCommand(event.chatter_user_login));
  }
};

// Separate cooldown for code hints to avoid interfering with join hints
/**
 * Checks if a non-command message is asking for the raid friend code
 * and replies with it.
 */
export const maybeHintCode = async (event: ChatMessageEvent): Promise<void> => {
  if (successfulRaiders.has(event.chatter_user_id)) return;
  const text = event.message.text.trim();
  const lower = text.toLowerCase();

  const now = Date.now();
  if (now - lastCodeHintAt < getHintCooldownMs()) return;

  if (isStreamerAddRequest(lower)) {
    lastCodeHintAt = now;
    await sendChatMessage(messages.hintAddStreamer(event.chatter_user_login));
  } else if (isCodeRequest(lower)) {
    lastCodeHintAt = now;
    await sendChatMessage(messages.hintCode(event.chatter_user_login));
  }
};
