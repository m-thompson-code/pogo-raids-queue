import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendChatMessage, registerEventSubListeners } from './chat.js';

vi.mock('../config.js', () => ({
  config: {
    oauthToken: 'test-token',
    clientId: 'test-client-id',
    botUserId: 'bot-123',
    chatChannelUserId: 'channel-456',
    eventSubWebSocketUrl: '',
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sendChatMessage', () => {
  it('posts to the correct endpoint with auth headers and body', async () => {
    mockFetch.mockResolvedValueOnce({ status: 200 });

    await sendChatMessage('hello world');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.twitch.tv/helix/chat/messages');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer test-token',
      'Client-Id': 'test-client-id',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      broadcaster_id: 'channel-456',
      sender_id: 'bot-123',
      message: 'hello world',
    });
  });

  it('does not exit on 200', async () => {
    mockFetch.mockResolvedValueOnce({ status: 200 });

    await sendChatMessage('hello');

    expect(mockExit).not.toHaveBeenCalled();
  });

  it('logs error but does not exit on non-200', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 400,
      json: vi.fn().mockResolvedValueOnce({ error: 'Bad Request' }),
    });

    await sendChatMessage('hello');

    expect(mockExit).not.toHaveBeenCalled();
  });
});

describe('registerEventSubListeners', () => {
  it('posts to eventsub/subscriptions with session id in body', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 202,
      json: vi.fn().mockResolvedValueOnce({
        data: [{ id: 'sub-abc' }],
      }),
    });

    await registerEventSubListeners('session-xyz');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.twitch.tv/helix/eventsub/subscriptions');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.type).toBe('channel.chat.message');
    expect(body.transport.session_id).toBe('session-xyz');
    expect(body.condition.broadcaster_user_id).toBe('channel-456');
    expect(body.condition.user_id).toBe('bot-123');
  });

  it('does not exit on 202', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 202,
      json: vi.fn().mockResolvedValueOnce({ data: [{ id: 'sub-abc' }] }),
    });

    await registerEventSubListeners('session-xyz');

    expect(mockExit).not.toHaveBeenCalled();
  });

  it('exits with code 1 on non-202 response', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 409,
      json: vi.fn().mockResolvedValueOnce({ message: 'Conflict' }),
    });

    await registerEventSubListeners('session-xyz');

    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
