import WebSocket from 'ws';
import type { TwitchWebSocketMessage, NotificationHandler } from './types.js';
import { createMessageHandler } from './handlers.js';

/**
 * Creates a WebSocket client connected to the given Twitch EventSub URL.
 *
 * @param url              - The EventSub WebSocket endpoint URL
 * @param onSessionWelcome - Called with the session ID on `session_welcome`;
 *                           use this to register EventSub subscriptions
 * @param onNotification   - Called for every EventSub notification event
 * @returns The connected `WebSocket` instance
 */
export const createWebSocketClient = (
  url: string,
  onSessionWelcome: (sessionId: string) => void,
  onNotification: NotificationHandler,
): WebSocket => {
  const client = new WebSocket(url);
  const handleMessage = createMessageHandler(onSessionWelcome, onNotification);

  client.on('error', console.error);

  client.on('open', () => {/* ... */});

  client.on('message', (data) => {
    handleMessage(JSON.parse(data.toString()) as TwitchWebSocketMessage);
  });

  return client;
};
