import { config } from '../config.js';
import { fetchWithRetry } from './http.js';

/**
 * Looks up a Twitch user by login name via the Helix API.
 * Returns the numeric user ID string, or null if not found.
 *
 * @param login - The Twitch username (case-insensitive, no @)
 */
export const getTwitchUserId = async (login: string): Promise<string | null> => {
  const url = `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`;
  let response: Response;
  try {
    response = await fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${config.oauthToken}`,
        'Client-Id': config.clientId,
      },
    });
  } catch (error) {
    console.error(`Failed to resolve Twitch user id for "${login}" due to network error.`);
    console.error(error);
    return null;
  }

  if (!response.ok) return null;

  const data = await response.json() as { data: Array<{ id: string }> };
  return data.data[0]?.id ?? null;
};
