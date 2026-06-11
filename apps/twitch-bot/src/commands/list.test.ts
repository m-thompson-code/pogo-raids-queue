import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleListCommand } from './list.js';

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
  message: { text: '!list' },
  badges: [],
});

beforeEach(() => vi.clearAllMocks());

describe('handleListCommand', () => {
  it('sends empty message when queue is empty', async () => {
    vi.mocked(queue.getQueue).mockResolvedValue([]);
    await handleListCommand(makeEvent() as any);
    expect(sendChatMessage).toHaveBeenCalledWith('listEmpty');
  });

  it('lists comma-separated pogo usernames', async () => {
    vi.mocked(queue.getQueue).mockResolvedValue(['Ash', 'Misty', 'Brock'].map(makeEntry));
    await handleListCommand(makeEvent() as any);
    expect(sendChatMessage).toHaveBeenCalledWith('Ash,Misty,Brock');
  });
});
