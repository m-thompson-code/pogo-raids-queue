import { sendChatMessage } from '../chat.js';
import { COMMAND_REGISTRY } from '../command-registry.js';
import { isCommandEnabled } from '../persisted-settings.js';
import { isPrivileged } from '../permissions.js';
import type { ChatMessageEvent } from '../types.js';

/**
 * Handles the `!commands` command.
 * Lists all currently enabled commands the caller has permission to use.
 */
export const handleCommandsCommand = async (event: ChatMessageEvent): Promise<void> => {
  const privileged = isPrivileged(event);
  const parts = event.message.text.trim().split(/\s+/);
  const target = parts[1]?.toLowerCase().replace(/^!/, '');

  if (target) {
    const meta = COMMAND_REGISTRY.find((m) => m.command === target);
    if (!meta) {
      await sendChatMessage(`Unknown command: !${target}`);
      return;
    }
    if (!privileged && meta.permission !== 'everyone') {
      await sendChatMessage(`You do not have permission to use !${target}.`);
      return;
    }
    await sendChatMessage(`${meta.usage.replace(/^!/, '')} — ${meta.description}`);
    return;
  }

  const names = COMMAND_REGISTRY
    .filter((meta) => isCommandEnabled(meta.command))
    .filter((meta) => privileged || meta.permission === 'everyone')
    .map((meta) => `!${meta.command}`);

  await sendChatMessage(`Available commands: ${names.join(', ')}`);
};
