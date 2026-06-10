import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export type PokemonNames = {
  English: string;
  German: string;
  French: string;
  Italian: string;
  Japanese: string;
  Korean: string;
  Spanish: string;
};

export type PokemonType = {
  type: string;
  names: PokemonNames;
};

export type MoveCombat = {
  energy: number;
  power: number;
  turns: number;
  buffs: unknown;
};

export type Move = {
  id: string;
  power: number;
  energy: number;
  durationMs: number;
  type: PokemonType;
  names: PokemonNames;
  combat: MoveCombat;
};

export type Evolution = {
  id: string;
  formId: string;
  candies: number;
  item: string | null;
  quests: unknown[];
};

export type AssetForm = {
  form: string | null;
  costume: string | null;
  isFemale: boolean;
  image: string;
  shinyImage: string;
};

export type PokemonClass =
  | 'POKEMON_CLASS_LEGENDARY'
  | 'POKEMON_CLASS_MYTHIC'
  | 'POKEMON_CLASS_ULTRA_BEAST';

export type PokedexEntry = {
  id: string;
  formId: string;
  dexNr: number;
  generation: number;
  names: PokemonNames;
  stats: { stamina: number; attack: number; defense: number };
  primaryType: PokemonType;
  secondaryType: PokemonType | null;
  pokemonClass: PokemonClass | null;
  quickMoves: Record<string, Move>;
  cinematicMoves: Record<string, Move>;
  eliteQuickMoves: unknown[];
  eliteCinematicMoves: unknown[];
  assets: { image: string; shinyImage: string };
  regionForms: unknown[];
  evolutions: Evolution[];
  hasMegaEvolution: boolean;
  megaEvolutions: unknown[];
  hasGigantamaxEvolution: boolean;
  assetForms: AssetForm[];
};

const _dir = dirname(fileURLToPath(import.meta.url));
const _raw = readFileSync(join(_dir, '../../pokedex.json'), 'utf-8');
const _data: PokedexEntry[] = JSON.parse(_raw) as PokedexEntry[];

/** All pokedex entries as an array. */
export const pokedex: PokedexEntry[] = _data;

/** Look up a single entry by its `id` (e.g. `"BULBASAUR"`). */
export const getById = (id: string): PokedexEntry | undefined =>
  _data.find((p) => p.id === id);

/** Look up a single entry by its National Dex number. */
export const getByDexNr = (dexNr: number): PokedexEntry | undefined =>
  _data.find((p) => p.dexNr === dexNr);

/** Look up a single entry by English name (case-insensitive). */
export const getByName = (name: string): PokedexEntry | undefined => {
  const lower = name.toLowerCase();
  return _data.find((p) => p.names.English.toLowerCase() === lower);
};
