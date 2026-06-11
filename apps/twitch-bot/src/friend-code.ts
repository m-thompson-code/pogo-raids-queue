/** The broadcaster's Pokémon GO friend code, digits only. */
export const FRIEND_CODE_RAW = '835766986460';

/** Formats the raw friend code as the standard 3×4 display format. */
export const formatFriendCode = (): string =>
  `${FRIEND_CODE_RAW.slice(0, 4)} ${FRIEND_CODE_RAW.slice(4, 8)} ${FRIEND_CODE_RAW.slice(8, 12)}`;
