import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGroupsCommand } from './groups.js';

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
  message: { text: '!groups' },
  badges: [],
});

beforeEach(() => vi.clearAllMocks());

describe('handleGroupsCommand', () => {
  it('sends empty message when queue is empty', async () => {
    await handleGroupsCommand(makeEvent() as any, mockProvider([]));
    expect(sendChatMessage).toHaveBeenCalledWith('listEmpty');
  });

  it('sends a single group when queue has 5 or fewer entries', async () => {
    const entries = ['A', 'B', 'C'].map(makeEntry);
    await handleGroupsCommand(makeEvent() as any, mockProvider(entries));
    expect(sendChatMessage).toHaveBeenCalledWith('A, B, C');
  });

  it('splits into groups of 5 separated by em dash', async () => {
    const entries = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(makeEntry);
    await handleGroupsCommand(makeEvent() as any, mockProvider(entries));
    expect(sendChatMessage).toHaveBeenCalledWith('A, B, C, D, E — F, G');
  });
});
