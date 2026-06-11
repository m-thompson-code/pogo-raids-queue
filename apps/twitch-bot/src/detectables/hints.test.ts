import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleHintCooldownCommand } from './hints.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../persisted-settings.js', () => ({
  setHintCooldownSeconds: vi.fn(),
}));

import { sendChatMessage } from '../api/chat.js';
import { setHintCooldownSeconds } from '../persisted-settings.js';

const makeEvent = (text: string, login = 'moo') => ({
  chatter_user_id: 'u1',
  chatter_user_login: login,
  message: { text },
  badges: [],
});

beforeEach(() => vi.clearAllMocks());

describe('handleHintCooldownCommand', () => {
  it('sends usage when no seconds argument is given', async () => {
    await handleHintCooldownCommand(makeEvent('!hintcooldown') as any);
    expect(sendChatMessage).toHaveBeenCalledWith(
      '@moo Usage: !hintcooldown <seconds>'
    );
    expect(setHintCooldownSeconds).not.toHaveBeenCalled();
  });

  it('sends usage when argument is not a number', async () => {
    await handleHintCooldownCommand(makeEvent('!hintcooldown abc') as any);
    expect(sendChatMessage).toHaveBeenCalledWith(
      '@moo Usage: !hintcooldown <seconds>'
    );
    expect(setHintCooldownSeconds).not.toHaveBeenCalled();
  });

  it('sends usage when argument is negative', async () => {
    await handleHintCooldownCommand(makeEvent('!hintcooldown -5') as any);
    expect(sendChatMessage).toHaveBeenCalledWith(
      '@moo Usage: !hintcooldown <seconds>'
    );
    expect(setHintCooldownSeconds).not.toHaveBeenCalled();
  });

  it('sets cooldown to zero and confirms with singular "second"', async () => {
    await handleHintCooldownCommand(makeEvent('!hintcooldown 0') as any);
    expect(setHintCooldownSeconds).toHaveBeenCalledWith(0);
    expect(sendChatMessage).toHaveBeenCalledWith(
      '@moo Hint cooldown set to 0 seconds.'
    );
  });

  it('sets cooldown and confirms with singular "second" for 1', async () => {
    await handleHintCooldownCommand(makeEvent('!hintcooldown 1') as any);
    expect(setHintCooldownSeconds).toHaveBeenCalledWith(1);
    expect(sendChatMessage).toHaveBeenCalledWith(
      '@moo Hint cooldown set to 1 second.'
    );
  });

  it('sets cooldown and confirms with plural "seconds" for >1', async () => {
    await handleHintCooldownCommand(makeEvent('!hintcooldown 30') as any);
    expect(setHintCooldownSeconds).toHaveBeenCalledWith(30);
    expect(sendChatMessage).toHaveBeenCalledWith(
      '@moo Hint cooldown set to 30 seconds.'
    );
  });
});
