import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAddCommand } from './add.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../messages.js', () => ({
  messages: {
    addUsage: (u: string) => `addUsage:${u}`,
    addSuccess: (listed: string, noun: string) => `addSuccess:${listed}:${noun}`,
  },
}));
vi.mock('../providers/queue.js', () => ({
  queue: { addManual: vi.fn().mockResolvedValue(undefined) },
}));

import { sendChatMessage } from '../api/chat.js';
import { queue } from '../providers/queue.js';

const makeEvent = (text: string) => ({
  chatter_user_id: 'u1',
  chatter_user_login: 'moo',
  message: { text },
  badges: [],
});

beforeEach(() => vi.clearAllMocks());

describe('handleAddCommand', () => {
  it('sends usage message when no username provided', async () => {
    await handleAddCommand(makeEvent('!add') as any);
    expect(sendChatMessage).toHaveBeenCalledWith('addUsage:moo');
    expect(queue.addManual).not.toHaveBeenCalled();
  });

  it('adds a single username', async () => {
    await handleAddCommand(makeEvent('!add TrainerAsh') as any);
    expect(queue.addManual).toHaveBeenCalledOnce();
    expect(queue.addManual).toHaveBeenCalledWith('TrainerAsh');
    expect(sendChatMessage).toHaveBeenCalledWith('addSuccess:TrainerAsh:has');
  });

  it('adds multiple comma-separated usernames', async () => {
    await handleAddCommand(makeEvent('!add Ash,Misty,Brock') as any);
    expect(queue.addManual).toHaveBeenCalledTimes(3);
    expect(sendChatMessage).toHaveBeenCalledWith('addSuccess:Ash, Misty, Brock:have');
  });
});
