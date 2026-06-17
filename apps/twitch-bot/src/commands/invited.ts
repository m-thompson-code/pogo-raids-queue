import { sendChatMessage } from '../api/chat.js';
import { messages } from '../messages.js';
import {
  isInQueue,
  getQueueEntryStatus,
  setQueueEntryStatus,
  isFirestoreListenerActive,
} from '../detectables/shared.js';
import { resetUserStrikes } from '@pogo-raid-system/firebase';
import { queue } from '../providers/queue.js';
import { getInvitedCooldownMs } from '../persisted-settings.js';
import type { ChatMessageEvent } from '../types.js';

let lastInvitedMessageAt = 0;

/**
 * Handles the `!invited` command (and aliases: !thank, !thankyou, !ty).
 *
 * 1. If the user isn't in the in-memory queue snapshot → tell them they're not queued.
 * 2. If they're in the queue and not already 'invited' → mark them as invited
 *    and send the thank-you message (subject to a configurable cooldown).
 */
export const handleInvitedCommand = async (
  event: ChatMessageEvent,
): Promise<void> => {
  const { chatter_user_id, chatter_user_login } = event;

  const announceJoinedSuccess = async (): Promise<void> => {
    await resetUserStrikes(chatter_user_id);
    const now = Date.now();
    const cooldownMs = getInvitedCooldownMs();
    if (cooldownMs === 0 || now - lastInvitedMessageAt >= cooldownMs) {
      lastInvitedMessageAt = now;
      await sendChatMessage(messages.invitedSuccess);
    }
  };

  if (!isInQueue(chatter_user_id)) {
    await sendChatMessage(messages.invitedNotInQueue(chatter_user_login));
    return;
  }

  if (getQueueEntryStatus(chatter_user_id) === 'invited') return;

  try {
    await queue.setEntryStatus(chatter_user_id, 'invited');
    if (!isFirestoreListenerActive()) setQueueEntryStatus(chatter_user_id, 'invited');
  } catch {
    setQueueEntryStatus(chatter_user_id, 'invited');
  }

  await announceJoinedSuccess();
};
