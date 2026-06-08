import WebSocket from 'ws';
import { config } from '../config';
import type { TwitchWebSocketMessage, NotificationHandler } from '../types';
import { createMessageHandler } from './handlers';

/**
 * Creates a WebSocket client connected to the Twitch EventSub endpoint and
 * wires all internal protocol handling.
 *
 * - `error`   — forwarded to `console.error`
 * - `open`    — logs the connection URL
 * - `message` — parsed and dispatched through `createMessageHandler`
 *
 * The connection keeps the Node.js event loop alive until the process is
 * stopped or the socket is closed.
 *
 * @param onNotification - Callback invoked for every EventSub notification
 * @returns The connected `WebSocket` instance
 */
export const createWebSocketClient = (
  onNotification: NotificationHandler
): WebSocket => {
  const client = new WebSocket(config.eventSubWebSocketUrl);
  const handleMessage = createMessageHandler(onNotification);

  client.on('error', console.error);

  client.on('open', () => {
    console.log(
      'WebSocket connection opened to ' + config.eventSubWebSocketUrl
    );
  });

  client.on('message', (data) => {
    handleMessage(JSON.parse(data.toString()) as TwitchWebSocketMessage);
  });

  return client;
};
