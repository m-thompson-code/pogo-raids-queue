import { sendChatMessage } from '../api/chat.js';
import { COMMAND_REGISTRY } from '../command-registry.js';
import { COMMAND_ALIASES } from '../command-aliases.js';
import { isCommandEnabled } from '../persisted-settings.js';
import { isPrivileged } from '../permissions.js';
import type { ChatMessageEvent } from '../types.js';

/** Builds a reverse map: canonical command → list of non-self aliases */
const buildAliasMap = (): Map<string, string[]> => {
  const map = new Map<string, string[]>();
  for (const [trigger, canonical] of Object.entries(COMMAND_ALIASES)) {
    if (trigger !== canonical) {
      const existing = map.get(canonical) ?? [];
      existing.push(trigger);
      map.set(canonical, existing);
    }
  }
  return map;
};

const ALIAS_MAP = buildAliasMap();

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
    .filter((meta) => meta.command !== 'commands')
    .map((meta) => {
      const aliases = ALIAS_MAP.get(meta.command);
      return aliases?.length
        ? `!${meta.command} (${aliases.map((a) => `!${a}`).join(', ')})`
        : `!${meta.command}`;
    });

  await sendChatMessage(`Available commands: ${names.join(', ')}`);
};
