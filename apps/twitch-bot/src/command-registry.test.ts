import { describe, it, expect } from 'vitest';
import { COMMAND_REGISTRY } from './command-registry.js';
import { CANONICAL_COMMANDS } from './command-aliases.js';

describe('COMMAND_REGISTRY', () => {
  it('has no duplicate command entries', () => {
    const commands = COMMAND_REGISTRY.map((m) => m.command);
    expect(commands.length).toBe(new Set(commands).size);
  });

  it('every command is a known canonical command', () => {
    for (const meta of COMMAND_REGISTRY) {
      expect(
        (CANONICAL_COMMANDS as readonly string[]).includes(meta.command),
        `"${meta.command}" is not in CANONICAL_COMMANDS`
      ).toBe(true);
    }
  });

  it('every entry has a non-empty usage, description, and valid permission', () => {
    for (const meta of COMMAND_REGISTRY) {
      expect(meta.usage.length, `${meta.command} usage is empty`).toBeGreaterThan(0);
      expect(meta.description.length, `${meta.command} description is empty`).toBeGreaterThan(0);
      expect(['everyone', 'mods']).toContain(meta.permission);
    }
  });

  it('all usage strings start with !', () => {
    for (const meta of COMMAND_REGISTRY) {
      expect(meta.usage, `${meta.command} usage does not start with !`).toMatch(/^!/);
    }
  });

  it('raid and leave are public (everyone)', () => {
    const raid = COMMAND_REGISTRY.find((m) => m.command === 'raid');
    const leave = COMMAND_REGISTRY.find((m) => m.command === 'leave');
    expect(raid?.permission).toBe('everyone');
    expect(leave?.permission).toBe('everyone');
  });

  it('privileged commands (clear, open, close, strike) require mods', () => {
    const privileged = ['clear', 'open', 'close', 'strike', 'add', 'remove'];
    for (const cmd of privileged) {
      const meta = COMMAND_REGISTRY.find((m) => m.command === cmd);
      expect(meta?.permission, `${cmd} should require mods`).toBe('mods');
    }
  });
});
