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
vi.mock('../detectables/shared.js', () => ({
  unmarkInQueueByPogoUsername: vi.fn(),
  isFirestoreListenerActive: vi.fn().mockReturnValue(false),
}));
vi.mock('../providers/queue.js', () => ({ queue: { removeByPogoUsername: vi.fn() } }));

import { sendChatMessage } from '../api/chat.js';
import { queue } from '../providers/queue.js';
import { unmarkInQueueByPogoUsername, isFirestoreListenerActive } from '../detectables/shared.js';

const makeEvent = (text: string) => ({
  chatter_user_id: 'u1',
  chatter_user_login: 'moo',
  message: { text },
  badges: [],
});

beforeEach(() => vi.clearAllMocks());

describe('handleRemoveCommand', () => {
  it('sends usage when no username provided', async () => {
    await handleRemoveCommand(makeEvent('!remove') as any);
    expect(sendChatMessage).toHaveBeenCalledWith('removeUsage:moo');
  });

  it('confirms removal when user found', async () => {
    vi.mocked(queue.removeByPogoUsername).mockResolvedValue(true);
    await handleRemoveCommand(makeEvent('!remove TrainerAsh') as any);
    expect(sendChatMessage).toHaveBeenCalledWith('removeSuccess:TrainerAsh');
  });

  it('sends not found when user is not in queue', async () => {
    vi.mocked(queue.removeByPogoUsername).mockResolvedValue(false);
    await handleRemoveCommand(makeEvent('!remove TrainerAsh') as any);
    expect(sendChatMessage).toHaveBeenCalledWith('removeNotFound:TrainerAsh');
  });

  it('unmarks local state directly when listener is inactive and removed', async () => {
    vi.mocked(isFirestoreListenerActive).mockReturnValue(false);
    vi.mocked(queue.removeByPogoUsername).mockResolvedValue(true);
    await handleRemoveCommand(makeEvent('!remove TrainerAsh') as any);
    expect(unmarkInQueueByPogoUsername).toHaveBeenCalledWith('TrainerAsh');
  });

  it('does not unmark local state when listener is active', async () => {
    vi.mocked(isFirestoreListenerActive).mockReturnValue(true);
    vi.mocked(queue.removeByPogoUsername).mockResolvedValue(true);
    await handleRemoveCommand(makeEvent('!remove TrainerAsh') as any);
    expect(unmarkInQueueByPogoUsername).not.toHaveBeenCalled();
  });

  it('unmarks local state on Firestore failure', async () => {
    vi.mocked(queue.removeByPogoUsername).mockRejectedValueOnce(new Error('Firestore down'));
    await handleRemoveCommand(makeEvent('!remove TrainerAsh') as any);
    expect(unmarkInQueueByPogoUsername).toHaveBeenCalledWith('TrainerAsh');
  });
});
