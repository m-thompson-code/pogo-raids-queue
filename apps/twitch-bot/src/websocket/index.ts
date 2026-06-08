/**
 * Public API for the bot WebSocket layer.
 *
 * After calling `connectBot`, all internal Twitch protocol details
 * (session_welcome handshake, EventSub registration, keepalives) are handled
 * transparently.  The provided callback is invoked only for
 * `MessageType.Notification` events — the consumer never needs to deal with
 * lower-level message types.
 *
 * @example
 * ```ts
 * connectBot(({ subscriptionType, event }) => {
 *   if (subscriptionType === SubscriptionType.ChannelChatMessage) {
 *     console.log(event.message.text);
 *   }
 * });
 * ```
 */
export { createWebSocketClient as connectBot } from './client';
