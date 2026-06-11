import { getUser } from '@pogo-raid-system/firebase';
import { sendChatMessage } from '../api/chat.js';
import { messages } from '../messages.js';
import { isQueueOpen } from '../queue-state.js';
import { getHintCooldownMs } from '../persisted-settings.js';
import type { ChatMessageEvent } from '../types.js';
import { isBegging, isRequesting, isAskingQuestion, involvesCode, involvesQueue, involvesRaid } from './flags.js';
import { successfulRaiders, isPrivilegedUser, isFirstTimeChatter, markFirstTimeChatter, usersThatHaveRaidedBefore } from './shared.js';

let lastHintAt = 0;

/**
 * Pure detection: returns the hint message to send, or null if no hint applies.
 * Does not send anything or modify state.
 *
 * Flags are combined in priority order:
 *   requesting + code                              → streamer won't add their code; prompt to add ours instead
 *   first time + (requesting | queue | raid)        → full !help message
 *   (asking | begging) + code                       → add-code-first hint (!code)
 *   literal "code" / "code?"                        → add-code-first hint
 *   (asking | begging) + requesting                 → use !raid command hint
 *   (asking | begging | requesting) + (queue | raid) → use !raid command hint
 */
export const detectHint = (event: ChatMessageEvent): string | null => {
  const lower = event.message.text.trim().toLowerCase();
  const firstTime = isFirstTimeChatter(event);
  const requesting = isRequesting(lower);
  const begging = isBegging(lower);
  const askingQuestion = isAskingQuestion(lower);
  const codeInvolved = involvesCode(lower);
  const queueInvolved = involvesQueue(lower);
  const raidInvolved = involvesRaid(lower);

  if (requesting && codeInvolved) return messages.hintStreamerWontAdd;
  if (firstTime && (requesting || queueInvolved || raidInvolved)) return messages.help;
  if (/^code\??$/i.test(lower)) return messages.hintAddCodeFirst;
  if ((askingQuestion || begging) && codeInvolved) return messages.hintAddCodeFirst;
  if ((askingQuestion || begging) && requesting) return messages.hintUseRaidCommand;
  if ((askingQuestion || begging || requesting) && (queueInvolved || raidInvolved)) return messages.hintUseRaidCommand;
  return null;
};

export const runDetectables = async (event: ChatMessageEvent): Promise<void> => {
  if (!isQueueOpen()) return;
  if (event.reply && event.reply.parent_user_id !== event.broadcaster_user_id) return;
  if (isPrivilegedUser(event)) return;
  if (successfulRaiders.has(event.chatter_user_id)) return;

  // Look up whether this user has raided before, caching the result so Firestore
  // is queried at most once per user per session.
  // false = no record or raidCount 0 → mark as first-time chatter.
  // true  = has raided before → skip the hint.
  if (!usersThatHaveRaidedBefore.has(event.chatter_user_id)) {
    const user = await getUser(event.chatter_user_id);
    const hasRaided = user !== null && (user.raidCount ?? 0) > 0;
    usersThatHaveRaidedBefore.set(event.chatter_user_id, hasRaided);
    if (!hasRaided) {
      markFirstTimeChatter(event.chatter_user_id);
    }
  }

  const reply = detectHint(event);
  if (reply === null) return;

  const now = Date.now();
  if (now - lastHintAt < getHintCooldownMs()) return;
  lastHintAt = now;
  await sendChatMessage(reply);
};
