import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCommandsCommand } from './commands.js';

vi.mock('../api/chat.js', () => ({ sendChatMessage: vi.fn() }));
vi.mock('../command-registry.js', () => ({
  COMMAND_REGISTRY: [
    { command: 'raid', usage: '!raid <name>', permission: 'everyone', description: 'Join the queue' },
    { command: 'clear', usage: '!clear', permission: 'mods', description: 'Clear the queue' },
    { command: 'commands', usage: '!commands', permission: 'everyone', description: 'List commands' },
  ],
}));
vi.mock('../command-aliases.js', () => ({
  COMMAND_ALIASES: {
    raid: 'raid',
    r: 'raid',
    clear: 'clear',
    commands: 'commands',
  },
}));
vi.mock('../persisted-settings.js', () => ({
  isCommandEnabled: vi.fn().mockReturnValue(true),
}));
vi.mock('../permissions.js', () => ({
  isPrivileged: vi.fn(),
}));

import { sendChatMessage } from '../api/chat.js';
import { isCommandEnabled } from '../persisted-settings.js';
import { isPrivileged } from '../permissions.js';

const makeEvent = (text: string) => ({
  chatter_user_id: 'u1',
  chatter_user_login: 'moo',
  message: { text },
  badges: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isCommandEnabled).mockReturnValue(true);
});

describe('handleCommandsCommand', () => {
  describe('without a target command', () => {
    it('lists all enabled commands for a non-privileged user', async () => {
      vi.mocked(isPrivileged).mockReturnValue(false);

      await handleCommandsCommand(makeEvent('!commands') as any);

      const [msg] = vi.mocked(sendChatMessage).mock.calls[0];
      expect(msg).toContain('!raid');
      expect(msg).not.toContain('!clear');
      expect(msg).not.toContain('!commands');
    });

    it('lists all enabled commands including mod-only for privileged user', async () => {
      vi.mocked(isPrivileged).mockReturnValue(true);

      await handleCommandsCommand(makeEvent('!commands') as any);

      const [msg] = vi.mocked(sendChatMessage).mock.calls[0];
      expect(msg).toContain('!raid');
      expect(msg).toContain('!clear');
    });

    it('includes aliases in the listing', async () => {
      vi.mocked(isPrivileged).mockReturnValue(false);

      await handleCommandsCommand(makeEvent('!commands') as any);

      const [msg] = vi.mocked(sendChatMessage).mock.calls[0];
      expect(msg).toContain('!r');
    });

    it('excludes disabled commands', async () => {
      vi.mocked(isPrivileged).mockReturnValue(false);
      vi.mocked(isCommandEnabled).mockImplementation((cmd) => cmd !== 'raid');

      await handleCommandsCommand(makeEvent('!commands') as any);

      const [msg] = vi.mocked(sendChatMessage).mock.calls[0];
      expect(msg).not.toContain('!raid');
    });
  });

  describe('with a target command', () => {
    it('sends usage and description for a known command', async () => {
      vi.mocked(isPrivileged).mockReturnValue(true);

      await handleCommandsCommand(makeEvent('!commands raid') as any);

      expect(sendChatMessage).toHaveBeenCalledWith(
        expect.stringContaining('Join the queue')
      );
    });

    it('sends error for an unknown command', async () => {
      vi.mocked(isPrivileged).mockReturnValue(true);

      await handleCommandsCommand(makeEvent('!commands unknowncmd') as any);

      expect(sendChatMessage).toHaveBeenCalledWith('Unknown command: !unknowncmd');
    });

    it('sends permission error for non-privileged user on a mod command', async () => {
      vi.mocked(isPrivileged).mockReturnValue(false);

      await handleCommandsCommand(makeEvent('!commands clear') as any);

      expect(sendChatMessage).toHaveBeenCalledWith(
        'You do not have permission to use !clear.'
      );
    });

    it('strips ! prefix from the target', async () => {
      vi.mocked(isPrivileged).mockReturnValue(true);

      await handleCommandsCommand(makeEvent('!commands !raid') as any);

      expect(sendChatMessage).toHaveBeenCalledWith(
        expect.stringContaining('Join the queue')
      );
    });
  });
});
