import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleEnableCommand, handleDisableCommand } from './enable-disable.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../command-aliases.js', () => ({
  CANONICAL_COMMANDS: ['raid', 'leave', 'list', 'enable', 'disable'] as const,
}));
vi.mock('../persisted-settings.js', () => ({
  enableCommand: vi.fn(),
  disableCommand: vi.fn(),
  isCommandEnabled: vi.fn(),
}));

import { sendChatMessage } from '../api/chat.js';
import { enableCommand, disableCommand, isCommandEnabled } from '../persisted-settings.js';

const makeEvent = (text: string, login = 'moo') => ({
  chatter_user_id: 'u1',
  chatter_user_login: login,
  message: { text },
  badges: [],
});

beforeEach(() => vi.clearAllMocks());

describe('handleEnableCommand', () => {
  it('sends usage when no target provided', async () => {
    await handleEnableCommand(makeEvent('!enable') as any);
    expect(sendChatMessage).toHaveBeenCalledWith('@moo Usage: !enable <command>');
    expect(enableCommand).not.toHaveBeenCalled();
  });

  it('sends usage when target is not a known command', async () => {
    await handleEnableCommand(makeEvent('!enable unknowncmd') as any);
    expect(sendChatMessage).toHaveBeenCalledWith('@moo Usage: !enable <command>');
    expect(enableCommand).not.toHaveBeenCalled();
  });

  it('strips ! prefix from target command', async () => {
    await handleEnableCommand(makeEvent('!enable !raid') as any);
    expect(enableCommand).toHaveBeenCalledWith('raid');
    expect(sendChatMessage).toHaveBeenCalledWith('@moo !raid is now enabled.');
  });

  it('enables the given command and sends confirmation', async () => {
    await handleEnableCommand(makeEvent('!enable raid') as any);
    expect(enableCommand).toHaveBeenCalledWith('raid');
    expect(sendChatMessage).toHaveBeenCalledWith('@moo !raid is now enabled.');
  });
});

describe('handleDisableCommand', () => {
  it('sends usage when no target provided', async () => {
    await handleDisableCommand(makeEvent('!disable') as any);
    expect(sendChatMessage).toHaveBeenCalledWith('@moo Usage: !disable <command>');
    expect(disableCommand).not.toHaveBeenCalled();
  });

  it('sends usage when target is not a known command', async () => {
    await handleDisableCommand(makeEvent('!disable unknowncmd') as any);
    expect(sendChatMessage).toHaveBeenCalledWith('@moo Usage: !disable <command>');
    expect(disableCommand).not.toHaveBeenCalled();
  });

  it('refuses to disable "enable"', async () => {
    await handleDisableCommand(makeEvent('!disable enable') as any);
    expect(sendChatMessage).toHaveBeenCalledWith('@moo !enable cannot be disabled.');
    expect(disableCommand).not.toHaveBeenCalled();
  });

  it('refuses to disable "disable"', async () => {
    await handleDisableCommand(makeEvent('!disable disable') as any);
    expect(sendChatMessage).toHaveBeenCalledWith('@moo !disable cannot be disabled.');
    expect(disableCommand).not.toHaveBeenCalled();
  });

  it('sends already-disabled message when command is already disabled', async () => {
    vi.mocked(isCommandEnabled).mockReturnValue(false);
    await handleDisableCommand(makeEvent('!disable raid') as any);
    expect(sendChatMessage).toHaveBeenCalledWith('@moo !raid is already disabled.');
    expect(disableCommand).not.toHaveBeenCalled();
  });

  it('disables the command and sends confirmation', async () => {
    vi.mocked(isCommandEnabled).mockReturnValue(true);
    await handleDisableCommand(makeEvent('!disable raid') as any);
    expect(disableCommand).toHaveBeenCalledWith('raid');
    expect(sendChatMessage).toHaveBeenCalledWith('@moo !raid is now disabled.');
  });
});
