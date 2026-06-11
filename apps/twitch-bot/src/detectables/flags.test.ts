import { describe, it, expect } from 'vitest';
import {
  isBegging, BEGGING_PATTERNS,
  isRequesting, REQUESTING_PATTERNS,
  isAskingQuestion, ASKING_QUESTION_PATTERNS,
  involvesQueue, QUEUE_PATTERNS,
  involvesRaid, RAID_PATTERNS,
  involvesCode, CODE_PATTERNS,
} from './flags.js';

describe('isBegging', () => {
  it('all BEGGING_PATTERNS are valid RegExp objects', () => {
    for (const p of BEGGING_PATTERNS) expect(p).toBeInstanceOf(RegExp);
  });

  describe('matches', () => {
    const matching = [
      'add me please',
      'please add me',
      'plz add me',
      'pls add me',
      'hey can you add me please?',
      'PLZ ADD',
      '3moo5u for groupon plz',
      '3moo5u for groupon pls',
      '3moo5u for groupon please',
    ];
    for (const msg of matching) {
      it(`"${msg}"`, () => expect(isBegging(msg.toLowerCase())).toBe(true));
    }
  });

  describe('does not match', () => {
    const nonMatching = [
      'add me',
      'invite me to raid',
      'how do i join',
      'gg',
    ];
    for (const msg of nonMatching) {
      it(`"${msg}"`, () => expect(isBegging(msg.toLowerCase())).toBe(false));
    }
  });
});

describe('isRequesting', () => {
  it('all REQUESTING_PATTERNS are valid RegExp objects', () => {
    for (const p of REQUESTING_PATTERNS) expect(p).toBeInstanceOf(RegExp);
  });

  describe('matches', () => {
    const matching = [
      'add me please',
      'add me',
      'plz add me',
      'pls add me',
      'please add me',
      'can you add me',
      'can u add me',
      'can someone add me',
      'can sum1 add me',
      'invite me to raid',
      'invite me 345634563456',
      'add me 123412341234',
      'add me 3456 3456 3456',
      'put me in',
      'put me on the list',
      'sign me up',
      'join the queue',
      'join the raid',
      'join raid',
      'join queue',
      'ADD ME',
      '3moo5u for groupon',
      '3moo5u for groupon plz',
      '3moo5u for groupon pls',
      '3moo5u for groupon please',
    ];
    for (const msg of matching) {
      it(`"${msg}"`, () => expect(isRequesting(msg.toLowerCase())).toBe(true));
    }
  });

  describe('does not match', () => {
    const nonMatching = [
      '!raid pokename',
      'good game everyone',
      'how many raids today?',
      'gg',
      'nice catch!',
      'what pokemon is next?',
      'I already joined',
      'how do i join',
      'PLZ ADD',
      'add me back',
      'please add me back',
    ];
    for (const msg of nonMatching) {
      it(`"${msg}"`, () => expect(isRequesting(msg.toLowerCase())).toBe(false));
    }
  });
});

describe('isAskingQuestion', () => {
  it('all ASKING_QUESTION_PATTERNS are valid RegExp objects', () => {
    for (const p of ASKING_QUESTION_PATTERNS) expect(p).toBeInstanceOf(RegExp);
  });

  describe('matches', () => {
    const matching = [
      'can i join',
      'can u join',
      'how do i join',
      'how do i join?',
      'how can i join',
      'how to join',
      'HOW DO I JOIN',
      "what's your friend code?",
      "what is your code?",
      "what's the code?",
    ];
    for (const msg of matching) {
      it(`"${msg}"`, () => expect(isAskingQuestion(msg.toLowerCase())).toBe(true));
    }
  });

  describe('does not match', () => {
    const nonMatching = [
      'add me',
      'join the queue',
      'good game everyone',
      'gg',
    ];
    for (const msg of nonMatching) {
      it(`"${msg}"`, () => expect(isAskingQuestion(msg.toLowerCase())).toBe(false));
    }
  });
});

describe('involvesCode', () => {
  it('all CODE_PATTERNS are valid RegExp objects', () => {
    for (const p of CODE_PATTERNS) expect(p).toBeInstanceOf(RegExp);
  });

  describe('matches', () => {
    const matching = [
      'what is the code',
      "what's the code",
      'send the code',
      'give me the code',
      'the code?',
      'code please',
      'code?',
      'code',
      'invite me 345634563456',
      'add me 123412341234',
      'invite me 3456 3456 3456',
      'add me 3456 3456 3456',
    ];
    for (const msg of matching) {
      it(`"${msg}"`, () => expect(involvesCode(msg.toLowerCase())).toBe(true));
    }
  });

  describe('does not match', () => {
    const nonMatching = [
      'add me please',
      'how do i join',
      'invite me to raid',
      'gg',
      'plz add me',
      // broadcaster's own code — already known, should not trigger
      '8357 6698 6460',
      '835766986460',
      'add me 8357 6698 6460',
    ];
    for (const msg of nonMatching) {
      it(`"${msg}"`, () => expect(involvesCode(msg.toLowerCase())).toBe(false));
    }
  });
});

describe('involvesQueue', () => {
  it('all QUEUE_PATTERNS are valid RegExp objects', () => {
    for (const p of QUEUE_PATTERNS) expect(p).toBeInstanceOf(RegExp);
  });

  describe('matches', () => {
    const matching = ['how do i join', 'queue me', 'the que', 'check the list', 'join the raid queue'];
    for (const msg of matching) {
      it(`"${msg}"`, () => expect(involvesQueue(msg.toLowerCase())).toBe(true));
    }
  });

  describe('does not match', () => {
    const nonMatching = ['add me', 'code please', 'gg', 'hello'];
    for (const msg of nonMatching) {
      it(`"${msg}"`, () => expect(involvesQueue(msg.toLowerCase())).toBe(false));
    }
  });
});

describe('involvesRaid', () => {
  it('all RAID_PATTERNS are valid RegExp objects', () => {
    for (const p of RAID_PATTERNS) expect(p).toBeInstanceOf(RegExp);
  });

  describe('matches', () => {
    const matching = ['raid me', 'join the raid', 'how do i join the queue', 'in the que'];
    for (const msg of matching) {
      it(`"${msg}"`, () => expect(involvesRaid(msg.toLowerCase())).toBe(true));
    }
  });

  describe('does not match', () => {
    const nonMatching = ['add me', 'code please', 'gg', 'join the list'];
    for (const msg of nonMatching) {
      it(`"${msg}"`, () => expect(involvesRaid(msg.toLowerCase())).toBe(false));
    }
  });
});
