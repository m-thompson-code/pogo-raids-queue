import { describe, it, expect } from 'vitest';
import { COMMAND_ALIASES, CANONICAL_COMMANDS, resolveCommand } from './command-aliases.js';

describe('command-aliases', () => {
  it('has no duplicate triggers', () => {
    const triggers = Object.keys(COMMAND_ALIASES);
    const unique = new Set(triggers);
    expect(triggers.length).toBe(unique.size);
  });

  it('every alias value is a known canonical command', () => {
    for (const [trigger, canonical] of Object.entries(COMMAND_ALIASES)) {
      expect(
        (CANONICAL_COMMANDS as readonly string[]).includes(canonical),
        `Trigger "${trigger}" maps to unknown canonical "${canonical}"`
      ).toBe(true);
    }
  });

  it('every canonical command maps to itself', () => {
    for (const cmd of CANONICAL_COMMANDS) {
      expect(COMMAND_ALIASES[cmd]).toBe(cmd);
    }
  });

  it('resolveCommand handles aliases correctly', () => {
    expect(resolveCommand('!r pokename')).toBe('raid');
    expect(resolveCommand('!join pokename')).toBe('raid');
    expect(resolveCommand('!raid pokename')).toBe('raid');
    expect(resolveCommand('!R POKENAME')).toBe('raid');
  });

  it('resolveCommand returns null for non-commands', () => {
    expect(resolveCommand('hello world')).toBeNull();
    expect(resolveCommand('!unknown')).toBeNull();
    expect(resolveCommand('')).toBeNull();
  });
});
