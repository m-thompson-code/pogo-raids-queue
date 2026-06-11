import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runDetectables, detectHint } from './main.js';

// Only mock side-effectful / external I/O (used by runDetectables guard tests)
vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../queue-state.js', () => ({ isQueueOpen: vi.fn() }));
vi.mock('../persisted-settings.js', () => ({ getHintCooldownMs: vi.fn() }));

import { sendChatMessage } from '../api/chat.js';
import { isQueueOpen } from '../queue-state.js';
import { getHintCooldownMs } from '../persisted-settings.js';
import { successfulRaiders, firstTimeChatters } from './shared.js';
import { messages } from '../messages.js';
import type { ChatMessageEvent } from '../types.js';

const makeEvent = (
  text: string,
  {
    userId = 'u1',
    badges = [] as ChatMessageEvent['badges'],
    reply = undefined as ChatMessageEvent['reply'],
    isFirstMessage = false,
    broadcasterUserId = 'b1',
  } = {}
): ChatMessageEvent => ({
  chatter_user_id: userId,
  chatter_user_login: 'viewer1',
  chatter_user_name: 'viewer1',
  broadcaster_user_id: broadcasterUserId,
  broadcaster_user_login: 'streamer',
  broadcaster_user_name: 'streamer',
  message_id: 'msg-1',
  message: { text, fragments: [] },
  color: '',
  message_type: 'text',
  badges,
  reply,
  is_first_message: isFirstMessage,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isQueueOpen).mockReturnValue(true);
  vi.mocked(getHintCooldownMs).mockReturnValue(0);
  successfulRaiders.clear();
  firstTimeChatters.clear();
});

// ---------------------------------------------------------------------------
// Early-exit guards — runDetectables
// ---------------------------------------------------------------------------

describe('early-exit guards', () => {
  it('does nothing when queue is closed', async () => {
    vi.mocked(isQueueOpen).mockReturnValue(false);
    await runDetectables(makeEvent('add me'));
    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it('does nothing when replying to a non-broadcaster', async () => {
    await runDetectables(
      makeEvent('add me', { reply: { parent_user_id: 'someone-else', parent_message_id: '', parent_message_body: '' } })
    );
    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it('continues when replying to the broadcaster', async () => {
    firstTimeChatters.add('u1');
    await runDetectables(
      makeEvent('add me', { reply: { parent_user_id: 'b1', parent_message_id: '', parent_message_body: '' }, broadcasterUserId: 'b1' })
    );
    expect(sendChatMessage).toHaveBeenCalledWith(messages.help);
  });

  it('does nothing for broadcaster badge', async () => {
    await runDetectables(
      makeEvent('add me', { badges: [{ set_id: 'broadcaster', id: '1', info: '' }] })
    );
    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it('does nothing for moderator badge', async () => {
    await runDetectables(
      makeEvent('add me', { badges: [{ set_id: 'moderator', id: '1', info: '' }] })
    );
    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it('does nothing for successful raiders', async () => {
    successfulRaiders.add('u1');
    await runDetectables(makeEvent('add me'));
    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it('respects hint cooldown', async () => {
    firstTimeChatters.add('u1');

    vi.mocked(getHintCooldownMs).mockReturnValue(0);
    await runDetectables(makeEvent('add me'));
    expect(sendChatMessage).toHaveBeenCalledTimes(1);
    vi.mocked(sendChatMessage).mockClear();

    vi.mocked(getHintCooldownMs).mockReturnValue(60_000);
    await runDetectables(makeEvent('add me'));
    expect(sendChatMessage).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// firstTimeChatters registration — now the main event handler's responsibility;
// detectHint/runDetectables rely on the set being pre-populated by the caller.
// ---------------------------------------------------------------------------

describe('firstTimeChatters tracking', () => {
  it('detectHint returns help when user is pre-marked as first-time chatter', () => {
    firstTimeChatters.add('u1');
    expect(detectHint(makeEvent('add me'))).toBe(messages.help);
  });

  it('detectHint returns null when user is not marked as first-time chatter', () => {
    expect(detectHint(makeEvent('add me'))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// P1: requesting + code → hintStreamerWontAdd — detectHint
// ---------------------------------------------------------------------------

describe('requesting + code → hintStreamerWontAdd', () => {
  it('returns hintStreamerWontAdd when requesting with a code', () => {
    expect(detectHint(makeEvent('add me 123412341234'))).toBe(messages.hintStreamerWontAdd);
  });

  it('returns null when only requesting (no code)', () => {
    expect(detectHint(makeEvent('add me'))).toBeNull();
  });

  it('returns hintStreamerWontAdd when only code with my code is phrase', () => {
    expect(detectHint(makeEvent('my code is 123412341234'))).toBe(messages.hintStreamerWontAdd);
  });

  it('returns null when code is the broadcaster own code', () => {
    // This is a weird edge case where code is broadcaster's own code, but we don't want to trigger
    // the hint since it's already known. It's simpler to just not trigger on it at all.
    expect(detectHint(makeEvent('add me 835766986460'))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// P2: first-time chatter + (requesting | queue | raid) → help — detectHint
// ---------------------------------------------------------------------------

describe('first-time chatter + (requesting | queue | raid) → help', () => {
  it('returns help on first message with a join request', () => {
    firstTimeChatters.add('u1');
    expect(detectHint(makeEvent('add me'))).toBe(messages.help);
  });

  it('returns help on first message mentioning queue', () => {
    firstTimeChatters.add('u1');
    expect(detectHint(makeEvent('how do i join the queue'))).toBe(messages.help);
  });

  it('returns null when first-time but message has no request/queue/raid', () => {
    firstTimeChatters.add('u1');
    expect(detectHint(makeEvent('hello'))).toBeNull();
  });

  it('returns null when requesting but not first-time', () => {
    expect(detectHint(makeEvent('add me'))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// P3: (asking | begging) + code → hintAddCodeFirst — detectHint
// ---------------------------------------------------------------------------

describe('(asking | begging) + code → hintAddCodeFirst', () => {
  it('returns hintAddCodeFirst when begging and mentioning code', () => {
    expect(detectHint(makeEvent('code please'))).toBe(messages.hintAddCodeFirst);
  });

  it('returns hintAddCodeFirst for literal "code"', () => {
    expect(detectHint(makeEvent('code'))).toBe(messages.hintAddCodeFirst);
  });

  it('returns hintAddCodeFirst for literal "code?"', () => {
    expect(detectHint(makeEvent('code?'))).toBe(messages.hintAddCodeFirst);
  });

  it('returns null when only asking (no code, no queue/raid, no requesting)', () => {
    expect(detectHint(makeEvent('how do i'))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// P4a: (asking | begging) + requesting → hintUseRaidCommand — detectHint
// ---------------------------------------------------------------------------

describe('(asking | begging) + requesting → hintUseRaidCommand', () => {
  const cases: [string, string][] = [
    ['asking + requesting', 'how do i add me'],
    ['begging + requesting', 'add me please'],
  ];

  for (const [label, text] of cases) {
    it(`returns hintUseRaidCommand for: ${label} ("${text}")`, () => {
      expect(detectHint(makeEvent(text))).toBe(messages.hintUseRaidCommand);
    });
  }
});

// ---------------------------------------------------------------------------
// P4: (asking | begging | requesting) + (queue | raid) → hintUseRaidCommand — detectHint
// ---------------------------------------------------------------------------

describe('(asking | begging | requesting) + (queue | raid) → hintUseRaidCommand', () => {
  const cases: [string, string][] = [
    ['asking + queue',     'how do i join'],
    ['asking + raid',      'how do i join the raid'],
    ['requesting + queue', 'can i join'],
    ['begging + raid',     'join plz'],
    ['begging + raid',     'raid plz'],
  ];

  for (const [label, text] of cases) {
    it(`returns hintUseRaidCommand for: ${label} ("${text}")`, () => {
      expect(detectHint(makeEvent(text))).toBe(messages.hintUseRaidCommand);
    });
  }

  it('returns null when only asking (no code, no queue/raid, no requesting)', () => {
    expect(detectHint(makeEvent('how do i'))).toBeNull();
  });

  it('returns null when only begging (no code, no queue/raid)', () => {
    expect(detectHint(makeEvent('plz'))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// No match → null — detectHint
// ---------------------------------------------------------------------------

describe('no match → null', () => {
  const silentMessages = [
    'gg',
    'nice',
    'lol',
    'pogchamp',
    'hello',
    "i'm lurking but i will not join the raid cause i'm never getting a shiny fr",
  ];

  for (const msg of silentMessages) {
    it(`"${msg}" returns null`, () => {
      expect(detectHint(makeEvent(msg))).toBeNull();
    });
  }
});
