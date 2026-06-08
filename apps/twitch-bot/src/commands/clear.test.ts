import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleClearCommand } from './clear.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../messages.js', () => ({
  messages: { clearSuccess: (u: string) => `clearSuccess:${u}` },
}));

import { sendChatMessage } from '../api/chat.js';
import type { QueueProvider } from '../providers/queue-provider.js';

const mockProvider = (): QueueProvider => ({
  clearQueue: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn(),
  addToQueue: vi.fn(),
  getQueue: vi.fn(),
  addManual: vi.fn(),
  removeByTwitchId: vi.fn(),
  removeByPogoUsername: vi.fn(),
});

const makeEvent = () => ({
  chatter_user_id: 'u1',
  chatter_user_login: 'moo',
  message: { text: '!clear' },
  badges: [],
});

beforeEach(() => vi.clearAllMocks());

describe('handleClearCommand', () => {
  it('calls clearQueue and sends confirmation', async () => {
    const provider = mockProvider();
    await handleClearCommand(makeEvent() as any, provider);
    expect(provider.clearQueue).toHaveBeenCalledOnce();
    expect(sendChatMessage).toHaveBeenCalledWith('clearSuccess:moo');
  });
});
