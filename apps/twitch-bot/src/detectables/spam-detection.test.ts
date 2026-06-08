import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../messages.js', () => ({
  messages: { spamWarning: (u: string) => `spamWarning:${u}` },
}));
vi.mock('../persisted-settings.js', () => ({
  getSpamWindowMs: vi.fn(),
  setSpamWindowSeconds: vi.fn(),
}));

import { checkSpam, setSpamWindow } from './spam-detection.js';
import { sendChatMessage } from '../api/chat.js';
import { getSpamWindowMs, setSpamWindowSeconds } from '../persisted-settings.js';

const makeEvent = (text: string, userId = 'u1', login = 'moo') => ({
  chatter_user_id: userId,
  chatter_user_login: login,
  message: { text },
  badges: [],
});

// Reset module-level userRecords between tests by calling setSpamWindow(0),
// which invokes userRecords.clear() internally.
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSpamWindowMs).mockReturnValue(30_000);
  setSpamWindow(0); // clears userRecords
  vi.mocked(getSpamWindowMs).mockReturnValue(30_000); // restore after reset
});

describe('setSpamWindow', () => {
  it('converts ms to seconds and calls setSpamWindowSeconds', () => {
    setSpamWindow(30_000);
    expect(setSpamWindowSeconds).toHaveBeenCalledWith(30);
  });

  it('calls setSpamWindowSeconds with 0 when disabling', () => {
    setSpamWindow(0);
    expect(setSpamWindowSeconds).toHaveBeenCalledWith(0);
  });
});

describe('checkSpam', () => {
  it('returns false immediately when spam window is disabled', () => {
    vi.mocked(getSpamWindowMs).mockReturnValue(0);
    const result = checkSpam(makeEvent('hello') as any);
    expect(result).toBe(false);
    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it('returns false for text that normalises to empty', () => {
    const result = checkSpam(makeEvent('😀 😂 🎉') as any);
    expect(result).toBe(false);
    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it('returns false when message count is below threshold', () => {
    checkSpam(makeEvent('hello') as any);
    const result = checkSpam(makeEvent('hello') as any);
    expect(result).toBe(false);
    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it('returns true and sends warning when threshold (3) is reached', () => {
    checkSpam(makeEvent('hello') as any);
    checkSpam(makeEvent('hello') as any);
    const result = checkSpam(makeEvent('hello') as any);
    expect(result).toBe(true);
    expect(sendChatMessage).toHaveBeenCalledWith('spamWarning:moo');
  });

  it('normalises case and whitespace before comparing', () => {
    checkSpam(makeEvent('HELLO') as any);
    checkSpam(makeEvent('  hello  ') as any);
    const result = checkSpam(makeEvent('Hello') as any);
    expect(result).toBe(true);
  });

  it('resets count when message content changes', () => {
    checkSpam(makeEvent('hello') as any);
    checkSpam(makeEvent('hello') as any);
    checkSpam(makeEvent('different message') as any); // resets
    checkSpam(makeEvent('different message') as any);
    const result = checkSpam(makeEvent('different message') as any);
    expect(result).toBe(true);
    expect(sendChatMessage).toHaveBeenCalledOnce();
  });

  it('tracks users independently', () => {
    checkSpam(makeEvent('hello', 'u1', 'alice') as any);
    checkSpam(makeEvent('hello', 'u1', 'alice') as any);
    checkSpam(makeEvent('hello', 'u2', 'bob') as any); // different user, no warning
    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it('does not send a second warning within the cooldown period', () => {
    vi.useFakeTimers();
    checkSpam(makeEvent('hello') as any);
    checkSpam(makeEvent('hello') as any);
    checkSpam(makeEvent('hello') as any); // triggers warning
    checkSpam(makeEvent('hello') as any); // still in cooldown
    expect(sendChatMessage).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('sends a new warning after the cooldown expires', () => {
    vi.useFakeTimers();
    // Use a window longer than WARN_COOLDOWN_MS (60s) so timestamps survive
    vi.mocked(getSpamWindowMs).mockReturnValue(120_000);

    checkSpam(makeEvent('hello') as any);
    checkSpam(makeEvent('hello') as any);
    checkSpam(makeEvent('hello') as any); // first warning at t=0

    vi.advanceTimersByTime(60_001); // past WARN_COOLDOWN_MS, but within spam window

    checkSpam(makeEvent('hello') as any); // second warning (count >= 3, cooldown expired)
    expect(sendChatMessage).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('evicts timestamps outside the spam window', () => {
    vi.useFakeTimers();
    vi.mocked(getSpamWindowMs).mockReturnValue(5_000);

    checkSpam(makeEvent('hello') as any);
    checkSpam(makeEvent('hello') as any);

    vi.advanceTimersByTime(5_001); // both timestamps now outside window

    checkSpam(makeEvent('hello') as any); // only 1 in window — not spam
    checkSpam(makeEvent('hello') as any); // 2 in window — not spam
    const result = checkSpam(makeEvent('hello') as any); // 3 in window — spam
    expect(result).toBe(true);
    vi.useRealTimers();
  });
});
