import { describe, it, expect } from 'vitest';
import { FRIEND_CODE_RAW, formatFriendCode } from './friend-code.js';

describe('FRIEND_CODE_RAW', () => {
  it('is a 12-digit numeric string', () => {
    expect(FRIEND_CODE_RAW).toMatch(/^\d{12}$/);
  });
});

describe('formatFriendCode', () => {
  it('formats the raw code as 3 groups of 4 digits separated by spaces', () => {
    const formatted = formatFriendCode();
    expect(formatted).toMatch(/^\d{4} \d{4} \d{4}$/);
  });

  it('contains the same digits as the raw code', () => {
    const formatted = formatFriendCode();
    expect(formatted.replace(/ /g, '')).toBe(FRIEND_CODE_RAW);
  });
});
