import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleRaidCommand } from './raid.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../messages.js', () => ({
  messages: {
    raidQueueClosed: (u: string) => `raidQueueClosed:${u}`,
    raidMissingUsername: (u: string) => `raidMissingUsername:${u}`,
    raidInvalidUsername: (u: string) => `raidInvalidUsername:${u}`,
    raidAdded: (p: string) => `raidAdded:${p}`,
  },
}));
vi.mock('../queue-state.js', () => ({ isQueueOpen: vi.fn() }));
vi.mock('../detectables/shared.js', () => ({ markRaidSuccess: vi.fn(), isFirstTimeChatter: vi.fn().mockReturnValue(false) }));
vi.mock('@pogo-raid-system/firebase', () => ({ getUser: vi.fn() }));

import { sendChatMessage } from '../api/chat.js';
import { isQueueOpen } from '../queue-state.js';
import { markRaidSuccess } from '../detectables/shared.js';
import { getUser } from '@pogo-raid-system/firebase';
import type { QueueProvider } from '../providers/queue-provider.js';

const mockProvider = (): QueueProvider => ({
  upsertUser: vi.fn().mockResolvedValue(undefined),
  addToQueue: vi.fn().mockResolvedValue(undefined),
  clearQueue: vi.fn(),
  getQueue: vi.fn(),
  addManual: vi.fn(),
  removeByTwitchId: vi.fn(),
  removeByPogoUsername: vi.fn(),
});

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
    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any, mockProvider());
    expect(sendChatMessage).toHaveBeenCalledWith('raidQueueClosed:moo');
  });

  it('sends usage when no pogo username provided', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(getUser).mockResolvedValue(null);
    await handleRaidCommand(makeEvent('!raid') as any, mockProvider());
    expect(sendChatMessage).toHaveBeenCalledWith('raidMissingUsername:moo');
  });

  it('re-uses stored pogo username when no argument provided', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    vi.mocked(getUser).mockResolvedValue({ pogoUsername: 'TrainerAsh' } as any);
    const provider = mockProvider();
    await handleRaidCommand(makeEvent('!raid') as any, provider);
    expect(provider.upsertUser).toHaveBeenCalledOnce();
    expect(provider.addToQueue).toHaveBeenCalledOnce();
    expect(markRaidSuccess).toHaveBeenCalledWith('u1');
    expect(sendChatMessage).toHaveBeenCalledWith('raidAdded:TrainerAsh');
  });

  it('rejects invalid pogo username characters', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    await handleRaidCommand(makeEvent('!raid invalid!name') as any, mockProvider());
    expect(sendChatMessage).toHaveBeenCalledWith('raidInvalidUsername:moo');
  });

  it('upserts user, adds to queue, and confirms on success', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    const provider = mockProvider();
    await handleRaidCommand(makeEvent('!raid TrainerAsh') as any, provider);
    expect(provider.upsertUser).toHaveBeenCalledOnce();
    expect(provider.addToQueue).toHaveBeenCalledOnce();
    expect(markRaidSuccess).toHaveBeenCalledWith('u1');
    expect(sendChatMessage).toHaveBeenCalledWith('raidAdded:TrainerAsh');
  });

  it('sets isSubscriber true for subscriber badge', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    const provider = mockProvider();
    await handleRaidCommand(
      makeEvent('!raid TrainerAsh', [{ set_id: 'subscriber' }]) as any,
      provider
    );
    expect(provider.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ isSubscriber: true })
    );
  });

  it('sets isSubscriber true for founder badge', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    const provider = mockProvider();
    await handleRaidCommand(
      makeEvent('!raid TrainerAsh', [{ set_id: 'founder' }]) as any,
      provider
    );
    expect(provider.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ isSubscriber: true })
    );
  });

  it('sets isVip true for vip badge', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(true);
    const provider = mockProvider();
    await handleRaidCommand(
      makeEvent('!raid TrainerAsh', [{ set_id: 'vip' }]) as any,
      provider
    );
    expect(provider.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ isVip: true })
    );
  });
});
