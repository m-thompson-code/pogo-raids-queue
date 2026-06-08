import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleRemoveCommand } from './remove.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../messages.js', () => ({
  messages: {
    removeUsage: (u: string) => `removeUsage:${u}`,
    removeSuccess: (p: string) => `removeSuccess:${p}`,
    removeNotFound: (p: string) => `removeNotFound:${p}`,
  },
}));

import { sendChatMessage } from '../api/chat.js';
import type { QueueProvider } from '../providers/queue-provider.js';

const mockProvider = (removed: boolean): QueueProvider => ({
  removeByPogoUsername: vi.fn().mockResolvedValue(removed),
  upsertUser: vi.fn(),
  addToQueue: vi.fn(),
  clearQueue: vi.fn(),
  getQueue: vi.fn(),
  addManual: vi.fn(),
  removeByTwitchId: vi.fn(),
});

const makeEvent = (text: string) => ({
  chatter_user_id: 'u1',
  chatter_user_login: 'moo',
  message: { text },
  badges: [],
});

beforeEach(() => vi.clearAllMocks());

describe('handleRemoveCommand', () => {
  it('sends usage when no username provided', async () => {
    await handleRemoveCommand(makeEvent('!remove') as any, mockProvider(false));
    expect(sendChatMessage).toHaveBeenCalledWith('removeUsage:moo');
  });

  it('confirms removal when user found', async () => {
    await handleRemoveCommand(makeEvent('!remove TrainerAsh') as any, mockProvider(true));
    expect(sendChatMessage).toHaveBeenCalledWith('removeSuccess:TrainerAsh');
  });

  it('sends not found when user is not in queue', async () => {
    await handleRemoveCommand(makeEvent('!remove TrainerAsh') as any, mockProvider(false));
    expect(sendChatMessage).toHaveBeenCalledWith('removeNotFound:TrainerAsh');
  });
});
