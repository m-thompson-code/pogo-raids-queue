import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTwitchUserId } from './twitch-api.js';

vi.mock('../config.js', () => ({
  config: {
    oauthToken: 'test-token',
    clientId: 'test-client-id',
    botUserId: '',
    chatChannelUserId: '',
    eventSubWebSocketUrl: '',
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getTwitchUserId', () => {
  it('calls the helix users endpoint with encoded login', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ data: [{ id: '12345' }] }),
    });

    await getTwitchUserId('moomoomamoo');

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.twitch.tv/helix/users?login=moomoomamoo');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer test-token',
      'Client-Id': 'test-client-id',
    });
  });

  it('returns the user id on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ data: [{ id: '12345' }] }),
    });

    const result = await getTwitchUserId('moomoomamoo');

    expect(result).toBe('12345');
  });

  it('returns null when the response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const result = await getTwitchUserId('unknownuser');

    expect(result).toBeNull();
  });

  it('returns null when data array is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ data: [] }),
    });

    const result = await getTwitchUserId('unknownuser');

    expect(result).toBeNull();
  });

  it('url-encodes the login parameter', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ data: [{ id: '99' }] }),
    });

    await getTwitchUserId('user name');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.twitch.tv/helix/users?login=user%20name');
  });
});
