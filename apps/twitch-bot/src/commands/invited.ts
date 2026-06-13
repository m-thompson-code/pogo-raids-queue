import { sendChatMessage } from '../api/chat.js';
import { messages } from '../messages.js';
import {
  isInQueue,
  getQueueEntryStatus,
  setQueueEntryStatus,
  isFirestoreListenerActive,
} from '../detectables/shared.js';
import { getUser } from '@pogo-raid-system/firebase';
import { queue } from '../providers/queue.js';
import { getInvitedCooldownMs } from '../persisted-settings.js';
import type { ChatMessageEvent } from '../types.js';

let lastInvitedMessageAt = 0;

/**
 * Handles the `!invited` command (and aliases: !thank, !thankyou, !ty).
 *
 * 1. If the user has no pogo username linked → show the raid usage hint.
 * 2. If they have a username but aren't in the queue → tell them they're not queued.
 * 3. If they're in the queue and not already 'invited' → mark them as invited
 *    and send the thank-you message (subject to a configurable cooldown).
 */
export const handleInvitedCommand = async (
  event: ChatMessageEvent,
): Promise<void> => {
  const { chatter_user_id, chatter_user_login } = event;

  if (!isInQueue(chatter_user_id)) {
    const user = await getUser(chatter_user_id);
    if (!user?.pogoUsername) {
      await sendChatMessage(messages.raidMissingUsername(chatter_user_login));
      return;
    }
    const now = Date.now();
    const cooldownMs = getInvitedCooldownMs();
    if (cooldownMs === 0 || now - lastInvitedMessageAt >= cooldownMs) {
      lastInvitedMessageAt = now;
      await sendChatMessage(messages.invitedSuccess);
    }
    return;
  }

  if (getQueueEntryStatus(chatter_user_id) === 'invited') return;

  try {
    await queue.setEntryStatus(chatter_user_id, 'invited');
    if (!isFirestoreListenerActive()) setQueueEntryStatus(chatter_user_id, 'invited');
  } catch {
    setQueueEntryStatus(chatter_user_id, 'invited');
  }

  const now = Date.now();
  const cooldownMs = getInvitedCooldownMs();
  if (cooldownMs === 0 || now - lastInvitedMessageAt >= cooldownMs) {
    lastInvitedMessageAt = now;
    await sendChatMessage(messages.invitedSuccess);
  }
};
