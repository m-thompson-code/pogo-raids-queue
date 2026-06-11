import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleInvitedCommand } from './invited.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../messages.js', () => ({
  messages: {
    raidMissingUsername: (u: string) => `raidMissingUsername:${u}`,
    invitedNotInQueue: (u: string) => `invitedNotInQueue:${u}`,
    invitedSuccess: 'invitedSuccess',
  },
}));
vi.mock('../detectables/shared.js', () => ({
  isInQueue: vi.fn(),
  getQueueEntryStatus: vi.fn(),
  setQueueEntryStatus: vi.fn(),
  isFirestoreListenerActive: vi.fn(),
}));
vi.mock('@pogo-raid-system/firebase', () => ({ getUser: vi.fn() }));
vi.mock('../providers/queue.js', () => ({
  queue: { setEntryStatus: vi.fn() },
}));
vi.mock('../persisted-settings.js', () => ({
  getInvitedCooldownMs: vi.fn(),
}));

import { sendChatMessage } from '../api/chat.js';
import {
  isInQueue,
  getQueueEntryStatus,
  setQueueEntryStatus,
  isFirestoreListenerActive,
} from '../detectables/shared.js';
import { getUser } from '@pogo-raid-system/firebase';
import { queue } from '../providers/queue.js';
import { getInvitedCooldownMs } from '../persisted-settings.js';

const makeEvent = (userId = 'u1', login = 'moo') => ({
  chatter_user_id: userId,
  chatter_user_login: login,
  message: { text: '!invited' },
  badges: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getInvitedCooldownMs).mockReturnValue(0);
  vi.mocked(isFirestoreListenerActive).mockReturnValue(false);
  vi.mocked(queue.setEntryStatus).mockResolvedValue(undefined);
});

describe('handleInvitedCommand', () => {
  it('sends raidMissingUsername when user is not in queue and has no pogo username', async () => {
    vi.mocked(isInQueue).mockReturnValue(false);
    vi.mocked(getUser).mockResolvedValue(null);

    await handleInvitedCommand(makeEvent() as any);

    expect(sendChatMessage).toHaveBeenCalledWith('raidMissingUsername:moo');
  });

  it('sends invitedNotInQueue when user is not in queue but has a pogo username', async () => {
    vi.mocked(isInQueue).mockReturnValue(false);
    vi.mocked(getUser).mockResolvedValue({ pogoUsername: 'TrainerAsh' } as any);

    await handleInvitedCommand(makeEvent() as any);

    expect(sendChatMessage).toHaveBeenCalledWith('invitedNotInQueue:moo');
  });

  it('does nothing when user is already marked as invited', async () => {
    vi.mocked(isInQueue).mockReturnValue(true);
    vi.mocked(getQueueEntryStatus).mockReturnValue('invited');

    await handleInvitedCommand(makeEvent() as any);

    expect(queue.setEntryStatus).not.toHaveBeenCalled();
    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it('marks the user as invited and sends success message', async () => {
    vi.mocked(isInQueue).mockReturnValue(true);
    vi.mocked(getQueueEntryStatus).mockReturnValue('joined');
    vi.mocked(getInvitedCooldownMs).mockReturnValue(0);

    await handleInvitedCommand(makeEvent() as any);

    expect(queue.setEntryStatus).toHaveBeenCalledWith('u1', 'invited');
    expect(sendChatMessage).toHaveBeenCalledWith('invitedSuccess');
  });

  it('falls back to setQueueEntryStatus when queue.setEntryStatus throws and firestore is inactive', async () => {
    vi.mocked(isInQueue).mockReturnValue(true);
    vi.mocked(getQueueEntryStatus).mockReturnValue('joined');
    vi.mocked(isFirestoreListenerActive).mockReturnValue(false);
    vi.mocked(queue.setEntryStatus).mockRejectedValue(new Error('db error'));
    vi.mocked(getInvitedCooldownMs).mockReturnValue(0);

    await handleInvitedCommand(makeEvent() as any);

    expect(setQueueEntryStatus).toHaveBeenCalledWith('u1', 'invited');
    expect(sendChatMessage).toHaveBeenCalledWith('invitedSuccess');
  });

  it('updates local state when firestore listener is active', async () => {
    vi.mocked(isInQueue).mockReturnValue(true);
    vi.mocked(getQueueEntryStatus).mockReturnValue('joined');
    vi.mocked(isFirestoreListenerActive).mockReturnValue(true);

    await handleInvitedCommand(makeEvent() as any);

    expect(setQueueEntryStatus).not.toHaveBeenCalled();
  });

  it('skips success message when cooldown has not elapsed', async () => {
    // Use fake timers far in the future so the first call always passes the
    // cooldown gate regardless of what prior tests set for lastInvitedMessageAt.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));

    vi.mocked(isInQueue).mockReturnValue(true);
    vi.mocked(getQueueEntryStatus).mockReturnValue('joined');
    vi.mocked(getInvitedCooldownMs).mockReturnValue(60_000);

    // First call at t=0 — sends the message
    await handleInvitedCommand(makeEvent('u1', 'moo') as any);
    expect(sendChatMessage).toHaveBeenCalledWith('invitedSuccess');
    vi.clearAllMocks();

    // Second call immediately (no time advance) — cooldown still active
    vi.mocked(isInQueue).mockReturnValue(true);
    vi.mocked(getQueueEntryStatus).mockReturnValue('joined');
    vi.mocked(getInvitedCooldownMs).mockReturnValue(60_000);

    await handleInvitedCommand(makeEvent('u2', 'trainer') as any);
    expect(sendChatMessage).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
