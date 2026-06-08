import { describe, it, expect, vi } from 'vitest';

vi.mock('./config.js', () => ({
  config: { chatChannelUserId: 'channel-123' },
}));

import { isPrivileged } from './permissions.js';
import type { ChatMessageEvent } from './types.js';

const makeEvent = (userId: string, badges: { set_id: string }[] = []) =>
  ({
    chatter_user_id: userId,
    chatter_user_login: 'moo',
    message: { text: '' },
    badges,
  }) as unknown as ChatMessageEvent;

describe('isPrivileged', () => {
  it('returns true for the broadcaster (matched by user id)', () => {
    expect(isPrivileged(makeEvent('channel-123'))).toBe(true);
  });

  it('returns true for a moderator badge', () => {
    expect(isPrivileged(makeEvent('u1', [{ set_id: 'moderator' }]))).toBe(true);
  });

  it('returns true for a lead_moderator badge', () => {
    expect(isPrivileged(makeEvent('u1', [{ set_id: 'lead_moderator' }]))).toBe(true);
  });

  it('returns false for a regular viewer', () => {
    expect(isPrivileged(makeEvent('u1'))).toBe(false);
  });

  it('returns false for a subscriber badge only', () => {
    expect(isPrivileged(makeEvent('u1', [{ set_id: 'subscriber' }]))).toBe(false);
  });

  it('returns false for a vip badge only', () => {
    expect(isPrivileged(makeEvent('u1', [{ set_id: 'vip' }]))).toBe(false);
  });
});
