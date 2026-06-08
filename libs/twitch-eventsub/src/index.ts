export { createWebSocketClient as connectBot } from './lib/client.js';
export { MessageType, SubscriptionType } from './lib/types.js';
export type {
  ChatMessageEvent,
  ChatMessageFragment,
  NotificationPayload,
  NotificationHandler,
  TwitchWebSocketMessage,
  TwitchWebSocketMetadata,
  SessionPayload,
  EventSubSubscriptionResponse,
} from './lib/types.js';
