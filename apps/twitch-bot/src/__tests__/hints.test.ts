import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isJoinRequest, isAddRequest, isHowToJoinRequest, isCodeRequest, isStreamerAddRequest, ADD_REQUEST_PATTERNS, HOW_TO_JOIN_PATTERNS } from '../commands/hints.js';

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
        assert.ok(isAddRequest(msg), `Expected "${msg}" to match isAddRequest`);
      });
    }
  });

  it('all ADD_REQUEST_PATTERNS are valid RegExp objects', () => {
    for (const pattern of ADD_REQUEST_PATTERNS) {
      assert.ok(pattern instanceof RegExp, `${pattern} is not a RegExp`);
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
        assert.ok(isHowToJoinRequest(msg), `Expected "${msg}" to match isHowToJoinRequest`);
      });
    }
  });

  it('all HOW_TO_JOIN_PATTERNS are valid RegExp objects', () => {
    for (const pattern of HOW_TO_JOIN_PATTERNS) {
      assert.ok(pattern instanceof RegExp, `${pattern} is not a RegExp`);
    }
  });
});

describe('isJoinRequest', () => {
  it('returns true for add-me messages', () => {
    assert.ok(isJoinRequest('plz add me'));
  });

  it('returns true for how-to-join messages', () => {
    assert.ok(isJoinRequest('how do i join'));
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
        assert.ok(!isJoinRequest(msg), `Expected "${msg}" NOT to match`);
      });
    }
  });
});

describe('isCodeRequest', () => {
  it('matches "what is the code"', () => {
    assert.ok(isCodeRequest('what is the code'));
  });
  it('matches "send the code"', () => {
    assert.ok(isCodeRequest('send the code'));
  });
});

describe('isStreamerAddRequest', () => {
  it('matches "invite me <friend_code>"', () => {
    assert.ok(isStreamerAddRequest('invite me 345634563456'));
  });
  it('matches "add me <friend_code>"', () => {
    assert.ok(isStreamerAddRequest('add me 123412341234'));
  });
  it('matches with spaces in friend code', () => {
    assert.ok(isStreamerAddRequest('invite me 3456 3456 3456'));
  });
  it('does not match plain "add me" (no digits)', () => {
    assert.ok(!isStreamerAddRequest('add me please'));
  });
});
