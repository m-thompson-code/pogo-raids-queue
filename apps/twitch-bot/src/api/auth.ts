import { config } from '../config.js';
import { fetchWithRetry } from './http.js';

/**
 * Validates the OAuth token against the Twitch token-validation endpoint.
 *
 * Calls `GET https://id.twitch.tv/oauth2/validate` with the configured
 * `OAUTH_TOKEN`.  If the token is missing, expired, or otherwise invalid,
 * an error is logged and the process exits with code 1.
 *
 * @see https://dev.twitch.tv/docs/authentication/validate-tokens/
 */
export const validateToken = async (): Promise<void> => {
  let response: Response;
  try {
    response = await fetchWithRetry('https://id.twitch.tv/oauth2/validate', {
      method: 'GET',
      headers: {
        Authorization: 'OAuth ' + config.oauthToken,
      },
    });
  } catch (error) {
    console.error('Failed to reach Twitch token validation endpoint.');
    console.error(error);
    process.exit(1);
    return;
  }

  if (response.status !== 200) {
    const data = await response.json();
    console.error(
      'Token is not valid. /oauth2/validate returned status code ' +
        response.status
    );
    console.error(data);
    process.exit(1);
  }
};
