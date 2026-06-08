import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleLeaveCommand } from './leave.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../messages.js', () => ({
  messages: { leaveRemoved: (u: string) => `leaveRemoved:${u}` },
}));

import { sendChatMessage } from '../api/chat.js';
import type { QueueProvider } from '../providers/queue-provider.js';

const mockProvider = (returnedPogo: string | null): QueueProvider => ({
  removeByTwitchId: vi.fn().mockResolvedValue(returnedPogo),
  upsertUser: vi.fn(),
  addToQueue: vi.fn(),
  clearQueue: vi.fn(),
  getQueue: vi.fn(),
  addManual: vi.fn(),
  removeByPogoUsername: vi.fn(),
});

const makeEvent = () => ({
  chatter_user_id: 'u1',
  chatter_user_login: 'moo',
  message: { text: '!leave' },
  badges: [],
});

beforeEach(() => vi.clearAllMocks());

describe('handleLeaveCommand', () => {
  it('confirms with pogo username when found', async () => {
    await handleLeaveCommand(makeEvent() as any, mockProvider('TrainerAsh'));
    expect(sendChatMessage).toHaveBeenCalledWith('leaveRemoved:TrainerAsh');
  });

  it('falls back to twitch username when not in queue', async () => {
    await handleLeaveCommand(makeEvent() as any, mockProvider(null));
    expect(sendChatMessage).toHaveBeenCalledWith('leaveRemoved:moo');
  });
});
