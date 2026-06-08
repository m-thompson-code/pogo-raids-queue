import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCloseCommand } from './close.js';
import { handleOpenCommand } from './open.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../messages.js', () => ({
  messages: {
    closeSuccess: (u: string) => `closeSuccess:${u}`,
    openSuccess: (u: string) => `openSuccess:${u}`,
  },
}));
vi.mock('../queue-state.js', () => ({
  closeQueue: vi.fn(),
  openQueue: vi.fn(),
  isQueueOpen: vi.fn(),
}));

import { sendChatMessage } from '../api/chat.js';
import { closeQueue, openQueue } from '../queue-state.js';

const makeEvent = (login = 'moo') => ({
  chatter_user_id: 'u1',
  chatter_user_login: login,
  message: { text: '!close' },
  badges: [],
});

beforeEach(() => vi.clearAllMocks());

describe('handleCloseCommand', () => {
  it('closes the queue and sends confirmation', async () => {
    await handleCloseCommand(makeEvent() as any);
    expect(closeQueue).toHaveBeenCalledOnce();
    expect(sendChatMessage).toHaveBeenCalledWith('closeSuccess:moo');
  });
});

describe('handleOpenCommand', () => {
  it('opens the queue and sends confirmation', async () => {
    await handleOpenCommand(makeEvent() as any);
    expect(openQueue).toHaveBeenCalledOnce();
    expect(sendChatMessage).toHaveBeenCalledWith('openSuccess:moo');
  });
});
