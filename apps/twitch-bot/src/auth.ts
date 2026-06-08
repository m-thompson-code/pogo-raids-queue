import { config } from './config';

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
  const response = await fetch('https://id.twitch.tv/oauth2/validate', {
    method: 'GET',
    headers: {
      Authorization: 'OAuth ' + config.oauthToken,
    },
  });

  if (response.status !== 200) {
    const data = await response.json();
    console.error(
      'Token is not valid. /oauth2/validate returned status code ' +
        response.status
    );
    console.error(data);
    process.exit(1);
  }

  console.log('Validated token.');
};
