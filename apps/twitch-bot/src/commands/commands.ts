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

  const names = COMMAND_REGISTRY
    .filter((meta) => isCommandEnabled(meta.command))
    .filter((meta) => privileged || meta.permission === 'everyone')
    .map((meta) => `!${meta.command}`);

  await sendChatMessage(`Commands: ${names.join(', ')}`);
};
