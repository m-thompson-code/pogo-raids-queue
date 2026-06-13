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
    command: 'invited',
    usage: '!invited',
    permission: 'everyone',
    description: 'Marks yourself as invited (also: !thank, !ty)',
  },
  {
    command: 'list',
    usage: '!list',
    permission: 'mods',
    description: 'Lists the current queue',
  },
  {
    command: 'groups',
    usage: '!groups',
    permission: 'mods',
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
  {
    command: 'regirice',
    usage: '!regirice',
    permission: 'mods',
    description: 'Force-triggers the Regirice animation',
  },
  {
    command: 'discord',
    usage: '!discord',
    permission: 'everyone',
    description: 'Posts the Discord invite link',
  },
  {
    command: 'tiktok',
    usage: '!tiktok',
    permission: 'everyone',
    description: 'Posts the TikTok profile link',
  },
  {
    command: 'help',
    usage: '!help',
    permission: 'everyone',
    description: 'Shows how to join the raid queue',
  },
  {
    command: 'code',
    usage: '!code',
    permission: 'everyone',
    description: 'Shows the friend code to add',
  },
  {
    command: 'commands',
    usage: '!commands',
    permission: 'everyone',
    description: 'Lists all available commands',
  },
];
