import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

import { readFileSync, writeFileSync, existsSync } from 'fs';
import {
  loadSettings,
  setHintCooldownSeconds,
  setSpamWindowSeconds,
  getHintCooldownMs,
  getSpamWindowMs,
  isCommandEnabled,
  disableCommand,
  enableCommand,
  getDisabledCommands,
} from './persisted-settings.js';

const DEFAULTS = {
  hintCooldownSeconds: 60,
  spamWindowSeconds: 60,
  disabledCommands: [] as string[],
};

// Reset module state to defaults before each test
const resetToDefaults = () => {
  vi.mocked(existsSync).mockReturnValue(true);
  vi.mocked(readFileSync).mockReturnValue(JSON.stringify(DEFAULTS));
  vi.mocked(writeFileSync).mockImplementation(() => {});
  loadSettings();
};

beforeEach(() => {
  vi.clearAllMocks();
  resetToDefaults();
});

describe('loadSettings', () => {
  it('creates default config file when none exists', () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(writeFileSync).mockImplementation(() => {});

    loadSettings();

    expect(writeFileSync).toHaveBeenCalledOnce();
  });

  it('loads values from existing file', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ hintCooldownSeconds: 120, spamWindowSeconds: 30, disabledCommands: [] })
    );

    loadSettings();

    expect(getHintCooldownMs()).toBe(120_000);
    expect(getSpamWindowMs()).toBe(30_000);
  });

  it('resets to defaults on corrupt JSON', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue('not valid json {{');

    loadSettings();

    expect(getHintCooldownMs()).toBe(60_000);
    expect(getSpamWindowMs()).toBe(60_000);
  });

  it('merges partial stored values with defaults', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ hintCooldownSeconds: 90 })
    );

    loadSettings();

    expect(getHintCooldownMs()).toBe(90_000);
    expect(getSpamWindowMs()).toBe(60_000); // default
  });
});

describe('getHintCooldownMs / setHintCooldownSeconds', () => {
  it('returns default 60 000 ms', () => {
    expect(getHintCooldownMs()).toBe(60_000);
  });

  it('converts seconds to ms after setting', () => {
    setHintCooldownSeconds(120);
    expect(getHintCooldownMs()).toBe(120_000);
  });

  it('persists the new value by calling writeFileSync', () => {
    setHintCooldownSeconds(45);
    expect(writeFileSync).toHaveBeenCalledOnce();
  });
});

describe('getSpamWindowMs / setSpamWindowSeconds', () => {
  it('returns default 60 000 ms', () => {
    expect(getSpamWindowMs()).toBe(60_000);
  });

  it('converts seconds to ms after setting', () => {
    setSpamWindowSeconds(30);
    expect(getSpamWindowMs()).toBe(30_000);
  });

  it('accepts 0 to disable spam detection', () => {
    setSpamWindowSeconds(0);
    expect(getSpamWindowMs()).toBe(0);
  });
});

describe('isCommandEnabled / disableCommand / enableCommand', () => {
  it('all commands are enabled by default', () => {
    expect(isCommandEnabled('raid')).toBe(true);
    expect(isCommandEnabled('clear')).toBe(true);
  });

  it('disableCommand marks a command as disabled', () => {
    disableCommand('raid');
    expect(isCommandEnabled('raid')).toBe(false);
  });

  it('enableCommand re-enables a disabled command', () => {
    disableCommand('raid');
    enableCommand('raid');
    expect(isCommandEnabled('raid')).toBe(true);
  });

  it('disabling an already-disabled command does not duplicate it', () => {
    disableCommand('raid');
    disableCommand('raid');
    expect(getDisabledCommands().filter((c) => c === 'raid').length).toBe(1);
  });

  it('getDisabledCommands returns current disabled list', () => {
    disableCommand('raid');
    disableCommand('clear');
    expect(getDisabledCommands()).toContain('raid');
    expect(getDisabledCommands()).toContain('clear');
  });

  it('enabling a command that was never disabled is a no-op', () => {
    enableCommand('raid');
    expect(isCommandEnabled('raid')).toBe(true);
  });

  it('each mutation persists by calling writeFileSync', () => {
    disableCommand('raid');
    enableCommand('raid');
    expect(writeFileSync).toHaveBeenCalledTimes(2);
  });
});
