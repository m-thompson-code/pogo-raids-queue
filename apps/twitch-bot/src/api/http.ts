import { config } from '../config.js';

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const isConnectTimeoutError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const withCause = error as Error & { cause?: { code?: string } };
  return withCause.cause?.code === 'UND_ERR_CONNECT_TIMEOUT';
};

/**
 * Performs a fetch with retry for transient connection timeouts.
 *
 * Twitch endpoints can intermittently fail DNS/edge connections and throw
 * UND_ERR_CONNECT_TIMEOUT via undici. Retrying these failures usually succeeds.
 */
export const fetchWithRetry = async (
  input: FetchInput,
  init?: FetchInit
): Promise<Response> => {
  const retries = config.twitchHttpMaxRetries;
  const baseDelayMs = config.twitchHttpRetryBaseDelayMs;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetch(input, init);
    } catch (error) {
      const shouldRetry = isConnectTimeoutError(error) && attempt < retries;
      if (!shouldRetry) {
        throw error;
      }

      const delayMs = baseDelayMs * 2 ** attempt;
      console.warn(
        `Transient Twitch API connection timeout (attempt ${attempt + 1}/${retries + 1}). Retrying in ${delayMs}ms...`
      );
      await sleep(delayMs);
    }
  }

  throw new Error('fetchWithRetry exhausted retries unexpectedly');
};
