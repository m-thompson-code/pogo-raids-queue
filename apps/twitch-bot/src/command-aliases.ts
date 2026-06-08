// ─────────────────────────────────────────────────────────────────────────────
// Command aliases
//
// Maps every trigger word (the canonical command AND its aliases) to a
// canonical command name. Add new aliases here — the dispatch logic in
// main.ts resolves them automatically.
//
// Rules enforced by the unit test:
//   1. No two entries may share the same trigger.
//   2. Every value must be a known canonical command.
// ─────────────────────────────────────────────────────────────────────────────

export const CANONICAL_COMMANDS = [
  'raid',
  'leave',
  'clear',
  'open',
  'close',
  'list',
  'add',
  'remove',
  'strike',
  'hintcooldown',
  'spamwindow',
  // 'code',
  'enable',
  'disable',
  'commands',
] as const;

export type CanonicalCommand = (typeof CANONICAL_COMMANDS)[number];

/**
 * Maps a trigger (without '!') to its canonical command.
 * Triggers are matched case-insensitively in main.ts.
 */
export const COMMAND_ALIASES: Record<string, CanonicalCommand> = {
  // canonical → self
  raid: 'raid',
  leave: 'leave',
  clear: 'clear',
  open: 'open',
  close: 'close',
  list: 'list',
  add: 'add',
  remove: 'remove',
  strike: 'strike',
  hintcooldown: 'hintcooldown',
  spamwindow: 'spamwindow',
  // code: 'code',
  enable: 'enable',
  disable: 'disable',
  commands: 'commands',

  // aliases
  r: 'raid',
  join: 'raid',
  l: 'leave'
};

/**
 * Resolves a raw message text (e.g. "!r pokename") to its canonical command,
 * or returns null if it doesn't match any known trigger.
 */
export const resolveCommand = (text: string): CanonicalCommand | null => {
  if (!text.startsWith('!')) return null;
  const trigger = text.slice(1).split(/\s+/)[0].toLowerCase();
  return COMMAND_ALIASES[trigger] ?? null;
};
