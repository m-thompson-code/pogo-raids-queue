import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleStrictCommand } from './strict.js';
import type { ChatMessageEvent } from '../types.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../persisted-settings.js', () => ({
  setStrictMode: vi.fn(),
  isStrictMode: vi.fn().mockReturnValue(false),
}));

import { sendChatMessage } from '../api/chat.js';
import { setStrictMode, isStrictMode } from '../persisted-settings.js';

const makeEvent = (text: string) => ({
  chatter_user_id: 'u1',
  chatter_user_login: 'moo',
  message: { text },
  badges: [],
});

beforeEach(() => vi.clearAllMocks());

describe('handleStrictCommand', () => {
  it('sends usage with current state when no arg provided', async () => {
    vi.mocked(isStrictMode).mockReturnValue(false);
    await handleStrictCommand(makeEvent('!strict') as unknown as ChatMessageEvent);
    expect(setStrictMode).not.toHaveBeenCalled();
    expect(sendChatMessage).toHaveBeenCalledWith(expect.stringContaining('off'));
  });

  it('sends usage with current state when invalid arg provided', async () => {
    vi.mocked(isStrictMode).mockReturnValue(true);
    await handleStrictCommand(makeEvent('!strict maybe') as unknown as ChatMessageEvent);
    expect(setStrictMode).not.toHaveBeenCalled();
    expect(sendChatMessage).toHaveBeenCalledWith(expect.stringContaining('on'));
  });

  it('enables strict mode on !strict on', async () => {
    await handleStrictCommand(makeEvent('!strict on') as unknown as ChatMessageEvent);
    expect(setStrictMode).toHaveBeenCalledWith(true);
    expect(sendChatMessage).toHaveBeenCalledWith('@moo Strict mode is now on.');
  });

  it('disables strict mode on !strict off', async () => {
    await handleStrictCommand(makeEvent('!strict off') as unknown as ChatMessageEvent);
    expect(setStrictMode).toHaveBeenCalledWith(false);
    expect(sendChatMessage).toHaveBeenCalledWith('@moo Strict mode is now off.');
  });
});
