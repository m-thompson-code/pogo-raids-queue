import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleLeaveCommand } from './leave.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../messages.js', () => ({
  messages: { leaveRemoved: (u: string) => `leaveRemoved:${u}` },
}));
vi.mock('../detectables/shared.js', () => ({
  unmarkInQueueByTwitchId: vi.fn(),
  isFirestoreListenerActive: vi.fn().mockReturnValue(false),
}));
vi.mock('../providers/queue.js', () => ({ queue: { removeByTwitchId: vi.fn() } }));

import { sendChatMessage } from '../api/chat.js';
import { queue } from '../providers/queue.js';
import { unmarkInQueueByTwitchId, isFirestoreListenerActive } from '../detectables/shared.js';

const makeEvent = () => ({
  chatter_user_id: 'u1',
  chatter_user_login: 'moo',
  message: { text: '!leave' },
  badges: [],
});

beforeEach(() => vi.clearAllMocks());

describe('handleLeaveCommand', () => {
  it('confirms with pogo username when found', async () => {
    vi.mocked(queue.removeByTwitchId).mockResolvedValue('TrainerAsh');
    await handleLeaveCommand(makeEvent() as any);
    expect(sendChatMessage).toHaveBeenCalledWith('leaveRemoved:TrainerAsh');
  });

  it('falls back to twitch username when not in queue', async () => {
    vi.mocked(queue.removeByTwitchId).mockResolvedValue(null);
    await handleLeaveCommand(makeEvent() as any);
    expect(sendChatMessage).toHaveBeenCalledWith('leaveRemoved:moo');
  });

  it('unmarks from local state directly when listener is inactive', async () => {
    vi.mocked(isFirestoreListenerActive).mockReturnValue(false);
    vi.mocked(queue.removeByTwitchId).mockResolvedValue('TrainerAsh');
    await handleLeaveCommand(makeEvent() as any);
    expect(unmarkInQueueByTwitchId).toHaveBeenCalledWith('u1');
  });

  it('does not unmark local state when listener is active', async () => {
    vi.mocked(isFirestoreListenerActive).mockReturnValue(true);
    vi.mocked(queue.removeByTwitchId).mockResolvedValue('TrainerAsh');
    await handleLeaveCommand(makeEvent() as any);
    expect(unmarkInQueueByTwitchId).not.toHaveBeenCalled();
  });

  it('unmarks local state and uses twitch login on Firestore failure', async () => {
    vi.mocked(queue.removeByTwitchId).mockRejectedValueOnce(new Error('Firestore down'));
    await handleLeaveCommand(makeEvent() as any);
    expect(unmarkInQueueByTwitchId).toHaveBeenCalledWith('u1');
    expect(sendChatMessage).toHaveBeenCalledWith('leaveRemoved:moo');
  });
});
