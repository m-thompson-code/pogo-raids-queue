import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGroupsCommand } from './groups.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../messages.js', () => ({
  messages: { listEmpty: () => 'listEmpty' },
}));
vi.mock('../providers/queue.js', () => ({ queue: { getQueue: vi.fn() } }));

import { sendChatMessage } from '../api/chat.js';
import { queue } from '../providers/queue.js';

const makeEntry = (pogoUsername: string) => ({
  pogoUsername,
  twitchUserId: 'u1',
  twitchUsername: 'moo',
  isSubscriber: false,
  isVip: false,
  joinedAt: new Date(),
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
    vi.mocked(queue.getQueue).mockResolvedValue([]);
    await handleGroupsCommand(makeEvent() as any);
    expect(sendChatMessage).toHaveBeenCalledWith('listEmpty');
  });

  it('sends a single group when queue has 5 or fewer entries', async () => {
    vi.mocked(queue.getQueue).mockResolvedValue(['A', 'B', 'C'].map(makeEntry));
    await handleGroupsCommand(makeEvent() as any);
    expect(sendChatMessage).toHaveBeenCalledWith('A, B, C');
  });

  it('splits into groups of 5 separated by em dash', async () => {
    vi.mocked(queue.getQueue).mockResolvedValue(['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(makeEntry));
    await handleGroupsCommand(makeEvent() as any);
    expect(sendChatMessage).toHaveBeenCalledWith('A, B, C, D, E — F, G');
  });
});
