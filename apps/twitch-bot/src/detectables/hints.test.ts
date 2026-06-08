import { describe, it, expect } from 'vitest';
import { isJoinRequest, isAddRequest, isHowToJoinRequest, isCodeRequest, isStreamerAddRequest, ADD_REQUEST_PATTERNS, HOW_TO_JOIN_PATTERNS } from './hints.js';

describe('isAddRequest', () => {
  describe('matches add-me patterns', () => {
    const matching = [
      'add me please',
      'plz add me',
      'pls add me',
      'please add me',
      'can you add me',
      'can u add me',
      'can someone add me',
      'can sum1 add me',
      'put me in',
      'put me on the list',
      'sign me up',
      'invite me to raid',
      'ADD ME',
      'PLZ ADD',
      'hey can you add me please?',
      'for roserade, plz add me',
      '3moo5u for groupon',
      '3moo5u for groupon plz',
      '3moo5u for groupon pls',
      '3moo5u for groupon please',
    ];
    for (const msg of matching) {
      it(`matches: "${msg}"`, () => {
        expect(isAddRequest(msg)).toBe(true);
      });
    }
  });

  it('all ADD_REQUEST_PATTERNS are valid RegExp objects', () => {
    for (const pattern of ADD_REQUEST_PATTERNS) {
      expect(pattern).toBeInstanceOf(RegExp);
    }
  });
});

describe('isHowToJoinRequest', () => {
  describe('matches how-to-join patterns', () => {
    const matching = [
      'can i join',
      'join the raid',
      'join the queue',
      'join raid',
      'join queue',
      'how do i join',
      'how do i join?',
      'how can i join',
      'JOIN THE QUEUE',
      'HOW DO I JOIN',
      '3moo5u join the queue',
    ];
    for (const msg of matching) {
      it(`matches: "${msg}"`, () => {
        expect(isHowToJoinRequest(msg)).toBe(true);
      });
    }
  });

  it('all HOW_TO_JOIN_PATTERNS are valid RegExp objects', () => {
    for (const pattern of HOW_TO_JOIN_PATTERNS) {
      expect(pattern).toBeInstanceOf(RegExp);
    }
  });
});

describe('isJoinRequest', () => {
  it('returns true for add-me messages', () => {
    expect(isJoinRequest('plz add me')).toBe(true);
  });

  it('returns true for how-to-join messages', () => {
    expect(isJoinRequest('how do i join')).toBe(true);
  });

  describe('does not match unrelated messages', () => {
    const nonMatching = [
      '!raid pokename',
      '!join pokename',
      'good game everyone',
      'how many raids today?',
      'gg',
      'nice catch!',
      'what pokemon is next?',
      'I already joined',
    ];
    for (const msg of nonMatching) {
      it(`does not match: "${msg}"`, () => {
        expect(isJoinRequest(msg)).toBe(false);
      });
    }
  });
});

describe('isCodeRequest', () => {
  it('matches "what is the code"', () => {
    expect(isCodeRequest('what is the code')).toBe(true);
  });
  it('matches "send the code"', () => {
    expect(isCodeRequest('send the code')).toBe(true);
  });
});

describe('isStreamerAddRequest', () => {
  it('matches "invite me <friend_code>"', () => {
    expect(isStreamerAddRequest('invite me 345634563456')).toBe(true);
  });
  it('matches "add me <friend_code>"', () => {
    expect(isStreamerAddRequest('add me 123412341234')).toBe(true);
  });
  it('matches with spaces in friend code', () => {
    expect(isStreamerAddRequest('invite me 3456 3456 3456')).toBe(true);
  });
  it('does not match plain "add me" (no digits)', () => {
    expect(isStreamerAddRequest('add me please')).toBe(false);
  });
});
