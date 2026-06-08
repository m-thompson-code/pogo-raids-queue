import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─────────────────────────────────────────────────────────────────────────────
// Persisted runtime settings
//
// Reads/writes bot-config.json at the project root so settings survive
// between restarts. On first start the file is created with defaults.
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../bot-config.json'
);

interface PersistedSettings {
  /** How many seconds before the same hint can fire again. */
  hintCooldownSeconds: number;
  /** Sliding window (seconds) for spam detection. 0 = disabled. */
  spamWindowSeconds: number;
}

const DEFAULTS: PersistedSettings = {
  hintCooldownSeconds: 60,
  spamWindowSeconds: 60,
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
    console.log(`[config] Created ${CONFIG_PATH} with defaults`);
    return;
  }
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    settings = { ...DEFAULTS, ...JSON.parse(raw) };
    console.log(`[config] Loaded settings from ${CONFIG_PATH}`);
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
