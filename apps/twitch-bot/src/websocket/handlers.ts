import { registerEventSubListeners } from '../chat';
import { MessageType } from '../types';
import type { TwitchWebSocketMessage, NotificationHandler } from '../types';

/**
 * Returns a message handler function pre-bound to the given `onNotification`
 * callback.
 *
 * The returned function is meant to be passed directly to the WebSocket
 * `message` event.  It handles the internal protocol internally:
 *
 * - `session_welcome`: extracts the session ID and calls
 *   `registerEventSubListeners` so the bot joins the channel.
 * - `notification`: extracts `subscriptionType` and `event` and forwards
 *   them to `onNotification` — this is the only message type the consumer
 *   ever sees.
 * - All other message types (`session_keepalive`, `session_reconnect`,
 *   `revocation`) are silently ignored.
 *
 * @param onNotification - Consumer callback invoked for every EventSub event
 */
export const createMessageHandler =
  (onNotification: NotificationHandler) =>
  (data: TwitchWebSocketMessage): void => {
    switch (data.metadata.message_type) {
      case MessageType.SessionWelcome:
        // First message after connection. Register EventSub subscriptions
        // using the session ID so Twitch routes events to this socket.
        if (data.payload.session) {
          console.log(
            `WebSocket session established [${data.payload.session.id}]`
          );
          registerEventSubListeners(data.payload.session.id);
        }
        break;

      case MessageType.Notification:
        // Deliver only notification events to the consumer.
        if (data.metadata.subscription_type && data.payload.event) {
          onNotification({
            subscriptionType: data.metadata.subscription_type,
            event: data.payload.event,
          });
        }
        break;

      // session_keepalive, session_reconnect, revocation — no action needed.
      default:
        break;
    }
  };
