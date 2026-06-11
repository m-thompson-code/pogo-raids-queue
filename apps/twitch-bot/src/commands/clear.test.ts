import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleClearCommand } from './clear.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../messages.js', () => ({
  messages: { clearSuccess: (u: string) => `clearSuccess:${u}` },
}));
vi.mock('../detectables/shared.js', () => ({
  clearQueueMemory: vi.fn(),
  isFirestoreListenerActive: vi.fn().mockReturnValue(false),
}));
vi.mock('../providers/queue.js', () => ({ queue: { clearQueue: vi.fn().mockResolvedValue(undefined) } }));

import { sendChatMessage } from '../api/chat.js';
import { queue } from '../providers/queue.js';
import { clearQueueMemory, isFirestoreListenerActive } from '../detectables/shared.js';

const makeEvent = () => ({
  chatter_user_id: 'u1',
  chatter_user_login: 'moo',
  message: { text: '!clear' },
  badges: [],
});

beforeEach(() => vi.clearAllMocks());

describe('handleClearCommand', () => {
  it('calls clearQueue and sends confirmation', async () => {
    await handleClearCommand(makeEvent() as any);
    expect(queue.clearQueue).toHaveBeenCalledOnce();
    expect(sendChatMessage).toHaveBeenCalledWith('clearSuccess:moo');
  });

  it('clears local state directly when listener is inactive', async () => {
    vi.mocked(isFirestoreListenerActive).mockReturnValue(false);
    await handleClearCommand(makeEvent() as any);
    expect(clearQueueMemory).toHaveBeenCalledOnce();
  });

  it('does not clear local state when listener is active', async () => {
    vi.mocked(isFirestoreListenerActive).mockReturnValue(true);
    await handleClearCommand(makeEvent() as any);
    expect(clearQueueMemory).not.toHaveBeenCalled();
  });

  it('clears local state on Firestore failure and still sends confirmation', async () => {
    vi.mocked(queue.clearQueue).mockRejectedValueOnce(new Error('Firestore down'));
    await handleClearCommand(makeEvent() as any);
    expect(clearQueueMemory).toHaveBeenCalledOnce();
    expect(sendChatMessage).toHaveBeenCalledWith('clearSuccess:moo');
  });
});
