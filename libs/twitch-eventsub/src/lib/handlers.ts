import { MessageType } from './types.js';
import type { TwitchWebSocketMessage, NotificationHandler } from './types.js';

/**
 * Returns a message handler pre-bound to the given callbacks.
 *
 * - `session_welcome`: calls `onSessionWelcome` with the session ID so the
 *   consumer can register EventSub subscriptions.
 * - `notification`:    calls `onNotification` with the typed event payload.
 * - All other message types are silently ignored.
 *
 * @param onSessionWelcome - Called with the Twitch WebSocket session ID
 * @param onNotification   - Called for every EventSub notification event
 */
export const createMessageHandler =
  (
    onSessionWelcome: (sessionId: string) => void,
    onNotification: NotificationHandler
  ) =>
  (data: TwitchWebSocketMessage): void => {
    switch (data.metadata.message_type) {
      case MessageType.SessionWelcome:
        if (data.payload.session) {
          console.log(`WebSocket session established [${data.payload.session.id}]`);
          onSessionWelcome(data.payload.session.id);
        }
        break;

      case MessageType.Notification:
        if (data.metadata.subscription_type && data.payload.event) {
          onNotification({
            subscriptionType: data.metadata.subscription_type,
            event: data.payload.event,
          });
        }
        break;

      default:
        break;
    }
  };
