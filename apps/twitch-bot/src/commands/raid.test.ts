import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleRaidCommand } from './raid.js';

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
    raidRejoinedQueue: (p: string) => `raidRejoinedQueue:${p}`,
  },
}));
vi.mock('../queue-state.js', () => ({ isQueueOpen: vi.fn() }));
vi.mock('../detectables/shared.js', () => ({
  markRaidSuccess: vi.fn(),
  markInQueue: vi.fn(),
  isInQueue: vi.fn().mockReturnValue(false),
  isFirstTimeChatter: vi.fn().mockReturnValue(false),
  isFirestoreListenerActive: vi.fn().mockReturnValue(false),
  getQueueEntryStatus: vi.fn().mockReturnValue(undefined),
  setQueueEntryStatus: vi.fn(),
}));
vi.mock('@pogo-raid-system/firebase', () => ({ getUser: vi.fn() }));
vi.mock('../providers/queue.js', () => ({
  queue: {
    upsertUser: vi.fn().mockResolvedValue(undefined),
    addToQueue: vi.fn().mockResolvedValue(undefined),
    setEntryStatus: vi.fn().mockResolvedValue(undefined),
  },
}));

import { sendChatMessage } from '../api/chat.js';
import { isQueueOpen } from '../queue-state.js';
import { markRaidSuccess, markInQueue, isInQueue, isFirestoreListenerActive, getQueueEntryStatus, setQueueEntryStatus } from '../detectables/shared.js';
import { getUser } from '@pogo-raid-system/firebase';
import { queue } from '../providers/queue.js';

const makeEvent = (text: string, badges: { set_id: string }[] = []) => ({
  chatter_user_id: 'u1',
  chatter_user_login: 'moo',
  message: { text },
  badges,
});

beforeEach(() => vi.clearAllMocks());

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
    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any);
    expect(queue.setEntryStatus).toHaveBeenCalledWith('u1', 'joined');
    expect(sendChatMessage).toHaveBeenCalledWith(expect.stringContaining('TrainerAsh'));
  });

  it('updates local status when listener is inactive and user re-joins from invited', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(isInQueue).mockReturnValue(true);
    vi.mocked(getQueueEntryStatus).mockReturnValue('invited');
    vi.mocked(isFirestoreListenerActive).mockReturnValue(false);
    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any);
    expect(setQueueEntryStatus).toHaveBeenCalledWith('u1', 'joined');
  });

  it('sends already-in-queue when user raids again and is already joined', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(isInQueue).mockReturnValue(true);
    vi.mocked(getQueueEntryStatus).mockReturnValue('joined');
    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any);
    expect(sendChatMessage).toHaveBeenCalledWith('raidAlreadyInQueue');
  });
});

