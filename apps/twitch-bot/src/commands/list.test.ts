import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleListCommand } from './list.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../messages.js', () => ({
  messages: { listEmpty: () => 'listEmpty' },
}));

import { sendChatMessage } from '../api/chat.js';
import type { QueueProvider } from '../providers/queue-provider.js';

const makeEntry = (pogoUsername: string) => ({
  pogoUsername,
  twitchUserId: 'u1',
  twitchUsername: 'moo',
  isSubscriber: false,
  isVip: false,
  joinedAt: new Date(),
});

const mockProvider = (entries: ReturnType<typeof makeEntry>[]): QueueProvider => ({
  getQueue: vi.fn().mockResolvedValue(entries),
  upsertUser: vi.fn(),
  addToQueue: vi.fn(),
  clearQueue: vi.fn(),
  addManual: vi.fn(),
  removeByTwitchId: vi.fn(),
  removeByPogoUsername: vi.fn(),
});

const makeEvent = () => ({
  chatter_user_id: 'u1',
  chatter_user_login: 'moo',
  message: { text: '!list' },
  badges: [],
});

beforeEach(() => vi.clearAllMocks());

describe('handleListCommand', () => {
  it('sends empty message when queue is empty', async () => {
    await handleListCommand(makeEvent() as any, mockProvider([]));
    expect(sendChatMessage).toHaveBeenCalledWith('listEmpty');
  });

  it('lists comma-separated pogo usernames', async () => {
    const entries = ['Ash', 'Misty', 'Brock'].map(makeEntry);
    await handleListCommand(makeEvent() as any, mockProvider(entries));
    expect(sendChatMessage).toHaveBeenCalledWith('Ash,Misty,Brock');
  });
});
