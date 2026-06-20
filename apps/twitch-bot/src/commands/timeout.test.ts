import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleTimeoutCommand } from './timeout.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../messages.js', () => ({
  messages: {
    timeoutUsage: (u: string) => `timeoutUsage:${u}`,
    timeoutNotFound: (u: string, t: string) => `timeoutNotFound:${u}:${t}`,
    timeoutSuccess: (t: string) => `timeoutSuccess:${t}`,
  },
}));
vi.mock('../api/twitch-api.js', () => ({ getTwitchUserId: vi.fn() }));
vi.mock('../providers/queue.js', () => ({
  queue: {
    removeByTwitchId: vi.fn().mockResolvedValue(null),
    addToTimedOutQueue: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('@pogo-raid-system/firebase', () => ({
  getUser: vi.fn(),
  strikeUser: vi.fn().mockResolvedValue(3),
}));
vi.mock('../detectables/shared.js', () => ({
  isFirestoreListenerActive: vi.fn().mockReturnValue(false),
  unmarkInQueueByTwitchId: vi.fn(),
}));

import { sendChatMessage } from '../api/chat.js';
import { getTwitchUserId } from '../api/twitch-api.js';
import { queue } from '../providers/queue.js';
import { getUser, strikeUser } from '@pogo-raid-system/firebase';
import { isFirestoreListenerActive, unmarkInQueueByTwitchId } from '../detectables/shared.js';
import type { ChatMessageEvent } from '../types.js';

const makeEvent = (text: string) => ({
  chatter_user_id: 'u1',
  chatter_user_login: 'moo',
  message: { text },
  badges: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isFirestoreListenerActive).mockReturnValue(false);
});

describe('handleTimeoutCommand', () => {
  it('sends usage when no target provided', async () => {
    await handleTimeoutCommand(makeEvent('!timeout') as unknown as ChatMessageEvent);
    expect(sendChatMessage).toHaveBeenCalledWith('timeoutUsage:moo');
  });

  it('sends not found when twitch user lookup fails', async () => {
    vi.mocked(getTwitchUserId).mockResolvedValue(null);
    await handleTimeoutCommand(makeEvent('!timeout UnknownUser') as unknown as ChatMessageEvent);
    expect(sendChatMessage).toHaveBeenCalledWith('timeoutNotFound:moo:UnknownUser');
  });

  it('sends not found when user has no stored pogo username', async () => {
    vi.mocked(getTwitchUserId).mockResolvedValue('999');
    vi.mocked(getUser).mockResolvedValue(null);
    await handleTimeoutCommand(makeEvent('!timeout TrainerAsh') as unknown as ChatMessageEvent);
    expect(sendChatMessage).toHaveBeenCalledWith('timeoutNotFound:moo:TrainerAsh');
  });

  it('moves user to timed-out queue and confirms', async () => {
    vi.mocked(getTwitchUserId).mockResolvedValue('999');
    vi.mocked(getUser).mockResolvedValue({
      twitchUsername: 'TrainerAsh',
      pogoUsername: 'AshPogo',
      isSubscriber: true,
      isVip: false,
    } as never);

    await handleTimeoutCommand(makeEvent('!timeout TrainerAsh') as unknown as ChatMessageEvent);

    expect(strikeUser).toHaveBeenCalledWith('TrainerAsh', '999', 3);
    expect(queue.removeByTwitchId).toHaveBeenCalledWith('999');
    expect(queue.addToTimedOutQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        twitchUserId: '999',
        twitchUsername: 'TrainerAsh',
        pogoUsername: 'AshPogo',
        isSubscriber: true,
        isVip: false,
      }),
    );
    expect(unmarkInQueueByTwitchId).toHaveBeenCalledWith('999');
    expect(sendChatMessage).toHaveBeenCalledWith('timeoutSuccess:TrainerAsh');
  });

  it('does not unmark local queue state when firestore listener is active', async () => {
    vi.mocked(isFirestoreListenerActive).mockReturnValue(true);
    vi.mocked(getTwitchUserId).mockResolvedValue('999');
    vi.mocked(getUser).mockResolvedValue({
      twitchUsername: 'TrainerAsh',
      pogoUsername: 'AshPogo',
      isSubscriber: false,
      isVip: true,
    } as never);

    await handleTimeoutCommand(makeEvent('!timeout TrainerAsh') as unknown as ChatMessageEvent);

    expect(unmarkInQueueByTwitchId).not.toHaveBeenCalled();
  });
});
