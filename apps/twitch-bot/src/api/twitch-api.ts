import { config } from '../config.js';

/**
 * Looks up a Twitch user by login name via the Helix API.
 * Returns the numeric user ID string, or null if not found.
 *
 * @param login - The Twitch username (case-insensitive, no @)
 */
export const getTwitchUserId = async (login: string): Promise<string | null> => {
  const url = `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.oauthToken}`,
      'Client-Id': config.clientId,
    },
  });

  if (!response.ok) return null;

  const data = await response.json() as { data: Array<{ id: string }> };
  return data.data[0]?.id ?? null;
};
