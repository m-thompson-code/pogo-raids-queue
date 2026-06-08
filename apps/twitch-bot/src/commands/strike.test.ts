import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleStrikeCommand } from './strike.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../messages.js', () => ({
  messages: {
    strikeUsage: (u: string) => `strikeUsage:${u}`,
    strikeNotFound: (u: string, t: string) => `strikeNotFound:${u}:${t}`,
    strikeConfirm: (t: string, c: number) => `strikeConfirm:${t}:${c}`,
  },
}));
vi.mock('@pogo-raid-system/firebase', () => ({ strikeUser: vi.fn() }));
vi.mock('../api/twitch-api.js', () => ({ getTwitchUserId: vi.fn() }));

import { sendChatMessage } from '../api/chat.js';
import { strikeUser } from '@pogo-raid-system/firebase';
import { getTwitchUserId } from '../api/twitch-api.js';

const makeEvent = (text: string) => ({
  chatter_user_id: 'u1',
  chatter_user_login: 'moo',
  message: { text },
  badges: [],
});

beforeEach(() => vi.clearAllMocks());

describe('handleStrikeCommand', () => {
  it('sends usage when no target provided', async () => {
    await handleStrikeCommand(makeEvent('!strike') as any);
    expect(sendChatMessage).toHaveBeenCalledWith('strikeUsage:moo');
    expect(getTwitchUserId).not.toHaveBeenCalled();
  });

  it('sends not found when twitch user id lookup fails', async () => {
    vi.mocked(getTwitchUserId).mockResolvedValue(null);
    await handleStrikeCommand(makeEvent('!strike UnknownUser') as any);
    expect(sendChatMessage).toHaveBeenCalledWith('strikeNotFound:moo:UnknownUser');
  });

  it('strips @ prefix from target username', async () => {
    vi.mocked(getTwitchUserId).mockResolvedValue('999');
    vi.mocked(strikeUser).mockResolvedValue(1);
    await handleStrikeCommand(makeEvent('!strike @SomeUser') as any);
    expect(getTwitchUserId).toHaveBeenCalledWith('SomeUser');
  });

  it('increments strike (no explicit value)', async () => {
    vi.mocked(getTwitchUserId).mockResolvedValue('999');
    vi.mocked(strikeUser).mockResolvedValue(2);
    await handleStrikeCommand(makeEvent('!strike TrainerAsh') as any);
    expect(strikeUser).toHaveBeenCalledWith('TrainerAsh', '999', undefined);
    expect(sendChatMessage).toHaveBeenCalledWith('strikeConfirm:TrainerAsh:2');
  });

  it('sets explicit strike value', async () => {
    vi.mocked(getTwitchUserId).mockResolvedValue('999');
    vi.mocked(strikeUser).mockResolvedValue(5);
    await handleStrikeCommand(makeEvent('!strike TrainerAsh 5') as any);
    expect(strikeUser).toHaveBeenCalledWith('TrainerAsh', '999', 5);
    expect(sendChatMessage).toHaveBeenCalledWith('strikeConfirm:TrainerAsh:5');
  });
});
