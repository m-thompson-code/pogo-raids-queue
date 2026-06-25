import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleClearCommand } from './clear.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../messages.js', () => ({
  messages: { clearSuccess: (u: string) => `clearSuccess:${u}` },
}));
vi.mock('../detectables/shared.js', () => ({
  clearQueueMemory: vi.fn(),
}));
vi.mock('../providers/queue.js', () => ({ queue: { clearQueue: vi.fn().mockResolvedValue(undefined) } }));

import { sendChatMessage } from '../api/chat.js';
import { queue } from '../providers/queue.js';
import { clearQueueMemory } from '../detectables/shared.js';
import type { ChatMessageEvent } from '../types.js';

const makeEvent = () => ({
  chatter_user_id: 'u1',
  chatter_user_login: 'moo',
  message: { text: '!clear' },
  badges: [],
});

beforeEach(() => vi.clearAllMocks());

describe('handleClearCommand', () => {
  it('calls clearQueue and sends confirmation', async () => {
    await handleClearCommand(makeEvent() as unknown as ChatMessageEvent);
    expect(queue.clearQueue).toHaveBeenCalledOnce();
    expect(sendChatMessage).toHaveBeenCalledWith('clearSuccess:moo');
  });

  it('clears local state after successful queue clear', async () => {
    await handleClearCommand(makeEvent() as unknown as ChatMessageEvent);
    expect(clearQueueMemory).toHaveBeenCalledOnce();
  });

  it('still clears local state when queue listener would be active', async () => {
    await handleClearCommand(makeEvent() as unknown as ChatMessageEvent);
    expect(clearQueueMemory).toHaveBeenCalledOnce();
  });

  it('clears local state on Firestore failure and still sends confirmation', async () => {
    vi.mocked(queue.clearQueue).mockRejectedValueOnce(new Error('Firestore down'));
    await handleClearCommand(makeEvent() as unknown as ChatMessageEvent);
    expect(clearQueueMemory).toHaveBeenCalledOnce();
    expect(sendChatMessage).toHaveBeenCalledWith('clearSuccess:moo');
  });
});
