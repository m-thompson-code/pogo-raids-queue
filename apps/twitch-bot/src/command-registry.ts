import type { CanonicalCommand } from './command-aliases.js';

// ─────────────────────────────────────────────────────────────────────────────
// Command registry
//
// Single source of truth for every command's public-facing metadata.
// Used by !commands to list available commands in chat.
// ─────────────────────────────────────────────────────────────────────────────

export type CommandPermission = 'everyone' | 'mods';

export interface CommandMeta {
  /** The canonical command name. */
  command: CanonicalCommand;
  /** Full usage string shown in !commands output. */
  usage: string;
  /** Who can use this command. */
  permission: CommandPermission;
  /** Short description shown in !commands output. */
  description: string;
}

export const COMMAND_REGISTRY: CommandMeta[] = [
  {
    command: 'raid',
    usage: '!raid <PogoUsername>',
    permission: 'everyone',
    description: 'Adds you to the raid queue',
  },
  {
    command: 'leave',
    usage: '!leave',
    permission: 'everyone',
    description: 'Removes you from the queue',
  },
  {
    command: 'list',
    usage: '!list',
    permission: 'everyone',
    description: 'Lists the current queue',
  },
  {
    command: 'groups',
    usage: '!groups',
    permission: 'everyone',
    description: 'Lists the queue grouped in sets of 5',
  },
  {
    command: 'add',
    usage: '!add <name1,name2,...>',
    permission: 'mods',
    description: 'Manually adds one or more users',
  },
  {
    command: 'remove',
    usage: '!remove <PogoUsername>',
    permission: 'mods',
    description: 'Removes a specific user',
  },
  {
    command: 'clear',
    usage: '!clear',
    permission: 'mods',
    description: 'Clears the entire queue',
  },
  {
    command: 'open',
    usage: '!open',
    permission: 'mods',
    description: 'Opens the queue',
  },
  {
    command: 'close',
    usage: '!close',
    permission: 'mods',
    description: 'Closes the queue',
  },
  {
    command: 'strike',
    usage: '!strike <TwitchUsername> [n]',
    permission: 'mods',
    description: 'Adds a strike to a user (or sets it to n)',
  },
  {
    command: 'hintcooldown',
    usage: '!hintcooldown <seconds>',
    permission: 'mods',
    description: 'Sets the hint cooldown in seconds',
  },
  {
    command: 'spamwindow',
    usage: '!spamwindow <seconds>',
    permission: 'mods',
    description: 'Sets the spam detection window (0 = off)',
  },
  {
    command: 'enable',
    usage: '!enable <command>',
    permission: 'mods',
    description: 'Re-enables a disabled command',
  },
  {
    command: 'disable',
    usage: '!disable <command>',
    permission: 'mods',
    description: 'Disables a command (enable/disable cannot be disabled)',
  },
];
