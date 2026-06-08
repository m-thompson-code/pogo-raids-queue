import { sendChatMessage } from '../chat.js';
import { CANONICAL_COMMANDS, type CanonicalCommand } from '../command-aliases.js';
import { enableCommand, disableCommand, isCommandEnabled } from '../persisted-settings.js';
import type { ChatMessageEvent } from '../types.js';

/** Commands that can never be disabled. */
const UNDISABLEABLE: ReadonlySet<CanonicalCommand> = new Set(['enable', 'disable']);

const parseTarget = (
  event: ChatMessageEvent,
  usage: string
): CanonicalCommand | null => {
  const parts = event.message.text.trim().split(/\s+/);
  const raw = parts[1]?.toLowerCase().replace(/^!/, '');

  if (!raw || !(CANONICAL_COMMANDS as readonly string[]).includes(raw)) {
    sendChatMessage(`@${event.chatter_user_login} ${usage}`);
    return null;
  }

  return raw as CanonicalCommand;
};

export const handleEnableCommand = async (event: ChatMessageEvent): Promise<void> => {
  const target = parseTarget(event, 'Usage: !enable <command>');
  if (!target) return;

  enableCommand(target);
  await sendChatMessage(`@${event.chatter_user_login} !${target} is now enabled.`);
};

export const handleDisableCommand = async (event: ChatMessageEvent): Promise<void> => {
  const target = parseTarget(event, 'Usage: !disable <command>');
  if (!target) return;

  if (UNDISABLEABLE.has(target)) {
    await sendChatMessage(
      `@${event.chatter_user_login} !${target} cannot be disabled.`
    );
    return;
  }

  if (!isCommandEnabled(target)) {
    await sendChatMessage(`@${event.chatter_user_login} !${target} is already disabled.`);
    return;
  }

  disableCommand(target);
  await sendChatMessage(`@${event.chatter_user_login} !${target} is now disabled.`);
};
