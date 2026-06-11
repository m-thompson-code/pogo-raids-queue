import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Persisted runtime settings
//
// Reads/writes bot-config.json at the project root so settings survive
// between restarts. On first start the file is created with defaults.
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG_PATH = resolve(
  dirname(__filename),
  '../../../bot-config.json'
);

interface PersistedSettings {
  /** How many seconds before the same hint can fire again. */
  hintCooldownSeconds: number;
  /** Sliding window (seconds) for spam detection. 0 = disabled. */
  spamWindowSeconds: number;
  /** Cooldown (seconds) between "Thank you for raiding" messages. 0 = no cooldown. */
  invitedCooldownSeconds: number;
  /** How often (seconds) the periodic reminder message is sent. 0 = disabled. */
  intervalMessageSeconds: number;
  /** How often (seconds) the promo message is sent. 0 = disabled. */
  intervalPromoSeconds: number;
  /** Cooldown (seconds) for info commands (!discord, !tiktok, !help, !code). 0 = no cooldown. */
  infoCooldownSeconds: number;
  /** Commands that have been explicitly disabled. */
  disabledCommands: string[];
}

const DEFAULTS: PersistedSettings = {
  hintCooldownSeconds: 60,
  spamWindowSeconds: 60,
  invitedCooldownSeconds: 15,
  intervalMessageSeconds: 300,
  intervalPromoSeconds: 840,
  infoCooldownSeconds: 30,
  disabledCommands: [],
};

let settings: PersistedSettings = { ...DEFAULTS };

const save = (): void => {
  writeFileSync(CONFIG_PATH, JSON.stringify(settings, null, 2) + '\n');
};

/**
 * Called once at startup. Creates bot-config.json with defaults if it doesn't
 * exist; otherwise loads and merges the stored values.
 */
export const loadSettings = (): void => {
  if (!existsSync(CONFIG_PATH)) {
    save();
    return;
  }
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    settings = { ...DEFAULTS, ...JSON.parse(raw) };

  } catch {
    // Corrupt file — reset to defaults
    save();
    console.warn(`[config] Could not parse ${CONFIG_PATH}, reset to defaults`);
  }
};

export const setHintCooldownSeconds = (seconds: number): void => {
  settings.hintCooldownSeconds = seconds;
  save();
};

export const setSpamWindowSeconds = (seconds: number): void => {
  settings.spamWindowSeconds = seconds;
  save();
};

export const getHintCooldownMs = (): number => settings.hintCooldownSeconds * 1000;
export const getSpamWindowMs = (): number => settings.spamWindowSeconds * 1000;
export const getInvitedCooldownMs = (): number => settings.invitedCooldownSeconds * 1000;
export const getIntervalMessageMs = (): number => settings.intervalMessageSeconds * 1000;
export const getIntervalPromoMs = (): number => settings.intervalPromoSeconds * 1000;
export const getInfoCooldownMs = (): number => settings.infoCooldownSeconds * 1000;

export const isCommandEnabled = (command: string): boolean =>
  !settings.disabledCommands.includes(command);

export const disableCommand = (command: string): void => {
  if (!settings.disabledCommands.includes(command)) {
    settings.disabledCommands.push(command);
    save();
  }
};

export const enableCommand = (command: string): void => {
  settings.disabledCommands = settings.disabledCommands.filter((c) => c !== command);
  save();
};

export const getDisabledCommands = (): readonly string[] => settings.disabledCommands;
