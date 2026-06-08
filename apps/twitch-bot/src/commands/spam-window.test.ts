import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSpamWindowCommand } from './spam-window.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../messages.js', () => ({
  messages: {
    spamWindowSet: (u: string, s: number) => `spamWindowSet:${u}:${s}`,
  },
}));
vi.mock('../detectables/spam-detection.js', () => ({ setSpamWindow: vi.fn() }));

import { sendChatMessage } from '../api/chat.js';
import { setSpamWindow } from '../detectables/spam-detection.js';

const makeEvent = (text: string) => ({
  chatter_user_id: 'u1',
  chatter_user_login: 'moo',
  message: { text },
  badges: [],
});

beforeEach(() => vi.clearAllMocks());

describe('handleSpamWindowCommand', () => {
  it('sends usage when no argument provided', async () => {
    await handleSpamWindowCommand(makeEvent('!spamwindow') as any);
    expect(sendChatMessage).toHaveBeenCalledWith(
      '@moo Usage: !spamwindow <seconds> (0 = off)'
    );
    expect(setSpamWindow).not.toHaveBeenCalled();
  });

  it('sends usage when argument is not a number', async () => {
    await handleSpamWindowCommand(makeEvent('!spamwindow abc') as any);
    expect(sendChatMessage).toHaveBeenCalledWith(
      '@moo Usage: !spamwindow <seconds> (0 = off)'
    );
    expect(setSpamWindow).not.toHaveBeenCalled();
  });

  it('sends usage when argument is negative', async () => {
    await handleSpamWindowCommand(makeEvent('!spamwindow -5') as any);
    expect(sendChatMessage).toHaveBeenCalledWith(
      '@moo Usage: !spamwindow <seconds> (0 = off)'
    );
    expect(setSpamWindow).not.toHaveBeenCalled();
  });

  it('sets spam window in ms and confirms', async () => {
    await handleSpamWindowCommand(makeEvent('!spamwindow 30') as any);
    expect(setSpamWindow).toHaveBeenCalledWith(30_000);
    expect(sendChatMessage).toHaveBeenCalledWith('spamWindowSet:moo:30');
  });

  it('accepts 0 to disable spam detection', async () => {
    await handleSpamWindowCommand(makeEvent('!spamwindow 0') as any);
    expect(setSpamWindow).toHaveBeenCalledWith(0);
    expect(sendChatMessage).toHaveBeenCalledWith('spamWindowSet:moo:0');
  });
});
