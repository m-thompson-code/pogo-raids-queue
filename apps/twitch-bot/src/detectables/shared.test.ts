import { describe, it, expect, beforeEach } from 'vitest';
import {
  successfulRaiders,
  markRaidSuccess,
  unmarkRaidSuccess,
  firstTimeChatters,
  markFirstTimeChatter,
  unmarkFirstTimeChatter,
  isFirstTimeChatter,
  usersThatHaveRaidedBefore,
  markInQueue,
  unmarkInQueueByTwitchId,
  unmarkInQueueByPogoUsername,
  clearQueueMemory,
  hydrateQueueMemory,
  isInQueue,
  getQueueEntryStatus,
  setQueueEntryStatus,
  setFirestoreListenerActive,
  isFirestoreListenerActive,
} from './shared.js';

const makeEvent = (userId: string) => ({
  chatter_user_id: userId,
  chatter_user_login: 'user',
  message: { text: '' },
  badges: [],
});

beforeEach(() => {
  clearQueueMemory();
  successfulRaiders.clear();
  firstTimeChatters.clear();
  usersThatHaveRaidedBefore.clear();
  setFirestoreListenerActive(false);
});

describe('successfulRaiders', () => {
  it('markRaidSuccess adds a user to the set', () => {
    markRaidSuccess('u1');
    expect(successfulRaiders.has('u1')).toBe(true);
  });

  it('markRaidSuccess removes the user from firstTimeChatters', () => {
    markFirstTimeChatter('u1');
    markRaidSuccess('u1');
    expect(firstTimeChatters.has('u1')).toBe(false);
  });

  it('markRaidSuccess sets usersThatHaveRaidedBefore to true', () => {
    markRaidSuccess('u1');
    expect(usersThatHaveRaidedBefore.get('u1')).toBe(true);
  });

  it('unmarkRaidSuccess removes the user from the set', () => {
    markRaidSuccess('u1');
    unmarkRaidSuccess('u1');
    expect(successfulRaiders.has('u1')).toBe(false);
  });
});

describe('firstTimeChatters', () => {
  it('markFirstTimeChatter adds a user', () => {
    markFirstTimeChatter('u1');
    expect(firstTimeChatters.has('u1')).toBe(true);
  });

  it('markFirstTimeChatter sets usersThatHaveRaidedBefore to false', () => {
    markFirstTimeChatter('u1');
    expect(usersThatHaveRaidedBefore.get('u1')).toBe(false);
  });

  it('markFirstTimeChatter overwrites a previous true entry (e.g. after a strike)', () => {
    markRaidSuccess('u1');
    markFirstTimeChatter('u1');
    expect(usersThatHaveRaidedBefore.get('u1')).toBe(false);
  });

  it('unmarkFirstTimeChatter removes a user', () => {
    markFirstTimeChatter('u1');
    unmarkFirstTimeChatter('u1');
    expect(firstTimeChatters.has('u1')).toBe(false);
  });

  it('isFirstTimeChatter returns true when user is in the set', () => {
    markFirstTimeChatter('u1');
    expect(isFirstTimeChatter(makeEvent('u1') as any)).toBe(true);
  });

  it('isFirstTimeChatter returns false when user is not in the set', () => {
    expect(isFirstTimeChatter(makeEvent('u1') as any)).toBe(false);
  });
});

describe('queue memory', () => {
  it('isInQueue returns false for an unknown user', () => {
    expect(isInQueue('u1')).toBe(false);
  });

  it('markInQueue adds a user to the queue with default joined status', () => {
    markInQueue('u1', 'Ash');
    expect(isInQueue('u1')).toBe(true);
    expect(getQueueEntryStatus('u1')).toBe('joined');
  });

  it('markInQueue respects an explicit status', () => {
    markInQueue('u1', 'Ash', 'invited');
    expect(getQueueEntryStatus('u1')).toBe('invited');
  });

  it('setQueueEntryStatus updates the status for an existing entry', () => {
    markInQueue('u1', 'Ash');
    setQueueEntryStatus('u1', 'copied');
    expect(getQueueEntryStatus('u1')).toBe('copied');
  });

  it('unmarkInQueueByTwitchId removes the user', () => {
    markInQueue('u1', 'Ash');
    unmarkInQueueByTwitchId('u1');
    expect(isInQueue('u1')).toBe(false);
    expect(getQueueEntryStatus('u1')).toBeUndefined();
  });

  it('unmarkInQueueByPogoUsername removes the correct user', () => {
    markInQueue('u1', 'Ash');
    markInQueue('u2', 'Misty');
    unmarkInQueueByPogoUsername('Ash');
    expect(isInQueue('u1')).toBe(false);
    expect(isInQueue('u2')).toBe(true);
  });

  it('unmarkInQueueByPogoUsername is case-insensitive', () => {
    markInQueue('u1', 'TrainerAsh');
    unmarkInQueueByPogoUsername('trainerash');
    expect(isInQueue('u1')).toBe(false);
  });

  it('unmarkInQueueByPogoUsername does nothing for an unknown username', () => {
    markInQueue('u1', 'Ash');
    unmarkInQueueByPogoUsername('Unknown');
    expect(isInQueue('u1')).toBe(true);
  });

  it('clearQueueMemory removes all entries', () => {
    markInQueue('u1', 'Ash');
    markInQueue('u2', 'Misty');
    clearQueueMemory();
    expect(isInQueue('u1')).toBe(false);
    expect(isInQueue('u2')).toBe(false);
  });
});

describe('hydrateQueueMemory', () => {
  it('populates queue from an array of entries', () => {
    hydrateQueueMemory([
      { twitchUserId: 'u1', pogoUsername: 'Ash', status: 'joined' },
      { twitchUserId: 'u2', pogoUsername: 'Misty', status: 'invited' },
    ]);
    expect(isInQueue('u1')).toBe(true);
    expect(getQueueEntryStatus('u1')).toBe('joined');
    expect(isInQueue('u2')).toBe(true);
    expect(getQueueEntryStatus('u2')).toBe('invited');
  });

  it('clears existing entries before hydrating', () => {
    markInQueue('u9', 'OldUser');
    hydrateQueueMemory([{ twitchUserId: 'u1', pogoUsername: 'Ash' }]);
    expect(isInQueue('u9')).toBe(false);
    expect(isInQueue('u1')).toBe(true);
  });

  it('defaults status to joined when not provided', () => {
    hydrateQueueMemory([{ twitchUserId: 'u1', pogoUsername: 'Ash' }]);
    expect(getQueueEntryStatus('u1')).toBe('joined');
  });
});

describe('firestoreListenerActive', () => {
  it('returns false by default', () => {
    expect(isFirestoreListenerActive()).toBe(false);
  });

  it('returns true after being set to true', () => {
    setFirestoreListenerActive(true);
    expect(isFirestoreListenerActive()).toBe(true);
  });

  it('returns false after being reset', () => {
    setFirestoreListenerActive(true);
    setFirestoreListenerActive(false);
    expect(isFirestoreListenerActive()).toBe(false);
  });
});
