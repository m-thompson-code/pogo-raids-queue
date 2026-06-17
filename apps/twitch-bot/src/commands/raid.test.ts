import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleRaidCommand, __resetRaidRepeatWindowForTests } from './raid.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../messages.js', () => ({
  messages: {
    raidQueueClosed: (u: string) => `raidQueueClosed:${u}`,
    raidMissingUsername: (u: string) => `raidMissingUsername:${u}`,
    raidInvalidUsername: (u: string) => `raidInvalidUsername:${u}`,
    raidAdded: (p: string) => `raidAdded:${p}`,
    raidAddedUsernameSaved: (p: string) => `raidAddedUsernameSaved:${p}`,
    raidAddedFirstTime: (p: string) => `raidAddedFirstTime:${p}`,
    raidAlreadyInQueue: 'raidAlreadyInQueue',
    raidForgotJoinedStrike: (count: number) => `raidForgotJoinedStrike:${count}`,
    raidTimedOut: (p: string, ms: number) => `raidTimedOut:${p}:${ms}`,

    raidRejoinedQueue: (p: string) => `raidRejoinedQueue:${p}`,
    raidUsernameUpdated: (next: string, prev?: string) => `raidUsernameUpdated:${prev ?? ''}->${next}`,
  },
}));
vi.mock('../queue-state.js', () => ({ isQueueOpen: vi.fn() }));
vi.mock('../detectables/shared.js', () => ({
  markRaidSuccess: vi.fn(),
  unmarkRaidSuccess: vi.fn(),
  markInQueue: vi.fn(),
  unmarkInQueueByTwitchId: vi.fn(),
  isInQueue: vi.fn().mockReturnValue(false),
  isFirstTimeChatter: vi.fn().mockReturnValue(false),
  markFirstTimeChatter: vi.fn(),
  isFirestoreListenerActive: vi.fn().mockReturnValue(false),
  getQueueEntryStatus: vi.fn().mockReturnValue(undefined),
  setQueueEntryStatus: vi.fn(),
}));
vi.mock('@pogo-raid-system/firebase', () => ({ getUser: vi.fn(), strikeUser: vi.fn() }));
vi.mock('../providers/queue.js', () => ({
  queue: {
    upsertUser: vi.fn().mockResolvedValue(undefined),
    addToQueue: vi.fn().mockResolvedValue(undefined),
    addToTimedOutQueue: vi.fn().mockResolvedValue(undefined),
    removeByTwitchId: vi.fn().mockResolvedValue('TrainerAsh'),
    setEntryStatus: vi.fn().mockResolvedValue(undefined),
  },
}));

import { sendChatMessage } from '../api/chat.js';
import { isQueueOpen } from '../queue-state.js';
import { markRaidSuccess, markInQueue, isInQueue, isFirestoreListenerActive, getQueueEntryStatus, setQueueEntryStatus } from '../detectables/shared.js';
import { getUser, strikeUser } from '@pogo-raid-system/firebase';
import { queue } from '../providers/queue.js';

const makeEvent = (
  text: string,
  badges: { set_id: string }[] = [],
  { userId = 'u1', login = 'moo' }: { userId?: string; login?: string } = {}
) => ({
  chatter_user_id: userId,
  chatter_user_login: login,
  message: { text },
  badges,
});

beforeEach(() => {
  vi.clearAllMocks();
  __resetRaidRepeatWindowForTests();
});

const makeTimestamp = (iso: string) => ({ toDate: () => new Date(iso) });

describe('handleRaidCommand', () => {
  it('rejects when queue is closed', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(false);
    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any);
    expect(sendChatMessage).toHaveBeenCalledWith('raidQueueClosed:moo');
  });

  it('sends usage when no pogo username provided', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(getUser).mockResolvedValue(null);
    await handleRaidCommand(makeEvent('!raid') as any);
    expect(sendChatMessage).toHaveBeenCalledWith('raidMissingUsername:moo');
  });

  it('re-uses stored pogo username when no argument provided', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(getUser).mockResolvedValue({ pogoUsername: 'TrainerAsh' } as any);
    await handleRaidCommand(makeEvent('!raid') as any);
    expect(queue.upsertUser).toHaveBeenCalledOnce();
    expect(queue.addToQueue).toHaveBeenCalledOnce();
    expect(markRaidSuccess).toHaveBeenCalledWith('u1');
    expect(sendChatMessage).toHaveBeenCalledWith('raidAdded:TrainerAsh');
  });

  it('rejects invalid pogo username characters', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    await handleRaidCommand(makeEvent('!raid invalid!name') as any);
    expect(sendChatMessage).toHaveBeenCalledWith('raidInvalidUsername:moo');
  });

  it('upserts user, adds to queue, and confirms on success', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any);
    expect(queue.upsertUser).toHaveBeenCalledOnce();
    expect(queue.addToQueue).toHaveBeenCalledOnce();
    expect(markRaidSuccess).toHaveBeenCalledWith('u1');
    expect(sendChatMessage).toHaveBeenCalledWith(expect.stringContaining('TrainerAsh'));
  });

  it('sets isSubscriber true for subscriber badge', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    await handleRaidCommand(
      makeEvent('!raid TrainerAsh', [{ set_id: 'subscriber' }]) as any
    );
    expect(queue.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ isSubscriber: true })
    );
  });

  it('sets isSubscriber true for founder badge', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    await handleRaidCommand(
      makeEvent('!raid TrainerAsh', [{ set_id: 'founder' }]) as any
    );
    expect(queue.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ isSubscriber: true })
    );
  });

  it('does not set isSubscriber for Prime Gaming badge', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    await handleRaidCommand(
      makeEvent('!raid TrainerAsh', [{ set_id: 'premium' }]) as any
    );
    expect(queue.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ isSubscriber: false })
    );
  });

  it('marks in queue directly when listener is inactive', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(isFirestoreListenerActive).mockReturnValue(false);
    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any);
    expect(markInQueue).toHaveBeenCalledWith('u1', 'TrainerAsh');
  });

  it('does not mark in queue directly when listener is active', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(isFirestoreListenerActive).mockReturnValue(true);
    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any);
    expect(markInQueue).not.toHaveBeenCalled();
  });

  it('marks in queue directly on Firestore write failure and still confirms', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(queue.upsertUser).mockRejectedValueOnce(new Error('Firestore down'));
    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any);
    expect(markInQueue).toHaveBeenCalledWith('u1', 'TrainerAsh');
    expect(markRaidSuccess).toHaveBeenCalledWith('u1');
    expect(sendChatMessage).toHaveBeenCalledWith(expect.stringContaining('TrainerAsh'));
  });

  it('resets invited user back to joined when they raid again with username', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(isInQueue).mockReturnValue(true);
    vi.mocked(getQueueEntryStatus).mockReturnValue('invited');
    vi.mocked(getUser).mockResolvedValue({ pogoUsername: 'TrainerAsh' } as any);
    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any);
    expect(queue.setEntryStatus).toHaveBeenCalledWith('u1', 'joined');
    expect(sendChatMessage).toHaveBeenCalledWith(expect.stringContaining('TrainerAsh'));
  });

  it('updates local status when listener is inactive and user re-joins from invited', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(isInQueue).mockReturnValue(true);
    vi.mocked(getQueueEntryStatus).mockReturnValue('invited');
    vi.mocked(isFirestoreListenerActive).mockReturnValue(false);
    vi.mocked(getUser).mockResolvedValue({ pogoUsername: 'TrainerAsh' } as any);
    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any);
    expect(setQueueEntryStatus).toHaveBeenCalledWith('u1', 'joined');
  });

  it('returns already-in-queue message when !raid repeats within 5 minutes', async () => {
    const nowSpy = vi
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1_000_000)
      .mockReturnValueOnce(1_000_000 + 60_000);

    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(isInQueue)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any);
    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any);

    expect(sendChatMessage).toHaveBeenLastCalledWith('raidAlreadyInQueue');
    expect(strikeUser).not.toHaveBeenCalled();
    nowSpy.mockRestore();
  });

  it('strikes user and reminds !joined when re-raid uses same username while already joined', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(isInQueue).mockReturnValue(true);
    vi.mocked(getQueueEntryStatus).mockReturnValue('joined');
    vi.mocked(getUser).mockResolvedValue({ pogoUsername: 'TrainerAsh' } as any);
    vi.mocked(strikeUser).mockResolvedValue(2);
    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any);
    expect(strikeUser).toHaveBeenCalledWith('moo', 'u1');
    expect(sendChatMessage).toHaveBeenCalledWith('raidForgotJoinedStrike:2');
    expect(queue.addToTimedOutQueue).not.toHaveBeenCalled();
  });

  it('strikes user and reminds !joined when running !raid with no args while already joined', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(isInQueue).mockReturnValue(true);
    vi.mocked(getQueueEntryStatus).mockReturnValue('joined');
    vi.mocked(strikeUser).mockResolvedValue(1);

    await handleRaidCommand(makeEvent('!raid') as any);

    expect(strikeUser).toHaveBeenCalledWith('moo', 'u1');
    expect(sendChatMessage).toHaveBeenCalledWith('raidForgotJoinedStrike:1');
    expect(queue.addToTimedOutQueue).not.toHaveBeenCalled();
  });

  it('moves user from raidQueue to timedOutQueue when duplicate !raid reaches 3 strikes', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(isInQueue).mockReturnValue(true);
    vi.mocked(getQueueEntryStatus).mockReturnValue('joined');
    vi.mocked(getUser).mockResolvedValue({ pogoUsername: 'TrainerAsh' } as any);
    vi.mocked(strikeUser).mockResolvedValue(3);
    vi.mocked(isFirestoreListenerActive).mockReturnValue(false);

    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any);

    expect(queue.removeByTwitchId).toHaveBeenCalledWith('u1');
    expect(queue.addToTimedOutQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        twitchUserId: 'u1',
        twitchUsername: 'moo',
        pogoUsername: 'TrainerAsh',
      })
    );
    expect(markInQueue).not.toHaveBeenCalled();
  });

  it('updates queued username when user raids with a different username', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(isInQueue).mockReturnValue(true);
    vi.mocked(getQueueEntryStatus).mockReturnValue('joined');
    vi.mocked(getUser).mockResolvedValue({ pogoUsername: 'OldName' } as any);

    await handleRaidCommand(makeEvent('!raid NewName', [], { userId: 'u-update' }) as any);

    expect(queue.upsertUser).toHaveBeenCalledWith(expect.objectContaining({ pogoUsername: 'NewName' }));
    expect(queue.addToQueue).toHaveBeenCalledWith(expect.objectContaining({ pogoUsername: 'NewName' }));
    expect(markInQueue).toHaveBeenCalledWith('u-update', 'NewName');
    expect(sendChatMessage).toHaveBeenCalledWith('raidUsernameUpdated:OldName->NewName');
  });

  it('routes timed-out users to timedOutQueue instead of raidQueue', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(isInQueue).mockReturnValue(false);
    vi.mocked(getUser).mockResolvedValue({
      timedOutAt: makeTimestamp('2099-01-01T00:00:00.000Z'),
    } as any);

    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any);

    expect(queue.addToTimedOutQueue).toHaveBeenCalledWith(
      expect.objectContaining({ twitchUserId: 'u1', pogoUsername: 'TrainerAsh' })
    );
    expect(queue.removeByTwitchId).toHaveBeenCalledWith('u1');
    expect(queue.addToQueue).not.toHaveBeenCalled();
    expect(sendChatMessage).toHaveBeenCalledWith(expect.stringContaining('raidTimedOut:TrainerAsh'));
  });

  it('routes users with 3+ strikes and active timedOutAt to timedOutQueue in a single !raid flow', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(isInQueue).mockReturnValue(false);
    vi.mocked(getUser).mockResolvedValue({
      strikes: 3,
      timedOutAt: makeTimestamp('2099-01-01T00:00:00.000Z'),
      pogoUsername: 'TrainerAsh',
    } as any);

    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any);

    expect(queue.addToTimedOutQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        twitchUserId: 'u1',
        twitchUsername: 'moo',
        pogoUsername: 'TrainerAsh',
      })
    );
    expect(queue.removeByTwitchId).toHaveBeenCalledWith('u1');
    expect(queue.addToQueue).not.toHaveBeenCalled();
  });

  it('allows normal queue join after timeout window passes', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(isInQueue).mockReturnValue(false);
    vi.mocked(getUser).mockResolvedValue({
      timedOutAt: makeTimestamp('2000-01-01T00:00:00.000Z'),
    } as any);

    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any);

    expect(queue.addToQueue).toHaveBeenCalledOnce();
    expect(queue.addToTimedOutQueue).not.toHaveBeenCalled();
  });

  it('shows timeout-remaining message on repeat !raid even while isInQueue is still true', async () => {
    // Simulates the race where isInQueue is still true because the Firestore listener
    // hasn't propagated the removal yet, but the user is already in the timedOutUsers set.
    vi.mocked(isQueueOpen).mockReturnValue(true);
    // First call: not in queue → goes to fresh join path → timed out
    vi.mocked(isInQueue).mockReturnValueOnce(false);
    vi.mocked(getUser).mockResolvedValue({
      timedOutAt: makeTimestamp('2099-01-01T00:00:00.000Z'),
    } as any);
    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any);

    vi.clearAllMocks();

    // Second call: isInQueue is still true (listener lag), but timedOutUsers has them
    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(isInQueue).mockReturnValue(true);
    vi.mocked(getUser).mockResolvedValue({
      timedOutAt: makeTimestamp('2099-01-01T00:00:00.000Z'),
    } as any);
    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any);

    expect(sendChatMessage).not.toHaveBeenCalledWith('raidAlreadyInQueue');
    expect(sendChatMessage).toHaveBeenCalledWith(expect.stringContaining('raidTimedOut:TrainerAsh'));
  });
});

