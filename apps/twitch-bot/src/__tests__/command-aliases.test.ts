import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COMMAND_ALIASES, CANONICAL_COMMANDS, resolveCommand } from '../command-aliases.js';

describe('command-aliases', () => {
  it('has no duplicate triggers', () => {
    const triggers = Object.keys(COMMAND_ALIASES);
    const unique = new Set(triggers);
    assert.equal(
      triggers.length,
      unique.size,
      `Duplicate triggers found: ${triggers.filter((t, i) => triggers.indexOf(t) !== i).join(', ')}`
    );
  });

  it('every alias value is a known canonical command', () => {
    for (const [trigger, canonical] of Object.entries(COMMAND_ALIASES)) {
      assert.ok(
        (CANONICAL_COMMANDS as readonly string[]).includes(canonical),
        `Trigger "${trigger}" maps to unknown canonical "${canonical}"`
      );
    }
  });

  it('every canonical command maps to itself', () => {
    for (const cmd of CANONICAL_COMMANDS) {
      assert.equal(
        COMMAND_ALIASES[cmd],
        cmd,
        `Canonical command "${cmd}" is missing its own self-mapping`
      );
    }
  });

  it('resolveCommand handles aliases correctly', () => {
    assert.equal(resolveCommand('!r pokename'), 'raid');
    assert.equal(resolveCommand('!join pokename'), 'raid');
    assert.equal(resolveCommand('!raid pokename'), 'raid');
    assert.equal(resolveCommand('!R POKENAME'), 'raid');
  });

  it('resolveCommand returns null for non-commands', () => {
    assert.equal(resolveCommand('hello world'), null);
    assert.equal(resolveCommand('!unknown'), null);
    assert.equal(resolveCommand(''), null);
  });
});
