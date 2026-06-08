import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAddCommand } from './add.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../messages.js', () => ({
  messages: {
    addUsage: (u: string) => `addUsage:${u}`,
    addSuccess: (listed: string, noun: string) => `addSuccess:${listed}:${noun}`,
  },
}));

import { sendChatMessage } from '../api/chat.js';
import type { QueueProvider } from '../providers/queue-provider.js';

const mockProvider = (): QueueProvider => ({
  addManual: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn(),
  addToQueue: vi.fn(),
  clearQueue: vi.fn(),
  getQueue: vi.fn(),
  removeByTwitchId: vi.fn(),
  removeByPogoUsername: vi.fn(),
});

const makeEvent = (text: string) => ({
  chatter_user_id: 'u1',
  chatter_user_login: 'moo',
  message: { text },
  badges: [],
});

beforeEach(() => vi.clearAllMocks());

describe('handleAddCommand', () => {
  it('sends usage message when no username provided', async () => {
    const provider = mockProvider();
    await handleAddCommand(makeEvent('!add') as any, provider);
    expect(sendChatMessage).toHaveBeenCalledWith('addUsage:moo');
    expect(provider.addManual).not.toHaveBeenCalled();
  });

  it('adds a single username', async () => {
    const provider = mockProvider();
    await handleAddCommand(makeEvent('!add TrainerAsh') as any, provider);
    expect(provider.addManual).toHaveBeenCalledOnce();
    expect(provider.addManual).toHaveBeenCalledWith('TrainerAsh');
    expect(sendChatMessage).toHaveBeenCalledWith('addSuccess:TrainerAsh:has');
  });

  it('adds multiple comma-separated usernames', async () => {
    const provider = mockProvider();
    await handleAddCommand(makeEvent('!add Ash,Misty,Brock') as any, provider);
    expect(provider.addManual).toHaveBeenCalledTimes(3);
    expect(sendChatMessage).toHaveBeenCalledWith('addSuccess:Ash, Misty, Brock:have');
  });
});
