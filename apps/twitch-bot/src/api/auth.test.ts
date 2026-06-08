import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateToken } from './auth.js';

vi.mock('../config.js', () => ({
  config: {
    oauthToken: 'test-token',
    botUserId: '',
    clientId: '',
    chatChannelUserId: '',
    eventSubWebSocketUrl: '',
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('validateToken', () => {
  it('calls the validate endpoint with OAuth prefix', async () => {
    mockFetch.mockResolvedValueOnce({ status: 200 });

    await validateToken();

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://id.twitch.tv/oauth2/validate');
    expect((init as RequestInit).method).toBe('GET');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'OAuth test-token',
    });
  });

  it('does not exit on 200', async () => {
    mockFetch.mockResolvedValueOnce({ status: 200 });

    await validateToken();

    expect(mockExit).not.toHaveBeenCalled();
  });

  it('exits with code 1 on non-200 response', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 401,
      json: vi.fn().mockResolvedValueOnce({ message: 'invalid token' }),
    });

    await validateToken();

    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
